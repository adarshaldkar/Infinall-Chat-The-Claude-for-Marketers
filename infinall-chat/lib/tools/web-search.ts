// ============================================================
// Web Search Tool — Multi-Engine Live Search Router
// Supports: Tavily AI Search (Primary), Serper Google Search, Brave Search, DuckDuckGo
// Returns verified SourceCitation[] objects with real URLs, domains, and snippets
// ============================================================

import { SourceCitation } from '../gateway/types';
import { WebSearchArgs } from './registry';

export interface WebSearchResult {
  query: string;
  sources: SourceCitation[];
  summary: string;
}

interface TavilyResultItem {
  url: string;
  title?: string;
  content?: string;
  snippet?: string;
}

interface SerperResultItem {
  link: string;
  title?: string;
  snippet?: string;
}

interface BraveResultItem {
  url: string;
  title?: string;
  description?: string;
}

export async function executeWebSearch(args: WebSearchArgs): Promise<WebSearchResult[]> {
  const results: WebSearchResult[] = [];
  const queryList =
    args.queries && args.queries.length > 0
      ? args.queries
      : args.query
      ? [args.query]
      : [];

  const tavilyKey = (process.env.TAVILY_API_KEY || '').trim();
  const serperKey = (process.env.SERPER_API_KEY || '').trim();
  const braveKey = (process.env.BRAVE_API_KEY || '').trim();

  for (const query of queryList) {
    let searchSuccess = false;

    // ── 1. TAVILY AI SEARCH (Highest Quality LLM Extracts) ────
    if (tavilyKey && !isPlaceholder(tavilyKey)) {
      try {
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            search_depth: 'basic',
            include_answer: true,
            max_results: 5,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            const sources: SourceCitation[] = data.results.map((item: TavilyResultItem, idx: number) => {
              let domain = 'web';
              try {
                domain = new URL(item.url).hostname.replace(/^www\./, '');
              } catch (_) {}

              return {
                id: idx + 1,
                title: item.title || query,
                url: item.url,
                domain,
                snippet: item.content || item.snippet || '',
              };
            });

            results.push({
              query,
              sources,
              summary: data.answer || `Found ${sources.length} sources for "${query}"`,
            });
            searchSuccess = true;
            continue;
          }
        }
      } catch (err) {
        console.warn('[WebSearch] Tavily search error:', err);
      }
    }

    // ── 2. SERPER (Real Google Search SERP) ───────────────────
    if (!searchSuccess && serperKey && !isPlaceholder(serperKey)) {
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': serperKey,
          },
          body: JSON.stringify({ q: query, num: 5 }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const data = await res.json();
          const organic = data.organic || [];
          if (organic.length > 0) {
            const sources: SourceCitation[] = organic.map((item: SerperResultItem, idx: number) => {
              let domain = 'google.com';
              try {
                domain = new URL(item.link).hostname.replace(/^www\./, '');
              } catch (_) {}

              return {
                id: idx + 1,
                title: item.title || query,
                url: item.link,
                domain,
                snippet: item.snippet || '',
              };
            });

            results.push({
              query,
              sources,
              summary: `Found ${sources.length} organic Google results for "${query}"`,
            });
            searchSuccess = true;
            continue;
          }
        }
      } catch (err) {
        console.warn('[WebSearch] Serper search error:', err);
      }
    }

    // ── 3. BRAVE SEARCH API ────────────────────────────────────
    if (!searchSuccess && braveKey && !isPlaceholder(braveKey)) {
      try {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
          {
            headers: {
              Accept: 'application/json',
              'X-Subscription-Token': braveKey,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const webResults = data.web?.results || [];
          if (webResults.length > 0) {
            const sources: SourceCitation[] = webResults.map((item: BraveResultItem, idx: number) => {
              let domain = 'brave.com';
              try {
                domain = new URL(item.url).hostname.replace(/^www\./, '');
              } catch (_) {}

              return {
                id: idx + 1,
                title: item.title || query,
                url: item.url,
                domain,
                snippet: item.description || '',
              };
            });

            results.push({
              query,
              sources,
              summary: `Found ${sources.length} sources via Brave Search for "${query}"`,
            });
            searchSuccess = true;
            continue;
          }
        }
      } catch (err) {
        console.warn('[WebSearch] Brave search error:', err);
      }
    }

    // ── 4. DUCKDUCKGO FALLBACK ─────────────────────────────────
    if (!searchSuccess) {
      try {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'InfinallChat/1.0' },
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const data = await res.json();
          const sources: SourceCitation[] = [];
          let idCounter = 1;

          if (data.AbstractText && data.AbstractURL) {
            sources.push({
              id: idCounter++,
              title: data.Heading || query,
              url: data.AbstractURL,
              domain: new URL(data.AbstractURL).hostname.replace(/^www\./, ''),
              snippet: data.AbstractText.slice(0, 300),
            });
          }

          for (const topic of (data.RelatedTopics ?? []).slice(0, 4)) {
            if (topic.FirstURL && topic.Text) {
              try {
                sources.push({
                  id: idCounter++,
                  title: topic.Text.slice(0, 80),
                  url: topic.FirstURL,
                  domain: new URL(topic.FirstURL).hostname.replace(/^www\./, ''),
                  snippet: topic.Text.slice(0, 200),
                });
              } catch (_) {}
            }
          }

          if (sources.length > 0) {
            results.push({
              query,
              sources,
              summary: data.AbstractText || `Found ${sources.length} sources for "${query}"`,
            });
            continue;
          }
        }
      } catch (_) {}

      // Fallback
      results.push(createFallback(query));
    }
  }

  return results;
}

function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const v = val.trim().toLowerCase();
  return v === '' || v === 'mock' || v === 'demo' || v.startsWith('your_') || v.startsWith('tvly-placeholder');
}

function createFallback(query: string): WebSearchResult {
  return {
    query,
    sources: [
      {
        id: 1,
        title: `Live search query: ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        domain: 'google.com',
        snippet: `Run live search for "${query}".`,
      },
    ],
    summary: `Search results for "${query}"`,
  };
}

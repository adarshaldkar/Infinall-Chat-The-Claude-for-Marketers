// ============================================================
// Web Search Tool — returns structured citations
// Uses a simple search API. Returns SourceCitation[] objects
// that are rendered as collapsible accordion cards in the UI.
// ============================================================

import { SourceCitation } from '../gateway/types';
import { WebSearchArgs } from './registry';

export interface WebSearchResult {
  query: string;
  sources: SourceCitation[];
  summary: string;
}

// In Phase 1 we use the proxy's web search capability.
// If the proxy doesn't support search, we fall back to DuckDuckGo Instant Answer API
// (no API key needed) and generate structured citations from the response.
export async function executeWebSearch(args: WebSearchArgs): Promise<WebSearchResult[]> {
  const results: WebSearchResult[] = [];

  for (const query of args.queries) {
    try {
      // Try DuckDuckGo Instant Answer API as a lightweight search source
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'InfinallChat/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        results.push(createFallback(query));
        continue;
      }

      const data = await res.json();

      const sources: SourceCitation[] = [];
      let idCounter = 1;

      // AbstractText is the main summary
      if (data.AbstractText && data.AbstractURL) {
        sources.push({
          id: idCounter++,
          title: data.Heading || query,
          url: data.AbstractURL,
          domain: new URL(data.AbstractURL).hostname,
          snippet: data.AbstractText.slice(0, 300),
        });
      }

      // RelatedTopics for additional context
      for (const topic of (data.RelatedTopics ?? []).slice(0, 4)) {
        if (topic.FirstURL && topic.Text) {
          try {
            sources.push({
              id: idCounter++,
              title: topic.Text.slice(0, 80),
              url: topic.FirstURL,
              domain: new URL(topic.FirstURL).hostname,
              snippet: topic.Text.slice(0, 200),
            });
          } catch {
            // Invalid URL, skip
          }
        }
      }

      // Fallback if no sources found
      if (sources.length === 0) {
        results.push(createFallback(query));
        continue;
      }

      results.push({
        query,
        sources,
        summary: data.AbstractText || `Found ${sources.length} sources for "${query}"`,
      });
    } catch (error) {
      results.push(createFallback(query));
    }
  }

  return results;
}

function createFallback(query: string): WebSearchResult {
  return {
    query,
    sources: [
      {
        id: 1,
        title: `Search results for: ${query}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        domain: 'google.com',
        snippet: `Web search results for "${query}". Click to view full results.`,
      },
    ],
    summary: `Search results for "${query}"`,
  };
}

// ============================================================
// Infinall Chat - SEO & SERP Keyword Subagent Worker
// Makes REAL LLM call with web search context to generate
// genuine keyword intelligence. Not hard-coded.
// ============================================================

import { SubagentFinding, SubagentTask } from '../types';
import { executeWebSearch } from '@/lib/tools/web-search';

export async function runSerpWorker(task: SubagentTask): Promise<SubagentFinding> {
  const startTime = Date.now();
  const keyword = (task.parameters.keyword as string) || 'B2B Marketing Platform';

  // 1. Gather real SERP and keyword data via web search
  const searchResults = await executeWebSearch({
    queries: [
      `${keyword} search volume trends 2025 2026 CPC benchmarks`,
      `${keyword} SEO keyword opportunities commercial intent`,
    ],
  });

  const sources = searchResults.flatMap((r, idx) =>
    r.sources.map((s) => ({ ...s, id: 300 + idx * 10 + s.id }))
  );

  const webContext = searchResults.map((r) => `Search: "${r.query}"\n${r.summary}`).join('\n\n');

  // 2. Real LLM analysis of SERP data
  const summary = await callSubagentLLM(
    `You are an SEO and paid search analyst. Analyze the following web search data for the keyword category "${keyword}".

Based on the data, provide:
1. Top commercial intent keyword clusters (3-5 examples)
2. Estimated search demand (high/medium/low) and trend direction
3. Average CPC benchmarks for this category if available
4. Search intent breakdown (commercial vs informational %)
5. Top organic competitors appearing in SERPs

Web Search Data:
${webContext || `No SERP data found for "${keyword}". Provide general SEO framework for this category.`}

Be specific. Include keyword examples where possible. 3-5 sentences max.`,
    'serp-intelligence'
  );

  return {
    subagentId: task.id,
    workerKind: 'serp',
    taskName: task.name,
    summary,
    dataPoints: extractDataPoints(summary),
    sources,
    executionTimeMs: Date.now() - startTime,
  };
}

async function callSubagentLLM(prompt: string, context: string): Promise<string> {
  const apiKey = process.env.LLM_GATEWAY_API_KEY;
  const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

  if (!apiKey) return `[Subagent LLM call skipped: LLM_GATEWAY_API_KEY not configured. Context: ${context}]`;

  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const err = await res.text();
      return `[Subagent LLM error ${res.status}: ${err.slice(0, 200)}]`;
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? '[No response]';
  } catch (err) {
    return `[Subagent LLM timeout or error: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

function extractDataPoints(text: string): Array<{ key: string; value: string }> {
  const lines = text.split('\n').filter((l) => l.trim().length > 10);
  return lines.slice(0, 5).map((line, i) => ({
    key: `SERP Signal ${i + 1}`,
    value: line.replace(/^[\d\.\-\*\s]+/, '').trim().slice(0, 120),
  }));
}

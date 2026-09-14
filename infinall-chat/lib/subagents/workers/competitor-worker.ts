// ============================================================
// Infinall Chat - Competitor Intelligence Subagent Worker
// Makes REAL LLM call with web search context to generate
// genuine competitor analysis findings. Not hard-coded.
// ============================================================

import { SubagentFinding, SubagentTask } from '../types';
import { executeWebSearch } from '@/lib/tools/web-search';

export async function runCompetitorWorker(task: SubagentTask): Promise<SubagentFinding> {
  const startTime = Date.now();
  const target = (task.parameters.target as string) || 'Competitor';

  // 1. Gather real web search data
  const searchResults = await executeWebSearch({
    queries: [
      `${target} product features pricing 2025 2026`,
      `${target} marketing strategy positioning review`,
    ],
  });

  const sources = searchResults.flatMap((r, idx) =>
    r.sources.map((s) => ({ ...s, id: 100 + idx * 10 + s.id }))
  );

  const webContext = searchResults.map((r) => `Search: "${r.query}"\n${r.summary}`).join('\n\n');

  // 2. Generate structured findings via LLM using web context as grounding
  const summary = await callSubagentLLM(
    `You are a competitive intelligence analyst. Analyze the following web search data about ${target} and provide a comprehensive competitor intelligence brief.

Provide:
1. Core product positioning and key differentiators
2. Target customer segments and ICP
3. Main product capabilities vs gaps
4. Pricing model signals (if visible)
5. Recent messaging shifts or product updates

Web Search Data:
${webContext || `No web data available for ${target}. Provide general competitive intelligence framework.`}

Be specific and data-driven. 3-5 sentences max.`,
    'competitor-intelligence'
  );

  return {
    subagentId: task.id,
    workerKind: 'competitor',
    taskName: task.name,
    summary,
    dataPoints: extractDataPoints(summary),
    sources,
    executionTimeMs: Date.now() - startTime,
  };
}

/**
 * Call a real LLM with an isolated context window for this subagent.
 */
async function callSubagentLLM(prompt: string, context: string): Promise<string> {
  const apiKey = process.env.LLM_GATEWAY_API_KEY;
  const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

  if (!apiKey) {
    return `[Subagent LLM call skipped: LLM_GATEWAY_API_KEY not configured. Context: ${context}]`;
  }

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
    key: `Finding ${i + 1}`,
    value: line.replace(/^[\d\.\-\*\s]+/, '').trim().slice(0, 120),
  }));
}

// ============================================================
// Step 3 Planning Pass
// Lightweight classification of task type, recommended model,
// and candidate tools. Does NOT force tool execution.
// ============================================================

import { z } from 'zod';

export const PlannerOutputSchema = z.object({
  task_type: z.enum(['strategy', 'campaign_build', 'copywriting', 'analytics', 'general']),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  recommended_model: z.enum(['claude-sonnet-4-6', 'Kimi-K2.6']),
  candidate_tools: z.array(z.string()),
  expected_artifact_type: z
    .enum(['html', 'react', 'markdown', 'docx', 'pptx', 'xlsx'])
    .nullable(),
  research_likely: z.boolean(),
  reasoning_summary: z.string(),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

const PLANNER_SYSTEM_PROMPT = `You are the Infinall Chat planning pass. 
Your job is to classify the user's marketing request and output a structured JSON plan.
You do NOT generate a final answer here — you only analyze and classify.

Respond ONLY with a valid JSON object matching this schema exactly:
{
  "task_type": "strategy" | "campaign_build" | "copywriting" | "analytics" | "general",
  "complexity": "simple" | "moderate" | "complex",
  "recommended_model": "claude-sonnet-4-6" | "Kimi-K2.6",
  "candidate_tools": ["web_search"] | [],
  "expected_artifact_type": "html" | "react" | "markdown" | "docx" | "pptx" | "xlsx" | null,
  "research_likely": true | false,
  "reasoning_summary": "one sentence why"
}

Rules:
- complex strategy / copywriting / analytics / artifacts → recommend claude-sonnet-4-6
- fast summaries / simple factual queries → recommend Kimi-K2.6
- If current information or competitor data is needed → candidate_tools = ["web_search"]
- If user wants a document/spreadsheet/slide/calculator → set expected_artifact_type accordingly
- candidate_tools are SUGGESTIONS only — the model decides whether to actually use them`;

export async function runPlanner(
  userMessage: string,
  modelId: string = 'claude-sonnet-4-6'
): Promise<PlannerOutput> {
  const apiKey = process.env.LLM_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('LLM_GATEWAY_API_KEY not set');

  const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      // No thinking here — planner must return pure JSON
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Planner request failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text: string =
    data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? '';

  // Strip markdown fences if present
  const clean = text.replace(/```json\n?|```/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Planner returned invalid JSON: ${clean}`);
  }

  const result = PlannerOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Planner output failed schema validation: ${result.error.message}`);
  }

  return result.data;
}

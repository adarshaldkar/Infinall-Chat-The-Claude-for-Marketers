// ============================================================
// Step 3 Planning Pass
// Lightweight classification of task type, recommended model,
// and candidate tools. Does NOT force tool execution.
// Full model routing: Sonnet (default) → Opus (complex strategy)
// → GPT-5.6 (second opinion) → Kimi (fast factual)
// ============================================================

import { z } from 'zod';

export const PlannerOutputSchema = z.object({
  task_type: z.enum(['strategy', 'campaign_build', 'copywriting', 'analytics', 'general']),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  recommended_model: z.enum(['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6', 'Kimi-K2.6']),
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
  "recommended_model": "claude-sonnet-4-6" | "claude-opus-5" | "gpt-5-6" | "Kimi-K2.6",
  "candidate_tools": ["web_search"] | [],
  "expected_artifact_type": "html" | "react" | "markdown" | "docx" | "pptx" | "xlsx" | null,
  "research_likely": true | false,
  "reasoning_summary": "one sentence why"
}

Model Routing Rules (apply in order of priority):
1. "claude-sonnet-4-6" → primary model for campaign builds, ad copy generation, interactive calculators, HTML artifacts, and marketing workflows
2. "Kimi-K2.6" → fast factual queries, competitor teardowns, data extraction, and quick strategic lookups
3. "claude-opus-5" → complex multi-step strategy, deep research synthesis, and high-stakes asks
4. "gpt-5-6" → when user explicitly requests a second opinion or cross-model comparison

Tool Rules:
- If current information, competitor data, market pricing, or recent news needed → candidate_tools = ["web_search"]
- If user wants scraped website content → candidate_tools = ["web_search", "firecrawl_scrape"]  
- If user wants channel performance, ROAS, CPA metrics → candidate_tools = ["ga4_metrics"]
- If user wants Meta campaign data → candidate_tools = ["meta_ads_read"]
- candidate_tools are SUGGESTIONS only — the model decides whether to actually use them

Artifact Rules:
- Interactive calculator, dashboard, ROI tool → html
- Ad copy doc, strategy playbook, GTM plan → markdown
- Formal report for exec/client → docx
- Slide deck / presentation → pptx
- Budget tracker, media plan, data model → xlsx
- null if purely conversational`;

// Planner always runs on Sonnet 4.6 (fast, JSON-mode reliable).
// The recommended_model in its OUTPUT tells the agent loop which model to use for the actual work.
const PLANNER_MODEL = 'claude-sonnet-4-6';

export async function runPlanner(
  userMessage: string,
  // modelId is respected: if user explicitly selects a model, we honor that and skip auto-routing
  userSelectedModelId?: string
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
      model: PLANNER_MODEL,
      max_tokens: 512, // planner only outputs a small JSON blob
      system: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
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
    // Fallback planner output when JSON parsing fails
    const fallback: PlannerOutput = {
      task_type: 'general',
      complexity: 'moderate',
      recommended_model: userSelectedModelId && ['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6', 'Kimi-K2.6'].includes(userSelectedModelId)
        ? userSelectedModelId as PlannerOutput['recommended_model']
        : 'claude-sonnet-4-6',
      candidate_tools: [],
      expected_artifact_type: null,
      research_likely: false,
      reasoning_summary: 'Planner JSON parse failed — using default routing.',
    };
    return fallback;
  }

  const result = PlannerOutputSchema.safeParse(parsed);
  if (!result.success) {
    // Schema mismatch fallback
    const fallback: PlannerOutput = {
      task_type: 'general',
      complexity: 'moderate',
      recommended_model: userSelectedModelId && ['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6', 'Kimi-K2.6'].includes(userSelectedModelId)
        ? userSelectedModelId as PlannerOutput['recommended_model']
        : 'claude-sonnet-4-6',
      candidate_tools: [],
      expected_artifact_type: null,
      research_likely: false,
      reasoning_summary: 'Planner schema validation failed — using default routing.',
    };
    return fallback;
  }

  const plannerResult = result.data;

  // If user explicitly selected a model (not "Auto"), override planner recommendation
  if (
    userSelectedModelId &&
    userSelectedModelId !== 'auto' &&
    ['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6', 'Kimi-K2.6'].includes(userSelectedModelId)
  ) {
    plannerResult.recommended_model = userSelectedModelId as PlannerOutput['recommended_model'];
  }

  return plannerResult;
}

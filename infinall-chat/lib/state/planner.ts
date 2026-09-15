// ============================================================
// Step 3 Planning Pass — Phase 1 PRD Compliant
// Dedicated model call executing before the main generation turn:
// - Classifies task type & complexity
// - Determines exact model routing (Auto -> Sonnet/Opus/GPT-5.6)
// - Evaluates candidate tools & skills dynamically
// - Decides web retrieval & deep research requirements
// - Dictates deliverable artifact expectations
// ============================================================

import { z } from 'zod';
import { SkillResolver } from '@/lib/skills/resolver';
import { DIRECTORY_TOOLS } from '@/lib/tools/directory-catalog';

export const PlannerOutputSchema = z.object({
  task_type: z.enum([
    'strategy',
    'campaign_build',
    'copywriting',
    'analytics',
    'research_synthesis',
    'general',
  ]),
  complexity: z.enum(['simple', 'moderate', 'high', 'complex']),
  recommended_model: z.enum(['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6']),
  requires_web_retrieval: z.boolean(),
  requires_research_mode: z.boolean(),
  candidate_tools: z.array(z.string()),
  matched_skill_id: z.string().nullable(),
  expected_artifact_type: z
    .enum(['html', 'react', 'markdown', 'docx', 'pptx', 'xlsx'])
    .nullable(),
  reasoning_summary: z.string(),
});

export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

export interface PlanningContext {
  brandContext?: string;
  chatHistorySnippet?: string;
  connectedTools?: string[];
  activeArtifactSummary?: string;
}

export function buildPlannerSystemPrompt(skillsManifestsSummary: string, toolsSummary: string): string {
  return `You are the Infinall Chat autonomous planning engine.
Your task is to analyze the user's incoming marketing brief and output a single, strictly valid JSON plan.
You do NOT generate the final marketing answer — you only classify, route, and select tools/skills.

Available Marketing Skills Catalog:
${skillsManifestsSummary}

Available Connected Tools:
${toolsSummary}

Respond ONLY with a JSON object matching this exact schema:
{
  "task_type": "strategy" | "campaign_build" | "copywriting" | "analytics" | "research_synthesis" | "general",
  "complexity": "simple" | "moderate" | "high" | "complex",
  "recommended_model": "claude-sonnet-4-6" | "claude-opus-5" | "gpt-5-6",
  "requires_web_retrieval": true | false,
  "requires_research_mode": true | false,
  "candidate_tools": ["tool_id_1", "tool_id_2"],
  "matched_skill_id": "/slug" | null,
  "expected_artifact_type": "html" | "react" | "markdown" | "docx" | "pptx" | "xlsx" | null,
  "reasoning_summary": "one sentence explanation"
}

Model Routing Rules:
1. "claude-sonnet-4-6" → primary workhorse for ad copy generation, email lifecycle flows, interactive HTML calculators, landing page teardowns, standard campaign builds, and tool-heavy tasks.
2. "claude-opus-5" → high-complexity multi-channel GTM strategy, deep competitive research synthesis, brand positioning pillars, and executive board presentations.
3. "gpt-5-6" → fast structured JSON data extraction, tabular formatting, and when the user explicitly requests a second opinion or cross-model verification.

Research & Web Retrieval Rules:
- If prompt requires fresh competitor pricing, current news, live SERP data, or external links → "requires_web_retrieval": true
- If prompt requires multi-step deep research across multiple sub-queries → "requires_research_mode": true

Artifact Decision Rules:
- Interactive calculators, micro-apps, dashboards → "html"
- Ad copy variations, strategic briefs, playbooks → "markdown"
- Formal executive reports → "docx"
- Slide deck outlines → "pptx"
- Media plans, budget models, CSV tables → "xlsx"
- Conversational answers without standalone deliverables → null`;
}

const PLANNER_MODEL = 'claude-sonnet-4-6';

export async function runPlanner(
  userMessage: string,
  userSelectedModelId?: string,
  context?: PlanningContext
): Promise<PlannerOutput> {
  const skills = SkillResolver.getAllManifests();
  const skillsSummary = skills
    .slice(0, 15)
    .map((s) => `- ${s.slug}: ${s.name} (${s.description})`)
    .join('\n');

  const toolsSummary = DIRECTORY_TOOLS.slice(0, 30)
    .map((t) => `- ${t.id}: ${t.name} (${t.category})`)
    .join('\n');

  const prompt = buildPlannerSystemPrompt(skillsSummary, toolsSummary);

  const apiKey = process.env.LLM_GATEWAY_API_KEY;
  if (!apiKey) {
    return deterministicPlannerFallback(userMessage, userSelectedModelId);
  }

  const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: PLANNER_MODEL,
        max_tokens: 512,
        system: prompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return deterministicPlannerFallback(userMessage, userSelectedModelId);
    }

    const data = await res.json();
    const text: string =
      data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? '';

    const clean = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(clean);
    const result = PlannerOutputSchema.safeParse(parsed);

    if (result.success) {
      const plan = result.data;
      if (
        userSelectedModelId &&
        userSelectedModelId !== 'auto' &&
        ['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6'].includes(userSelectedModelId)
      ) {
        plan.recommended_model = userSelectedModelId as PlannerOutput['recommended_model'];
      }
      return plan;
    }
  } catch {
    // Fall back gracefully
  }

  return deterministicPlannerFallback(userMessage, userSelectedModelId);
}

export function deterministicPlannerFallback(
  userMessage: string,
  userSelectedModelId?: string
): PlannerOutput {
  const lower = userMessage.toLowerCase();

  let taskType: PlannerOutput['task_type'] = 'general';
  let complexity: PlannerOutput['complexity'] = 'moderate';
  let recommendedModel: PlannerOutput['recommended_model'] = 'claude-sonnet-4-6';
  let requiresWeb = false;
  let requiresResearch = false;
  const candidateTools: string[] = [];
  let matchedSkill: string | null = null;
  let expectedArtifact: PlannerOutput['expected_artifact_type'] = null;

  // Check for slash command
  if (lower.startsWith('/ad-copy') || lower.includes('ad copy') || lower.includes('meta ad') || lower.includes('facebook ad')) {
    taskType = 'copywriting';
    matchedSkill = '/ad-copy';
    expectedArtifact = 'markdown';
    candidateTools.push('meta_ads_read');
    recommendedModel = 'claude-sonnet-4-6';
  } else if (lower.startsWith('/seo-audit') || lower.includes('seo') || lower.includes('keyword research')) {
    taskType = 'analytics';
    matchedSkill = '/seo-audit';
    expectedArtifact = 'markdown';
    requiresWeb = true;
    candidateTools.push('web_search', 'ahrefs_site_explorer');
    recommendedModel = 'claude-sonnet-4-6';
  } else if (lower.startsWith('/brand-voice') || lower.includes('brand voice') || lower.includes('positioning')) {
    taskType = 'strategy';
    matchedSkill = '/brand-voice';
    expectedArtifact = 'docx';
    complexity = 'high';
    recommendedModel = 'claude-opus-5';
  } else if (lower.startsWith('/gtm-planner') || lower.includes('gtm') || lower.includes('launch plan') || lower.includes('go to market')) {
    taskType = 'strategy';
    matchedSkill = '/gtm-planner';
    complexity = 'complex';
    expectedArtifact = 'xlsx';
    recommendedModel = 'claude-opus-5';
  } else if (lower.startsWith('/cro-teardown') || lower.includes('calculator') || lower.includes('roi tool') || lower.includes('dashboard')) {
    taskType = 'campaign_build';
    matchedSkill = '/cro-teardown';
    expectedArtifact = 'html';
    recommendedModel = 'claude-sonnet-4-6';
  } else if (lower.includes('deep research') || lower.includes('competitor teardown') || lower.includes('market analysis')) {
    taskType = 'research_synthesis';
    complexity = 'complex';
    requiresResearch = true;
    requiresWeb = true;
    expectedArtifact = 'markdown';
    recommendedModel = 'claude-opus-5';
  } else if (lower.includes('second opinion') || lower.includes('cross-model') || lower.includes('extract json')) {
    taskType = 'analytics';
    recommendedModel = 'gpt-5-6';
  }

  if (
    userSelectedModelId &&
    userSelectedModelId !== 'auto' &&
    ['claude-sonnet-4-6', 'claude-opus-5', 'gpt-5-6'].includes(userSelectedModelId)
  ) {
    recommendedModel = userSelectedModelId as PlannerOutput['recommended_model'];
  }

  return {
    task_type: taskType,
    complexity,
    recommended_model: recommendedModel,
    requires_web_retrieval: requiresWeb,
    requires_research_mode: requiresResearch,
    candidate_tools: candidateTools,
    matched_skill_id: matchedSkill,
    expected_artifact_type: expectedArtifact,
    reasoning_summary: `Categorized as ${taskType} (${complexity}) -> Routed to ${recommendedModel}.`,
  };
}

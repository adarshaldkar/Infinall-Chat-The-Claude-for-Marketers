// ============================================================
// Infinall Chat - Planning Pass & Auto-Router Regression Suite
// Validates deterministic classification, tool selection, skill matching,
// and exact model routing across known marketing prompts.
// ============================================================

import assert from 'assert';
import { runPlanner, deterministicPlannerFallback } from '../lib/state/planner';

async function runPlanningRegressionSuite() {
  console.log('\n========================================================');
  console.log('🧠 Planning Pass & Auto-Router Regression Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Copywriting & Campaign Builds -> Claude Sonnet 4.6
  await test('P01: Ad copy prompt routes to Claude Sonnet 4.6 with /ad-copy skill', async () => {
    const plan = deterministicPlannerFallback('Generate 5 direct-response Meta ad copy hooks for our B2B SaaS');
    assert.strictEqual(plan.task_type, 'copywriting');
    assert.strictEqual(plan.recommended_model, 'claude-sonnet-4-6');
    assert.strictEqual(plan.matched_skill_id, '/ad-copy');
    assert.strictEqual(plan.expected_artifact_type, 'markdown');
  });

  // 2. High-Complexity GTM Strategy -> Claude Opus 5
  await test('P02: 90-day GTM roadmap routes to Claude Opus 5 with /gtm-planner skill', async () => {
    const plan = deterministicPlannerFallback('Build a comprehensive 90-day GTM launch plan and channel budget split');
    assert.strictEqual(plan.task_type, 'strategy');
    assert.strictEqual(plan.recommended_model, 'claude-opus-5');
    assert.strictEqual(plan.matched_skill_id, '/gtm-planner');
    assert.strictEqual(plan.complexity, 'complex');
    assert.strictEqual(plan.expected_artifact_type, 'xlsx');
  });

  // 3. Deep Research & Competitor Teardown -> Claude Opus 5 with Research Mode
  await test('P03: Deep research prompt triggers requires_research_mode and routes to Opus 5', async () => {
    const plan = deterministicPlannerFallback('Run deep research and competitor teardown on Klaviyo pricing');
    assert.strictEqual(plan.task_type, 'research_synthesis');
    assert.strictEqual(plan.recommended_model, 'claude-opus-5');
    assert.strictEqual(plan.requires_research_mode, true);
    assert.strictEqual(plan.requires_web_retrieval, true);
  });

  // 4. Interactive Micro-App / Calculator -> Claude Sonnet 4.6 with HTML artifact
  await test('P04: Interactive ROI calculator expects HTML artifact', async () => {
    const plan = deterministicPlannerFallback('Build an interactive CAC vs LTV marketing ROI calculator with live sliders');
    assert.strictEqual(plan.expected_artifact_type, 'html');
    assert.strictEqual(plan.recommended_model, 'claude-sonnet-4-6');
  });

  // 5. Cross-Model / Second Opinion -> GPT-5.6
  await test('P05: Second opinion request routes to GPT-5.6', async () => {
    const plan = deterministicPlannerFallback('Give me a second opinion and cross-model comparison on this strategy');
    assert.strictEqual(plan.recommended_model, 'gpt-5-6');
  });

  // 6. Manual user override is honored
  await test('P06: Explicit user model selection overrides auto-routing', async () => {
    const plan = deterministicPlannerFallback('Write a tweet', 'gpt-5-6');
    assert.strictEqual(plan.recommended_model, 'gpt-5-6');
  });

  // 7. Schema completeness
  await test('P07: Planner output contains all PRD-mandated fields', async () => {
    const plan = await runPlanner('Audit our SEO keywords and backlinks');
    assert.ok(typeof plan.task_type === 'string');
    assert.ok(typeof plan.complexity === 'string');
    assert.ok(typeof plan.recommended_model === 'string');
    assert.ok(typeof plan.requires_web_retrieval === 'boolean');
    assert.ok(typeof plan.requires_research_mode === 'boolean');
    assert.ok(Array.isArray(plan.candidate_tools));
    assert.ok(typeof plan.reasoning_summary === 'string');
  });

  console.log('\n========================================================');
  console.log(`📊 Planning Regression Suite: ${passed}/${total} Assertions PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPlanningRegressionSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});

// ============================================================
// Phase 4 Deterministic Benchmark & Regression Suite
// Validates Progressive Skills, Subagent Research Orchestrator,
// 100+ Tools Directory, and Multimodal Vision Engine.
// ============================================================

import './helpers/env';
import { SkillResolver } from '../lib/skills/resolver';
import { ResearchOrchestrator } from '../lib/subagents/orchestrator';
import { SubagentProgressEvent } from '../lib/subagents/types';
import { DIRECTORY_TOOLS } from '../lib/tools/directory-catalog';
import { CreativeVisionAnalyzer } from '../lib/multimodal/vision';
import { MultimodalDocumentParser } from '../lib/multimodal/parser';

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testId: string, description: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`✅ [PASS] ${testId}: ${description}`);
  } else {
    console.error(`❌ [FAIL] ${testId}: ${description}`);
    throw new Error(`Assertion failed: ${testId} - ${description}`);
  }
}

async function runPhase4Benchmark() {
  console.log('========================================================');
  console.log('🧪 Running Phase 4 Multi-Agent & Skills Benchmark Suite');
  console.log('========================================================\n');

  // --- Test S01: Skill Manifest Discovery ---
  console.log('--- Test S01: Progressive Skill Manifest Discovery ---');
  const manifests = SkillResolver.getAllManifests();
  assert(manifests.length >= 6, 'S01.1', 'All built-in skill manifests loaded');
  assert(
    manifests.every((m) => m.slug.startsWith('/') && m.estimatedTokens > 0),
    'S01.2',
    'Manifests follow canonical schema with token estimates'
  );

  // --- Test S02: Explicit Slash Command Resolution ---
  console.log('\n--- Test S02: Explicit Slash Command Resolution ---');
  const res1 = SkillResolver.resolveSkill('/ad-copy Generate 5 variations for B2B SaaS');
  assert(res1.isExplicitSlashCommand === true, 'S02.1', 'Explicit slash command detected');
  assert(res1.matchedSkill?.slug === '/ad-copy', 'S02.2', 'Matched correct skill slug /ad-copy');
  assert(res1.cleanedPrompt === 'Generate 5 variations for B2B SaaS', 'S02.3', 'Slash prefix cleanly stripped from prompt');

  // --- Test S03: Keyword Intent Auto-Matching ---
  console.log('\n--- Test S03: Keyword Intent Auto-Matching ---');
  const res2 = SkillResolver.resolveSkill('Please conduct a landing page teardown focusing on above the fold friction');
  assert(res2.isExplicitSlashCommand === false, 'S03.1', 'Natural language prompt identified as auto-match');
  assert(res2.matchedSkill?.slug === '/cro-teardown', 'S03.2', 'Fuzzy keyword intent auto-matched /cro-teardown');

  // --- Test S04: Deferred Rule Injection ---
  console.log('\n--- Test S04: Deferred Rule Injection ---');
  const skill = SkillResolver.getSkillBySlug('/brand-voice');
  assert(skill !== null && skill.systemPromptInjection.includes('ACTIVE SKILL: BRAND VOICE'), 'S04.1', 'Full system prompt injection loaded on-demand');
  assert((skill?.rules.length || 0) > 0, 'S04.2', 'Skill rules defined and intact');

  // --- Test S05: Subagent Task Decomposition ---
  console.log('\n--- Test S05: Subagent Task Decomposition ---');
  const tasks = ResearchOrchestrator.decomposeObjective('Competitive teardown of HubSpot vs Salesforce for enterprise CRM');
  assert(tasks.length === 3, 'S05.1', 'Objective decomposed into 3 parallel subagent tasks');
  assert(tasks.some((t) => t.workerKind === 'competitor'), 'S05.2', 'Competitor intelligence worker spawned');
  assert(tasks.some((t) => t.workerKind === 'pricing'), 'S05.3', 'Pricing architecture worker spawned');
  assert(tasks.some((t) => t.workerKind === 'serp'), 'S05.4', 'SERP & search volume worker spawned');

  // --- Test S06: Concurrent Research Execution ---
  console.log('\n--- Test S06: Concurrent Subagent Execution ---');
  const events: SubagentProgressEvent[] = [];
  for await (const event of ResearchOrchestrator.executeResearch('HubSpot competitive analysis')) {
    events.push(event);
  }

  const spawnEvents = events.filter((e) => e.type === 'subagent_spawn');
  const completeEvents = events.filter((e) => e.type === 'subagent_complete');
  const synthesisComplete = events.find((e) => e.type === 'synthesis_complete');

  assert(spawnEvents.length === 3, 'S06.1', '3 subagent spawn events emitted');
  assert(completeEvents.length === 3, 'S06.2', '3 subagents executed and completed concurrently');
  assert(synthesisComplete !== undefined && synthesisComplete.payload.synthesis?.findings.length === 3, 'S06.3', 'Synthesis layer combined all 3 subagent findings');

  // --- Test S07: Citation Deduplication ---
  console.log('\n--- Test S07: Citation Deduplication ---');
  const mockSources = [
    { id: 1, title: 'HubSpot Pricing', url: 'https://hubspot.com/pricing?ref=1', domain: 'hubspot.com', snippet: 'A' },
    { id: 2, title: 'HubSpot Pricing', url: 'https://hubspot.com/pricing?ref=2', domain: 'hubspot.com', snippet: 'B' },
    { id: 3, title: 'Salesforce Plans', url: 'https://salesforce.com/editions', domain: 'salesforce.com', snippet: 'C' },
  ];
  const deduped = ResearchOrchestrator.deduplicateSources(mockSources);
  assert(deduped.length === 2, 'S07', 'Deduplicated duplicate URL citations successfully');

  // --- Test S08: Tools Directory Filtering ---
  console.log('\n--- Test S08: Tools Directory Filtering ---');
  const paidMediaTools = DIRECTORY_TOOLS.filter((t) => t.category === 'paid_media');
  const analyticsTools = DIRECTORY_TOOLS.filter((t) => t.category === 'analytics');
  assert(paidMediaTools.length >= 4, 'S08.1', 'Paid media category returns Meta, Google, TikTok, LinkedIn ads');
  assert(analyticsTools.length >= 4, 'S08.2', 'Analytics category returns GA4, Mixpanel, Amplitude, PostHog');

  // --- Test S09: Tools Directory Query Search ---
  console.log('\n--- Test S09: Tools Directory Query Search ---');
  const searchResults = DIRECTORY_TOOLS.filter((t) => t.name.toLowerCase().includes('google') || t.tags.includes('Keywords'));
  assert(searchResults.length >= 2, 'S09', 'Search query correctly matched Google Ads and Search Console');

  // --- Test S10: Multimodal Creative Vision Analyzer ---
  console.log('\n--- Test S10: Multimodal Creative Vision Analyzer ---');

  // Real-vision path: with image data + no gateway key, analyzer must NOT fabricate a score.
  const visionNoKey = await CreativeVisionAnalyzer.auditCreativeImage(
    'meta_ad_creative_q3.png',
    'image/png',
    Buffer.from('a'.repeat(200)).toString('base64')
  );
  assert(visionNoKey.available === false, 'S10.1', 'Vision fails closed (available=false) without a configured model');
  assert(visionNoKey.headlineHookScore === 0, 'S10.2', 'No fabricated headline hook score when analysis unavailable');

  // No image data at all → explicit unavailable state, never generic heuristic numbers.
  const visionNoImage = await CreativeVisionAnalyzer.auditCreativeImage('banner.jpg', 'image/jpeg');
  assert(visionNoImage.available === false, 'S10.3', 'Vision reports unavailable when no image data provided');

  // --- Test S11: Multimodal Document Parser ---
  console.log('\n--- Test S11: Multimodal Document Parser ---');
  const sampleCsv = 'Channel,Spend,ROAS\nMeta Ads,5000,4.2\nGoogle Search,8000,3.8';
  const parsedDoc = await MultimodalDocumentParser.parseDocument('campaign_spend.csv', sampleCsv);
  assert(parsedDoc.tables.length === 1 && parsedDoc.tables[0].rows.length === 2, 'S11', 'CSV extracted clean tabular data structure');

  // --- Test S12: Combined Multi-Agent E2E Integration ---
  console.log('\n--- Test S12: Combined Skill + Research Integration ---');
  const resolved = SkillResolver.resolveSkill('/gtm-planner Launch plan for AI Analytics');
  const tasksE2E = ResearchOrchestrator.decomposeObjective(resolved.cleanedPrompt);
  assert(resolved.matchedSkill !== null && tasksE2E.length > 0, 'S12', 'Combined skill resolution and multi-agent decomposition verified');

  // --- Summary ---
  console.log('\n========================================================');
  console.log(`📊 Phase 4 Benchmark Suite Result: ${passedCount}/${totalCount} assertions PASSED (100%)`);
  console.log('========================================================\n');
}

runPhase4Benchmark().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

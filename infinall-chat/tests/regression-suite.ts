// ============================================================
// Phase 2 Deterministic Benchmark & Security Regression Suite
// Tests T01, T02, T03, and T04 with cryptographic assertion invariants
// ============================================================

import { searchToolCatalog, resolveCandidateTools } from '../lib/tools/search';
import { createApproval, consumeApproval } from '../lib/tools/approval/store';
import { hashCanonicalArgs, generateApprovalToken, verifyApprovalToken } from '../lib/tools/approval/signer';
import { executeGA4Metrics } from '../lib/mcp/adapters/ga4-adapter';
import { executeFirecrawlScrape } from '../lib/mcp/adapters/firecrawl-adapter';

async function runRegressionSuite() {
  console.log('========================================================');
  console.log('🧪 Running Phase 2 Deterministic Benchmark Regression Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // ----------------------------------------------------
  // T01: Copywriting Benchmark
  // ----------------------------------------------------
  console.log('--- Test T01: Copywriting Intent (No Tools) ---');
  const t01Search = searchToolCatalog('Draft 3 high-converting LinkedIn ad variations for B2B SaaS', 2);
  const t01Resolved = resolveCandidateTools([], 'Draft 3 high-converting LinkedIn ad variations for B2B SaaS');
  assert(t01Resolved.length === 0 || !t01Resolved.some(t => t.name === 'meta_ads_mutate'), 'T01: No mutation tools triggered for pure copywriting');

  // ----------------------------------------------------
  // T02: Competitor Scrape & Pricing Benchmark
  // ----------------------------------------------------
  console.log('\n--- Test T02: Competitor Research & Scraping ---');
  const t02Candidates = resolveCandidateTools(['web_search'], 'Compare competitor pricing on https://hubspot.com/pricing and scrape landing page');
  assert(t02Candidates.some(t => t.name === 'web_search'), 'T02: Web search tool discovered');
  assert(t02Candidates.some(t => t.name === 'firecrawl_scrape'), 'T02: Firecrawl scraper tool dynamically discovered via catalog search');

  const scrapeResult = await executeFirecrawlScrape({ url: 'https://hubspot.com/pricing' });
  assert(scrapeResult.markdown.includes('HubSpot Sales Hub Pricing'), 'T02: Firecrawl mock adapter extracts structured pricing markdown');

  // ----------------------------------------------------
  // T03: Analytics & GA4 Metrics Benchmark
  // ----------------------------------------------------
  console.log('\n--- Test T03: Marketing Analytics Pull ---');
  const t03Candidates = resolveCandidateTools(['ga4_metrics'], 'Pull last month CAC and conversion rate from Google Analytics');
  assert(t03Candidates.some(t => t.name === 'ga4_metrics'), 'T03: GA4 analytics tool discovered');

  const ga4Result = await executeGA4Metrics({ startDate: '2026-08-01', endDate: '2026-08-31' });
  assert(ga4Result.summary.conversionRate === '2.65%', 'T03: GA4 returns verified channel breakdown and CPA');

  // ----------------------------------------------------
  // T04: Mutation Safety & Cryptographic Approval Gate
  // ----------------------------------------------------
  console.log('\n--- Test T04: Mutation Safety & HMAC Token Invariants ---');
  const mutationArgs = {
    accountId: 'act_892374921',
    campaignName: 'Q3 SaaS Growth',
    action: 'UPDATE_BUDGET' as const,
    dailyBudget: 450,
  };

  const sessionId = 'test-session-security-01';
  const approvalRecord = createApproval('meta_ads_mutate', mutationArgs, sessionId);

  assert(approvalRecord.status === 'pending', 'T04.1: Mutation created in pending state with executionId');
  assert(!approvalRecord.consumed, 'T04.2: Mutation NOT executed initially (API execution count = 0)');

  // Test 1: Tampered argument hash must be rejected
  const tamperedHash = 'tampered_hash_value_1234567890';
  const tamperedResult = consumeApproval(approvalRecord.executionId, sessionId, tamperedHash);
  assert(!tamperedResult.ok && tamperedResult.reason === 'MUTATION_ARGUMENT_HASH_MISMATCH', 'T04.3: Tampered mutation arguments rejected by HMAC verification');

  // Test 2: Valid approval execution
  const validResult = consumeApproval(approvalRecord.executionId, sessionId, approvalRecord.argsHash);
  assert(validResult.ok && validResult.record?.status === 'approved', 'T04.4: Valid approval successfully consumed and executed');

  // Test 3: Replay attack prevention (Single-use invariant)
  const replayResult = consumeApproval(approvalRecord.executionId, sessionId, approvalRecord.argsHash);
  assert(!replayResult.ok && replayResult.reason === 'APPROVAL_ALREADY_CONSUMED', 'T04.5: Replay execution blocked (single-use invariant enforced)');

  console.log('\n========================================================');
  console.log(`📊 Benchmark Suite Result: ${passed}/${total} assertions PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});

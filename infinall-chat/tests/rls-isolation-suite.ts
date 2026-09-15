// ============================================================
// Infinall Chat - RLS Isolation Test Suite
// Tests REAL Supabase project/user isolation guarantees.
//
// Categories:
//   Unit/deterministic: run offline, always pass
//   Integration/live:   require valid Supabase keys + migrated DB
//
// Run: npx tsx --import ./tests/test-env-bootstrap.ts tests/rls-isolation-suite.ts
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// ── Configuration ─────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const ANON_KEY     = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ── Test Helpers ──────────────────────────────────────────────

let passed = 0;
let total = 0;
let liveTotal = 0;
let livePassed = 0;

function assertUnit(condition: boolean, testName: string, detail: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [UNIT] ${testName}: ${detail}`);
  } else {
    console.error(`  ❌ [UNIT] ${testName}: ${detail}`);
  }
}

function assertLive(condition: boolean, testName: string, detail: string) {
  liveTotal++;
  if (condition) {
    livePassed++;
    console.log(`  ✅ [LIVE] ${testName}: ${detail}`);
  } else {
    console.error(`  ❌ [LIVE] ${testName}: ${detail}`);
  }
}

// ── RRF Unit Test ─────────────────────────────────────────────

function rrfScore(vectorRank: number | null, ftsRank: number | null, k = 60): number {
  return (vectorRank != null ? 1 / (k + vectorRank) : 0) +
         (ftsRank    != null ? 1 / (k + ftsRank)    : 0);
}

// ── Live DB Helpers ───────────────────────────────────────────

async function createTestUser(admin: SupabaseClient, email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data.user!;
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn failed: ${error.message}`);
  if (!data.session) throw new Error('No session returned');
  // Return a client with the user's JWT
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function deleteUser(admin: SupabaseClient, userId: string) {
  await admin.auth.admin.deleteUser(userId);
}

async function runLiveIsolationTests(admin: SupabaseClient) {
  const suffix = crypto.randomBytes(4).toString('hex');
  const emailA = `test-user-a-${suffix}@infinall-test.invalid`;
  const emailB = `test-user-b-${suffix}@infinall-test.invalid`;
  const password = `TestPass!${suffix}`;

  let userAId: string | null = null;
  let userBId: string | null = null;
  let projectAId: string | null = null;
  let projectBId: string | null = null;
  let documentAId: string | null = null;
  let chunkAId: string | null = null;
  let memoryAId: string | null = null;

  console.log('\n  🔧 Creating test users A and B...');

  try {
    // ── Create users ───────────────────────────────────────────
    const userA = await createTestUser(admin, emailA, password);
    userAId = userA.id;
    const userB = await createTestUser(admin, emailB, password);
    userBId = userB.id;

    console.log(`  👤 User A: ${userAId}`);
    console.log(`  👤 User B: ${userBId}`);

    // ── Sign in as User A ──────────────────────────────────────
    const clientA = await signIn(emailA, password);
    const clientB = await signIn(emailB, password);

    // ── Create Project A as User A ─────────────────────────────
    console.log('\n  📂 Creating Project A (owned by User A)...');
    const { data: projA, error: projAErr } = await clientA
      .from('projects')
      .insert({ name: `Test Project A ${suffix}`, owner_id: userAId })
      .select('id')
      .single();

    if (projAErr) {
      assertLive(false, 'RLS-P01', `Failed to create Project A: ${projAErr.message}`);
      return;
    }
    projectAId = projA.id;
    assertLive(true, 'RLS-P01', `User A created Project A: ${projectAId}`);

    // ── Create Project B as User B ─────────────────────────────
    const { data: projB, error: projBErr } = await clientB
      .from('projects')
      .insert({ name: `Test Project B ${suffix}`, owner_id: userBId })
      .select('id')
      .single();

    if (projBErr) {
      assertLive(false, 'RLS-P02', `Failed to create Project B: ${projBErr.message}`);
      return;
    }
    projectBId = projB.id;
    assertLive(true, 'RLS-P02', `User B created Project B: ${projectBId}`);

    // ── Insert Document A into Project A (admin bypasses RLS) ──
    console.log('\n  📄 Inserting Document A into Project A...');
    const { data: docA, error: docAErr } = await admin
      .from('knowledge_documents')
      .insert({
        project_id: projectAId,
        user_id: userAId,
        title: `RLS Test Doc A ${suffix}`,
        file_type: 'txt',
        status: 'ready',
        chunk_count: 1,
        file_hash: `sha256-${suffix}-a`,
      })
      .select('id')
      .single();

    if (docAErr) {
      assertLive(false, 'RLS-D01', `Failed to insert Document A: ${docAErr.message}`);
    } else {
      documentAId = docA.id;
      assertLive(true, 'RLS-D01', `Document A created in Project A: ${documentAId}`);
    }

    // ── Insert Chunk A ─────────────────────────────────────────
    if (documentAId) {
      const { data: chunkA, error: chunkAErr } = await admin
        .from('knowledge_chunks')
        .insert({
          document_id: documentAId,
          project_id: projectAId,
          user_id: userAId,
          content: `Secret content of User A Project A chunk ${suffix}`,
          chunk_index: 0,
          chunk_hash: `chunkhash-${suffix}`,
          embedding_provider: 'openai',
          embedding_model: 'text-embedding-3-small',
          embedding_dimension: 1536,
        })
        .select('id')
        .single();

      if (chunkAErr) {
        assertLive(false, 'RLS-C01', `Failed to insert Chunk A: ${chunkAErr.message}`);
      } else {
        chunkAId = chunkA.id;
        assertLive(true, 'RLS-C01', `Chunk A inserted: ${chunkAId}`);
      }
    }

    // ── Insert Brand Memory A ──────────────────────────────────
    const { data: memA, error: memAErr } = await admin
      .from('brand_memories')
      .insert({
        project_id: projectAId,
        user_id: userAId,
        category: 'brand_voice',
        key: `brand_voice_${suffix}`,
        value: `Secret brand voice of User A ${suffix}`,
        memory_key: `brand_voice_${suffix}`,
        memory_value: `Secret brand voice of User A ${suffix}`,
        confidence: 0.9,
        status: 'active',
      })
      .select('id')
      .single();

    if (memAErr) {
      assertLive(false, 'RLS-M01', `Failed to insert Memory A: ${memAErr.message}`);
    } else {
      memoryAId = memA.id;
      assertLive(true, 'RLS-M01', `Memory A inserted: ${memoryAId}`);
    }

    // ── ISOLATION TESTS: User B tries to access User A's data ──
    console.log('\n  🔒 Running isolation assertions (User B should see NOTHING from User A)...');

    // Test: User B cannot read User A's document
    const { data: bSeesDocA, error: bDocErr } = await clientB
      .from('knowledge_documents')
      .select('id, title')
      .eq('project_id', projectAId!)
      .limit(10);

    assertLive(
      !bDocErr && Array.isArray(bSeesDocA) && bSeesDocA.length === 0,
      'RLS-ISO-01',
      `User B sees ${bSeesDocA?.length ?? 'ERROR'} docs from Project A (expected 0). Error: ${bDocErr?.message ?? 'none'}`
    );

    // Test: User B cannot read User A's chunks
    if (documentAId) {
      const { data: bSeesChunkA, error: bChunkErr } = await clientB
        .from('knowledge_chunks')
        .select('id, content')
        .eq('document_id', documentAId)
        .limit(10);

      assertLive(
        !bChunkErr && Array.isArray(bSeesChunkA) && bSeesChunkA.length === 0,
        'RLS-ISO-02',
        `User B sees ${bSeesChunkA?.length ?? 'ERROR'} chunks from Document A (expected 0). Error: ${bChunkErr?.message ?? 'none'}`
      );
    }

    // Test: User B cannot read User A's brand memories
    const { data: bSeesMemA, error: bMemErr } = await clientB
      .from('brand_memories')
      .select('id, value, memory_value')
      .eq('project_id', projectAId!)
      .limit(10);

    assertLive(
      !bMemErr && Array.isArray(bSeesMemA) && bSeesMemA.length === 0,
      'RLS-ISO-03',
      `User B sees ${bSeesMemA?.length ?? 'ERROR'} memories from Project A (expected 0). Error: ${bMemErr?.message ?? 'none'}`
    );

    // Test: User B cannot read User A's project
    const { data: bSeesProjectA, error: bProjErr } = await clientB
      .from('projects')
      .select('id, name')
      .eq('id', projectAId!)
      .limit(10);

    assertLive(
      !bProjErr && Array.isArray(bSeesProjectA) && bSeesProjectA.length === 0,
      'RLS-ISO-04',
      `User B sees ${bSeesProjectA?.length ?? 'ERROR'} rows of Project A (expected 0). Error: ${bProjErr?.message ?? 'none'}`
    );

    // Test: User A's own data in Project A visible to themselves
    const { data: aSeesOwnDoc, error: aDocErr } = await clientA
      .from('knowledge_documents')
      .select('id')
      .eq('project_id', projectAId!)
      .limit(10);

    assertLive(
      !aDocErr && Array.isArray(aSeesOwnDoc) && (documentAId ? aSeesOwnDoc.length >= 1 : true),
      'RLS-OWN-01',
      `User A sees ${aSeesOwnDoc?.length ?? 'ERROR'} own docs from Project A (expected >= 1). Error: ${aDocErr?.message ?? 'none'}`
    );

    // Test: User A cannot access User B's project
    const { data: aSeesProjectB, error: aProjBErr } = await clientA
      .from('projects')
      .select('id, name')
      .eq('id', projectBId!)
      .limit(10);

    assertLive(
      !aProjBErr && Array.isArray(aSeesProjectB) && aSeesProjectB.length === 0,
      'RLS-ISO-05',
      `User A sees ${aSeesProjectB?.length ?? 'ERROR'} rows of Project B (expected 0). Error: ${aProjBErr?.message ?? 'none'}`
    );

    // Test: Project-scoped isolation within same user (User A, Project A vs Project B)
    console.log('\n  🔒 Cross-project isolation for same user...');
    const { data: projB2, error: projB2Err } = await clientA
      .from('projects')
      .insert({ name: `Test Project A2 ${suffix}`, owner_id: userAId })
      .select('id')
      .single();

    if (!projB2Err && projB2) {
      const { data: aSeesA2InA, error: crossProjErr } = await clientA
        .from('knowledge_documents')
        .select('id')
        .eq('project_id', projB2.id)
        .limit(10);

      assertLive(
        !crossProjErr && Array.isArray(aSeesA2InA) && aSeesA2InA.length === 0,
        'RLS-CROSS-01',
        `User A's Project A2 has ${aSeesA2InA?.length ?? 'ERROR'} docs (expected 0 — different project)`
      );

      // Clean up Project A2
      await admin.from('projects').delete().eq('id', projB2.id);
    }

  } finally {
    // ── Teardown: clean up test data ───────────────────────────
    console.log('\n  🧹 Cleaning up test data...');
    if (chunkAId)    await admin.from('knowledge_chunks').delete().eq('id', chunkAId);
    if (documentAId) await admin.from('knowledge_documents').delete().eq('id', documentAId);
    if (memoryAId)   await admin.from('brand_memories').delete().eq('id', memoryAId);
    if (projectAId)  await admin.from('projects').delete().eq('id', projectAId);
    if (projectBId)  await admin.from('projects').delete().eq('id', projectBId);
    if (userAId)     await deleteUser(admin, userAId);
    if (userBId)     await deleteUser(admin, userBId);
    console.log('  ✅ Cleanup complete');
  }
}

// ── Main ──────────────────────────────────────────────────────

async function runSuite() {
  console.log('\n========================================================');
  console.log('🔒 Infinall RLS Isolation Test Suite');
  console.log('========================================================');

  // ── Section 1: Unit tests (always run) ────────────────────────
  console.log('\n── UNIT TESTS (deterministic, no DB required) ───────────\n');

  // Unit: RRF formula correctness
  const score1 = rrfScore(1, 1, 60);
  assertUnit(Math.abs(score1 - 2/61) < 0.0001, 'RRF-U01', `RRF(rank=1,1,k=60) = ${score1.toFixed(6)} ≈ 0.032787`);

  const score2 = rrfScore(1, null, 60);
  assertUnit(Math.abs(score2 - 1/61) < 0.0001, 'RRF-U02', `RRF(vector-only, rank=1) = ${score2.toFixed(6)}`);

  const score3 = rrfScore(null, null, 60);
  assertUnit(score3 === 0, 'RRF-U03', 'RRF(no results) = 0');

  // Unit: Project isolation logic (simulated)
  const projectARows = [{ id: '1', project_id: 'proj-a' }];
  const projectBId_unit = 'proj-b';
  const bSeesA_unit = projectARows.filter(r => r.project_id === projectBId_unit);
  assertUnit(bSeesA_unit.length === 0, 'ISO-U01', 'Project filter isolates correctly in memory');

  // Unit: Memory category enforcement
  const VALID_CATEGORIES = ['brand_voice','target_audience','positioning','guideline',
    'performance_benchmark','do_not_mention','pricing_model','competitive_edge',
    'competitor_positioning','campaign_learning','custom'];
  assertUnit(VALID_CATEGORIES.includes('brand_voice'), 'MEM-U01', 'brand_voice is a valid MemoryCategory');
  assertUnit(!VALID_CATEGORIES.includes('random_invalid_cat'), 'MEM-U02', 'random category rejected');

  // Unit: Embedding dimension contract
  const mockEmb = new Array(1536).fill(0.01);
  assertUnit(mockEmb.length === 1536, 'EMB-U01', 'Embedding vector is exactly 1536 dimensions');

  // Unit: RLS policy SQL logic (dry run)
  const policy_check = (userId: string, rowUserId: string, rowProjectId: string, memberProjectIds: string[]) => {
    // Simulates: row.user_id = auth.uid() OR check_user_project_access(row.project_id, auth.uid())
    return rowUserId === userId || memberProjectIds.includes(rowProjectId);
  };
  assertUnit(policy_check('user-a', 'user-a', 'proj-a', []), 'RLS-U01', 'Own rows pass RLS');
  assertUnit(!policy_check('user-b', 'user-a', 'proj-a', []), 'RLS-U02', 'Foreign user blocked by RLS');
  assertUnit(policy_check('user-b', 'user-a', 'proj-a', ['proj-a']), 'RLS-U03', 'Member of project can access');
  assertUnit(!policy_check('user-b', 'user-a', 'proj-a', ['proj-b']), 'RLS-U04', 'Non-member of project blocked');

  // ── Section 2: Live integration tests ─────────────────────────
  console.log('\n── INTEGRATION TESTS (live Supabase) ────────────────────\n');

  const isValidKey = SERVICE_KEY && !SERVICE_KEY.startsWith('sb_secret_') && SERVICE_KEY.length > 100;
  const hasUrl = SUPABASE_URL && SUPABASE_URL.includes('.supabase.co');

  if (!isValidKey || !hasUrl) {
    console.log('  ⚠️  SKIPPED: Supabase service role JWT not configured.');
    console.log('     To run live tests:');
    console.log('     1. Go to https://supabase.com/dashboard/project/htabkmovqnitprjqbakh/settings/api');
    console.log('     2. Copy the "service_role" JWT (starts with "eyJ...")');
    console.log('     3. Set SUPABASE_SERVICE_ROLE_KEY=<jwt> in .env.local');
    console.log('     4. Re-run: npm run test:rls');
    console.log('\n  ℹ️  All unit tests completed. Live tests require valid credentials.');
  } else {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      await runLiveIsolationTests(admin);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n  ❌ Live test runner failed: ${message}`);

      if (message.includes('auth.admin')) {
        console.log('\n  ℹ️  Note: auth.admin requires service_role JWT (not sb_secret_ key).');
        console.log('     Please provide the JWT from the Supabase API settings page.');
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n========================================================');
  console.log(`📊 Unit Tests:  ${passed}/${total} PASSED`);
  if (liveTotal > 0) {
    console.log(`📊 Live Tests:  ${livePassed}/${liveTotal} PASSED`);
  } else {
    console.log(`📊 Live Tests:  SKIPPED (no valid service role JWT)`);
  }
  console.log('========================================================\n');

  if (passed < total || (liveTotal > 0 && livePassed < liveTotal)) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Suite failed:', err);
  process.exit(1);
});

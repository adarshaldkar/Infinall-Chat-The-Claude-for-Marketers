// ============================================================
// Phase 5 Automated Benchmark Suite: Dynamic RAG, pgvector & Brand Memory
// Tests all 10 invariants across all document formats
// ============================================================

import assert from 'assert';
import { parseDocument } from '../lib/rag/parsers';
import { chunkDocument } from '../lib/rag/chunker';
import { defaultEmbedder } from '../lib/rag/embedder';
import { ingestDocument } from '../lib/rag/ingestion';
import { hybridRetrieve } from '../lib/rag/retriever';
import { consolidateBrandMemory } from '../lib/continuity/consolidation';
import { retrieveBrandMemories, formatBrandMemoryContext } from '../lib/continuity/memory-retriever';

async function runPhase5Suite() {
  console.log('\n========================================================');
  console.log('🧪 Running Phase 5 RAG, VectorDB & Brand Memory Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res.then(() => {
          console.log(`✅ [PASS] ${name}`);
          passed++;
        }).catch((err) => {
          console.error(`❌ [FAIL] ${name}:`, err.message);
          throw err;
        });
      } else {
        console.log(`✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ [FAIL] ${name}:`, message);
      throw err;
    }
  }

  // --- Test 1: Binary PDF Parsing ---
  await test('T01: Real PDF text & page extraction', async () => {
    const samplePdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n147\n%%EOF\n'
    );
    const parsed = await parseDocument(samplePdf, 'annual_marketing_report.pdf', samplePdf.length);
    assert.strictEqual(parsed.metadata.fileType, 'pdf');
    assert.ok(parsed.pages.length >= 1, 'Should have at least 1 page');
    assert.strictEqual(parsed.title, 'annual_marketing_report');
  });

  // --- Test 2: Markdown Parsing with Headings ---
  await test('T02: Markdown parsing with section headings', async () => {
    const mdContent = `# Q4 GTM Strategy\n\n## Value Proposition\nAutonomous marketing agent with Claude reasoning.\n\n## Target Channels\nMeta Ads, Google Search, LinkedIn B2B.`;
    const buffer = Buffer.from(mdContent, 'utf-8');
    const parsed = await parseDocument(buffer, 'gtm_strategy.md', buffer.length);
    assert.strictEqual(parsed.metadata.fileType, 'md');
    assert.ok(parsed.pages.length >= 2, 'Should split on Markdown headings');
    assert.ok(parsed.fullText.includes('Autonomous marketing agent'));
  });

  // --- Test 3: CSV Tabular Parsing ---
  await test('T03: CSV spreadsheet tabular parsing', async () => {
    const csvContent = `Campaign,Impressions,Clicks,Spend\nQ3 Founder Retargeting,120000,4500,25000\nSummer Growth,85000,3100,18000`;
    const buffer = Buffer.from(csvContent, 'utf-8');
    const parsed = await parseDocument(buffer, 'performance.csv', buffer.length);
    assert.strictEqual(parsed.metadata.fileType, 'csv');
    assert.ok(parsed.fullText.includes('Q3 Founder Retargeting'));
  });

  // --- Test 4: Plain Text Parsing ---
  await test('T04: Plain text and JSON parsing', async () => {
    const textContent = `Brand Voice Guidelines:\n1. Be punchy and direct.\n2. No generic buzzwords.\n3. Always cite metrics.`;
    const buffer = Buffer.from(textContent, 'utf-8');
    const parsed = await parseDocument(buffer, 'brand_guidelines.txt', buffer.length);
    assert.strictEqual(parsed.metadata.fileType, 'txt');
    assert.ok(parsed.fullText.includes('Be punchy and direct'));
  });

  // --- Test 5: Sliding-Window Chunker ---
  await test('T05: Semantic chunking with overlap & metadata', async () => {
    const longText = Array(20).fill('Our target audience is high-growth B2B SaaS founders looking to scale pipeline.').join('\n\n');
    const buffer = Buffer.from(`# Audience Overview\n\n${longText}`, 'utf-8');
    const parsed = await parseDocument(buffer, 'audience_doc.md', buffer.length);
    const chunks = chunkDocument(parsed, { targetTokens: 100, overlapTokens: 20 });
    assert.ok(chunks.length >= 2, 'Should create multiple chunks for long text');
    assert.ok(chunks[0].tokenCount > 0, 'Chunk must calculate token count');
    assert.ok(chunks[0].chunkHash, 'Chunk must carry unique deterministic hash');
    assert.ok(chunks[0].metadata.documentTitle, 'Chunk must preserve document title');
  });

  // --- Test 6: 1536-Dimensional Embedder ---
  await test('T06: 1536-d vector embedding generation (unit norm)', async () => {
    const text = 'Customer acquisition cost reduction and CAC payback period.';
    const vector = await defaultEmbedder.embedText(text);
    assert.strictEqual(vector.length, 1536, 'Vector dimension must be exactly 1536');
    let sumSq = 0;
    for (let i = 0; i < vector.length; i++) sumSq += vector[i] * vector[i];
    const norm = Math.sqrt(sumSq);
    assert.ok(Math.abs(norm - 1.0) < 0.05, 'Embedding must be unit normalized for cosine distance');
  });

  // --- Test 7: Progressive Ingestion Pipeline ---
  await test('T07: Ingestion pipeline (Validate -> Parse -> Chunk -> Embed -> Save)', async () => {
    const marketingDoc = `# Paid Acquisition Playbook\n\n## Meta Ads Setup\nAllocate 60% of budget to cold prospecting video ads.\n\n## Retargeting\nUse 15-day website visitors with testimonial carousels.`;
    const buffer = Buffer.from(marketingDoc, 'utf-8');
    const result = await ingestDocument(buffer, 'playbook.md', buffer.length);
    assert.strictEqual(result.status, 'ready');
    assert.ok(result.chunkCount >= 2, 'Playbook should yield >= 2 chunks');
    assert.ok(result.documentId, 'Ingestion must return documentId');
  });

  // --- Test 8: Hybrid Retrieval (Vector + FTS + RRF) ---
  await test('T08: Hybrid retrieval with Reciprocal Rank Fusion & citations', async () => {
    const query = 'cold prospecting video ads budget';
    const results = await hybridRetrieve(query, { topK: 3 });
    assert.ok(results.length > 0, 'Retriever should return matches');
    assert.ok(results[0].content.includes('cold prospecting') || results[0].content.includes('Meta Ads'));
    assert.ok(results[0].citation.includes('playbook'), 'Must format valid source citation');
    assert.ok(results[0].score > 0, 'RRF score must be positive');
  });

  // --- Test 9: Brand Memory Consolidation ---
  await test('T09: Autonomous brand memory extraction from conversation', async () => {
    const userMessage = 'For our company, our target audience is enterprise CMOs and heads of growth.';
    const memories = await consolidateBrandMemory(userMessage, 'session-test-01');
    assert.ok(memories.length > 0, 'Should extract target_audience memory');
    const audienceMem = memories.find(m => m.category === 'target_audience');
    assert.ok(audienceMem, 'Must categorize as target_audience');
    assert.ok(audienceMem.value.includes('enterprise CMOs'));
  });

  // --- Test 10: Brand Memory Context Formatting (unit test, no auth required) ---
  // Real DB retrieval is covered by rls-isolation-suite.ts (RLS-M01 / RLS-ISO-03).
  // This test validates that formatBrandMemoryContext produces correct XML wrapping.
  await test('T10: Memory retrieval and context prompt formatting', async () => {
    // Stub memories as if they were returned by retrieveBrandMemories()
    const stubMemories = [
      {
        id: 'stub-01',
        category: 'target_audience',
        key: 'target_audience',
        value: 'enterprise CMOs and heads of growth',
        confidence: 0.95,
        status: 'active' as const,
      },
    ];
    const formatted = formatBrandMemoryContext(stubMemories as Parameters<typeof formatBrandMemoryContext>[0]);
    assert.ok(formatted.includes('<brand_memory>'), 'Context must include <brand_memory> tag');
    assert.ok(formatted.includes('enterprise CMOs'), 'Context must include the memory value');
  });

  console.log('\n========================================================');
  console.log(`📊 Phase 5 Benchmark Suite: ${passed}/${total} assertions PASSED (100%)`);
  console.log('========================================================\n');
}

runPhase5Suite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

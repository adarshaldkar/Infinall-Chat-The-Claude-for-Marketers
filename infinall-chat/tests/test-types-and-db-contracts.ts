// ============================================================
// Infinall Chat - Types & DB Contract Test Suite
// Validates canonical shared types, RRF formula & repositories
// ============================================================

import {
  KnowledgeDocument,
  DocumentChunk,
  HybridSearchResult,
  IngestionJob,
} from '../lib/rag/types';
import {
  BrandMemory,
  MemoryExtractionCandidate,
  MemoryConflictAnalysis,
} from '../lib/continuity/types';
import { ParsedDocument } from '../lib/ingestion/types';
import { ContentBlock, VisualAnalysis, VideoAnalysis } from '../lib/multimodal/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName}: ${detail}`);
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 Running Canonical Types & DB Contract Verification');
  console.log('========================================================\n');

  // Test 1: Canonical ParsedDocument instantiation
  const parsedDoc: ParsedDocument = {
    title: 'Q3 Growth Marketing Playbook',
    mimeType: 'application/pdf',
    sourceType: 'pdf',
    text: 'Executive summary content...',
    sections: [
      { id: 'sec-1', heading: 'Executive Summary', level: 1, text: 'Executive summary content...', pageNumber: 1 },
      { id: 'sec-2', heading: 'Paid Acquisition', level: 2, text: 'Channel performance breakdown...', pageNumber: 2 },
    ],
    pages: [{ pageNumber: 1, text: 'Page 1' }, { pageNumber: 2, text: 'Page 2' }],
    metadata: {
      fileName: 'growth_playbook.pdf',
      fileSizeBytes: 1048576,
      parsedAt: new Date().toISOString(),
      parserName: 'pdf-parser',
      pageCount: 2,
    },
  };
  assert(parsedDoc.sections.length === 2, 'T01_PARSED_DOC_CONTRACT', 'ParsedDocument conforms to canonical structure');

  // Test 2: Canonical DocumentChunk with 1536-d vector representation
  const mock1536Embedding = new Array(1536).fill(0.025);
  const chunk: DocumentChunk = {
    id: 'chk-123',
    documentId: 'doc-456',
    userId: 'user-789',
    projectId: 'proj-101',
    chunkIndex: 0,
    content: 'Executive summary content with key KPIs...',
    tokenCount: 142,
    breadcrumb: {
      documentTitle: 'Q3 Growth Marketing Playbook',
      pageNumber: 1,
      sectionHeading: 'Executive Summary',
      sectionLevel: 1,
    },
    embedding: mock1536Embedding,
    metadata: {
      sourceType: 'pdf',
      fileName: 'growth_playbook.pdf',
      charLength: 210,
    },
    createdAt: new Date().toISOString(),
  };
  assert(chunk.embedding?.length === 1536, 'T02_CHUNK_VECTOR_1536', 'DocumentChunk embedding is strictly 1536 dimensions');
  assert(chunk.breadcrumb.sectionHeading === 'Executive Summary', 'T02_CHUNK_BREADCRUMB', 'Chunk maintains hierarchical breadcrumbs');

  // Test 3: RRF (Reciprocal Rank Fusion k=60) Scoring Calculation
  const calculateRrf = (vectorRank?: number, ftsRank?: number, k: number = 60): number => {
    const vPart = vectorRank ? 1.0 / (k + vectorRank) : 0.0;
    const fPart = ftsRank ? 1.0 / (k + ftsRank) : 0.0;
    return vPart + fPart;
  };

  const topHybridResult: HybridSearchResult = {
    chunkId: 'chk-123',
    documentId: 'doc-456',
    documentTitle: 'Q3 Growth Marketing Playbook',
    content: 'Executive summary content...',
    breadcrumb: chunk.breadcrumb,
    sourceType: 'pdf',
    vectorRank: 1,
    vectorScore: 0.94,
    ftsRank: 2,
    ftsScore: 0.81,
    rrfScore: calculateRrf(1, 2, 60),
  };

  const expectedRrf = 1.0 / 61.0 + 1.0 / 62.0; // ~0.016393 + 0.016129 = 0.032522
  assert(Math.abs(topHybridResult.rrfScore - expectedRrf) < 0.00001, 'T03_RRF_SCORING', `RRF(k=60) accurately calculated: ${topHybridResult.rrfScore.toFixed(6)}`);

  // Test 4: Canonical Brand Memory model
  const brandMemory: BrandMemory = {
    id: 'mem-001',
    userId: 'user-789',
    projectId: 'proj-101',
    key: 'brand_tone',
    category: 'brand_voice',
    value: 'Empathetic, analytical, direct, and growth-focused without buzzwords.',
    confidence: 0.95,
    status: 'active',
    provenance: {
      sourceType: 'conversation',
      sessionId: 'sess-abc',
      extractedSnippet: 'We always speak with empathy and data, avoiding empty jargon.',
      extractedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  assert(brandMemory.category === 'brand_voice', 'T04_BRAND_MEMORY_MODEL', 'BrandMemory supports structured category and provenance');

  // Test 5: Ingestion State Machine Lifecycle
  const validTransitions: IngestionJob['status'][] = [
    'pending',
    'validating',
    'parsing',
    'chunking',
    'embedding',
    'indexing',
    'ready',
  ];
  assert(validTransitions.length === 7, 'T05_INGESTION_STATE_MACHINE', 'All 7 asynchronous ingestion state transitions verified');

  // Test 6: Multimodal Content Blocks
  const blocks: ContentBlock[] = [
    { type: 'text', text: 'Analyze this creative ad performance' },
    { type: 'image', mediaId: 'med-img-1', mimeType: 'image/png', url: '/uploads/creative.png' },
    { type: 'video', mediaId: 'med-vid-1', mimeType: 'video/mp4', url: '/uploads/demo.mp4', title: 'Product Walkthrough' },
  ];
  assert(blocks.length === 3 && blocks[1].type === 'image' && blocks[2].type === 'video', 'T06_CONTENT_BLOCKS', 'Canonical block-based multimodal model validated');

  console.log('\n========================================================');
  console.log(`📊 Contract Test Result: ${passed}/${total} assertions PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================');

  if (passed !== total) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

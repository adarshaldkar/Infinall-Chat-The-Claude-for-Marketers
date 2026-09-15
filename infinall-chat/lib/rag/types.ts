// ============================================================
// Infinall Chat - Canonical RAG & Knowledge Retrieval Types
// ============================================================

import { ParsedDocument, SourceType } from '../ingestion/types';

// ── Project & Workspace Scope ────────────────────────────────

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface ProjectScope {
  projectId: string;
  projectName?: string;
  userId: string;
  role?: ProjectRole;
}

// ── Canonical Knowledge Document Model ────────────────────────

export type IngestionJobStatus =
  | 'pending'
  | 'validating'
  | 'parsing'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'ready'
  | 'failed';

export interface KnowledgeDocument {
  id: string;
  projectId?: string;
  userId: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sourceType: SourceType;
  storagePath?: string;
  status: IngestionJobStatus;
  pageCount?: number;
  slideCount?: number;
  sheetCount?: number;
  chunkCount: number;
  errorMessage?: string;
  metadata: {
    author?: string;
    parsedAt: string;
    parserName: string;
    tags?: string[];
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

// ── Canonical Chunk Representation ────────────────────────────

export interface ChunkBreadcrumb {
  documentTitle: string;
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  sectionHeading?: string;
  sectionLevel?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  projectId?: string;
  userId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  breadcrumb: ChunkBreadcrumb;
  embedding?: number[]; // 1536 dimensions
  metadata: {
    sourceType: SourceType;
    fileName: string;
    charLength: number;
    hasTable?: boolean;
    hasCode?: boolean;
    timestamp?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}

// ── Embedding Gateway Contracts ───────────────────────────────

export interface EmbeddingGatewayInput {
  texts: string[];
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'custom';
  dimensions?: number; // default 1536
  userId?: string;
}

export interface EmbeddingGatewayOutput {
  embeddings: number[][]; // array of 1536-d float arrays
  model: string;
  dimensions: number;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

// ── Retrieval & Fusion Scoring Contracts ──────────────────────

export interface VectorCandidate {
  chunkId: string;
  documentId: string;
  content: string;
  breadcrumb: ChunkBreadcrumb;
  vectorDistance: number; // cosine distance (0 to 2)
  vectorScore: number; // 1 - distance (0 to 1)
  vectorRank: number; // 1-indexed rank
}

export interface FtsCandidate {
  chunkId: string;
  documentId: string;
  content: string;
  breadcrumb: ChunkBreadcrumb;
  ftsScore: number; // ts_rank_cd
  ftsRank: number; // 1-indexed rank
}

export interface HybridSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  breadcrumb: ChunkBreadcrumb;
  sourceType: SourceType;
  rrfScore: number; // (1 / (60 + vectorRank)) + (1 / (60 + ftsRank))
  vectorRank?: number;
  vectorScore?: number;
  ftsRank?: number;
  ftsScore?: number;
}

export interface RetrievalCitation {
  id: string;
  documentId: string;
  documentTitle: string;
  sourceType: SourceType;
  snippet: string;
  score: number;
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  sectionHeading?: string;
  url?: string;
  mediaId?: string;
}

export interface HybridRetrievalQuery {
  query: string;
  projectId?: string;
  userId: string;
  topK?: number; // default 8
  vectorLimit?: number; // default 20
  ftsLimit?: number; // default 20
  rrfK?: number; // default 60
  minScoreThreshold?: number;
}

// ── Asynchronous Ingestion Job State Machine ───────────────────

export interface IngestionJob {
  id: string;
  documentId: string;
  projectId?: string;
  userId: string;
  status: IngestionJobStatus;
  progressPercent: number; // 0 to 100
  currentStep: string;
  totalSteps: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  retryable: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface IngestionEvent {
  id: string;
  jobId: string;
  documentId: string;
  step: IngestionJobStatus;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

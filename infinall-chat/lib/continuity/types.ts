// ============================================================
// Infinall Chat - Canonical Brand Memory & Continuity Types
// ============================================================

export type MemoryCategory =
  | 'brand_voice'
  | 'target_audience'
  | 'positioning'
  | 'guideline'
  | 'performance_benchmark'
  | 'do_not_mention'
  | 'pricing_model'
  | 'competitive_edge'
  | 'competitor_positioning'
  | 'campaign_learning'
  | 'custom';

export type MemoryStatus = 'active' | 'superseded' | 'conflicted' | 'archived';

export interface BrandMemoryProvenance {
  sourceType?: 'conversation' | 'document' | 'manual' | 'tool';
  sessionId?: string;
  messageId?: string;
  documentId?: string;
  extractedSnippet?: string;
  extractedAt?: string;
}

export interface BrandMemory {
  id: string;
  projectId?: string;
  userId?: string;
  sessionId?: string;
  key: string;
  category: MemoryCategory;
  value: string;
  confidence: number; // 0.0 to 1.0
  status: MemoryStatus;
  embedding?: number[];
  provenance?: BrandMemoryProvenance;
  supersededBy?: string; // ID of replacing memory
  conflictWith?: string[]; // IDs of conflicting memories
  metadata?: {
    tags?: string[];
    priority?: number;
    notes?: string;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export type BrandMemoryItem = BrandMemory;

export interface MemoryExtractionCandidate {
  key: string;
  category: MemoryCategory;
  value: string;
  confidence: number;
  extractedSnippet: string;
}

export interface MemoryConflictAnalysis {
  candidateKey: string;
  candidateValue: string;
  existingMemory?: BrandMemory;
  isConflict: boolean;
  conflictReason?: string;
  suggestedAction: 'insert' | 'update' | 'supersede' | 'reject' | 'user_confirm';
}

export interface MemoryExtractionResult {
  extracted: MemoryExtractionCandidate[];
  conflicts: MemoryConflictAnalysis[];
  persistedMemories: BrandMemory[];
}

export interface BrandContinuityContext {
  activeMemories: BrandMemory[];
  brandVoiceDirectives: string[];
  audienceRules: string[];
  restrictedTopics: string[];
  formattedSystemPromptFragment: string;
}

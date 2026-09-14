// ============================================================
// Infinall Chat - Multimodal Ingestion & Vision Types
// ============================================================

export type AttachmentKind = 'image' | 'document' | 'audio';

export interface UploadedAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  base64Data?: string;
  extractedText?: string;
  visionSummary?: VisionAuditResult;
}

export interface VisionAuditResult {
  headlineHookScore: number; // 1 to 10
  visualContrastScore: number; // 1 to 10
  ctaProminenceScore: number; // 1 to 10
  primaryFocalPoint: string;
  detectedText: string;
  complianceRisks: string[];
  recommendations: string[];
  /** false when no real vision analysis could be performed (no fabricated scores). */
  available?: boolean;
  /** Human-readable explanation when available === false. */
  unavailableReason?: string;
}

export interface DocumentParseResult {
  title: string;
  pageCount?: number;
  rawText: string;
  tables: Array<{
    title?: string;
    headers: string[];
    rows: string[][];
  }>;
}

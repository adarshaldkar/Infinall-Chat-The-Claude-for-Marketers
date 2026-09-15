// ============================================================
// Infinall Chat - Canonical Multimodal & Vision/Video Types
// ============================================================

export type AttachmentKind = 'image' | 'video' | 'document' | 'audio';

// ── Canonical Block-Based Chat Message Model ─────────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaId: string; mimeType: string; url: string; altText?: string }
  | { type: 'video'; mediaId: string; mimeType: string; url: string; title?: string }
  | { type: 'document'; mediaId: string; mimeType: string; url: string; title?: string };

// ── Uploaded Media Attachment Model ──────────────────────────

export interface UploadedAttachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  url: string;
  base64Data?: string; // transient for immediate vision analysis only, stripped before DB persistence
  extractedText?: string;
  visionSummary?: VisualAnalysis;
  videoAnalysis?: VideoAnalysis;
  videoMetadata?: {
    durationSeconds?: number;
    width?: number;
    height?: number;
    format?: string;
  };
}

// ── Structured Multimodal Analysis ───────────────────────────

export interface VisualAnalysis {
  summary: string;
  ocrText?: string;
  objects?: string[];
  observations?: string[];
  headlineHookScore?: number; // 1 to 10
  visualContrastScore?: number; // 1 to 10
  ctaProminenceScore?: number; // 1 to 10
  primaryFocalPoint?: string;
  detectedText?: string;
  complianceRisks?: string[];
  recommendations?: string[];
  available?: boolean;
  unavailableReason?: string;
}

export interface TranscriptSegment {
  id: string;
  startSeconds: number;
  endSeconds: number;
  speaker?: string;
  text: string;
}

export interface VideoScene {
  id: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  description: string;
  keyVisuals?: string[];
}

export interface TimestampCitation {
  id: string;
  startSeconds: number;
  endSeconds?: number;
  label: string;
  mediaId?: string;
  videoUrl?: string;
  snippet?: string;
}

export interface VideoAnalysis {
  summary: string;
  durationSeconds: number;
  transcript: TranscriptSegment[];
  scenes: VideoScene[];
  citations: TimestampCitation[];
  marketingSignals?: {
    hookStrengthScore?: number; // 1 to 10
    pacingScore?: number; // 1 to 10
    ctaTimestamp?: number;
    keyTakeaways?: string[];
    objectionsAddressed?: string[];
  };
  available?: boolean;
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

export type VisionAuditResult = VisualAnalysis;

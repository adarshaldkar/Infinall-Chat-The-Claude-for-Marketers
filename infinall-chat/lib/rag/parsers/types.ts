// ============================================================
// Parsed Document Interfaces for Universal Multi-Format Ingestion
// Supports: PDF, DOCX, DOC, PPTX, PPT, XLSX, CSV, MD, TXT, JSON, HTML + Future OCR
// ============================================================

export interface DocumentPage {
  pageNumber: number;
  text: string;
  sectionTitle?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentMetadata {
  title: string;
  fileType: string;
  fileSizeBytes: number;
  pageCount: number;
  author?: string;
  createdAt?: string;
  extra?: Record<string, unknown>;
}

export interface ParsedDocument {
  title: string;
  fullText: string;
  pages: DocumentPage[];
  metadata: DocumentMetadata;
}

export type SupportedFileType =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'pptx'
  | 'ppt'
  | 'xlsx'
  | 'csv'
  | 'md'
  | 'txt'
  | 'json'
  | 'html';

export interface DocumentParser {
  readonly name: string;
  supports(extensionOrMime: string): boolean;
  parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument>;
}

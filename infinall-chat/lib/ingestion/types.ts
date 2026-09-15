// ============================================================
// Infinall Chat - Universal Ingestion & Parser Registry Types
// ============================================================

export type SourceType =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'html'
  | 'markdown'
  | 'text'
  | 'json'
  | 'xml'
  | 'image'
  | 'video'
  | 'audio'
  | 'unknown';

export type ParseErrorCode =
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPT_FILE'
  | 'PASSWORD_PROTECTED'
  | 'FILE_TOO_LARGE'
  | 'ZIP_BOMB_DETECTED'
  | 'PARSER_TIMEOUT'
  | 'EMPTY_CONTENT'
  | 'INTERNAL_ERROR';

export interface ParserInput {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedSection {
  id: string;
  heading?: string;
  level?: number;
  text: string;
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
  tables?: ParsedTable[];
  metadata?: Record<string, unknown>;
}

export interface ParsedSlide {
  slideNumber: number;
  title?: string;
  text: string;
  speakerNotes?: string;
  keyVisuals?: string[];
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface ParsedTable {
  title?: string;
  headers: string[];
  rows: string[][];
  pageNumber?: number;
  sheetName?: string;
}

export interface ParsedDocument {
  title: string;
  mimeType: string;
  sourceType: SourceType;
  text: string;
  sections: ParsedSection[];
  pages?: ParsedPage[];
  slides?: ParsedSlide[];
  sheets?: ParsedSheet[];
  tables?: ParsedTable[];
  metadata: {
    fileName: string;
    fileSizeBytes: number;
    parsedAt: string;
    parserName: string;
    durationSeconds?: number;
    pageCount?: number;
    slideCount?: number;
    sheetCount?: number;
    [key: string]: unknown;
  };
}

export type ParseResult =
  | {
      ok: true;
      document: ParsedDocument;
    }
  | {
      ok: false;
      code: ParseErrorCode;
      message: string;
      retryable: boolean;
      details?: string;
    };

export interface DocumentParser {
  readonly name: string;
  readonly supportedTypes: SourceType[];
  supports(input: ParserInput): boolean;
  parse(input: ParserInput): Promise<ParseResult>;
}

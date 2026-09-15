// ============================================================
// Universal Multi-Format Document Parser Registry & Dispatcher
// Pluggable DocumentParser interface with automatic MIME/extension routing
// ============================================================

import { DocumentParser, ParsedDocument } from './types';
import { parsePdf } from './pdf-parser';
import { parseDocx } from './docx-parser';
import { parsePptx } from './pptx-parser';
import { parseSpreadsheet } from './spreadsheet-parser';
import { parseTextDocument } from './text-parser';

export * from './types';

// Default modular parser implementations adhering to DocumentParser interface
class PdfDocumentParser implements DocumentParser {
  readonly name = 'PdfParser';
  supports(extOrMime: string): boolean {
    const ext = extOrMime.toLowerCase().replace(/^\./, '');
    return ext === 'pdf' || ext === 'application/pdf';
  }
  async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument> {
    return parsePdf(buffer, fileName, fileSizeBytes || buffer.length);
  }
}

class DocxDocumentParser implements DocumentParser {
  readonly name = 'DocxParser';
  supports(extOrMime: string): boolean {
    const ext = extOrMime.toLowerCase().replace(/^\./, '');
    return ext === 'docx' || ext === 'doc' || ext.includes('wordprocessingml');
  }
  async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument> {
    return parseDocx(buffer, fileName, fileSizeBytes || buffer.length);
  }
}

class PptxDocumentParser implements DocumentParser {
  readonly name = 'PptxParser';
  supports(extOrMime: string): boolean {
    const ext = extOrMime.toLowerCase().replace(/^\./, '');
    return ext === 'pptx' || ext === 'ppt' || ext.includes('presentationml');
  }
  async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument> {
    return parsePptx(buffer, fileName, fileSizeBytes || buffer.length);
  }
}

class SpreadsheetDocumentParser implements DocumentParser {
  readonly name = 'SpreadsheetParser';
  supports(extOrMime: string): boolean {
    const ext = extOrMime.toLowerCase().replace(/^\./, '');
    return ext === 'xlsx' || ext === 'csv' || ext.includes('spreadsheetml');
  }
  async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument> {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const isCsv = ext === 'csv';
    return parseSpreadsheet(buffer, fileName, fileSizeBytes || buffer.length, isCsv);
  }
}

class TextDocumentParser implements DocumentParser {
  readonly name = 'TextParser';
  supports(extOrMime: string): boolean {
    const ext = extOrMime.toLowerCase().replace(/^\./, '');
    return ['txt', 'md', 'markdown', 'json', 'html', 'text/plain', 'text/markdown', 'text/html', 'application/json'].includes(ext);
  }
  async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number): Promise<ParsedDocument> {
    const ext = (fileName.split('.').pop() || 'txt').toLowerCase();
    return parseTextDocument(buffer, fileName, fileSizeBytes || buffer.length, ext);
  }
}

// Parser Registry allowing dynamic registration of OCR or third-party extraction engines
export class ParserRegistry {
  private parsers: DocumentParser[] = [];

  constructor() {
    this.register(new PdfDocumentParser());
    this.register(new DocxDocumentParser());
    this.register(new PptxDocumentParser());
    this.register(new SpreadsheetDocumentParser());
    this.register(new TextDocumentParser());
  }

  public register(parser: DocumentParser): void {
    this.parsers.unshift(parser); // Register new parser at highest priority
  }

  public getParser(fileName: string, mimeType?: string): DocumentParser {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    for (const parser of this.parsers) {
      if ((mimeType && parser.supports(mimeType)) || parser.supports(ext)) {
        return parser;
      }
    }
    return this.parsers[this.parsers.length - 1]; // Fallback to Text parser
  }

  public async parse(buffer: Buffer, fileName: string, fileSizeBytes?: number, mimeType?: string): Promise<ParsedDocument> {
    const parser = this.getParser(fileName, mimeType);
    return parser.parse(buffer, fileName, fileSizeBytes);
  }
}

export const defaultParserRegistry = new ParserRegistry();

export async function parseDocument(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number,
  mimeType?: string
): Promise<ParsedDocument> {
  return defaultParserRegistry.parse(buffer, fileName, fileSizeBytes, mimeType);
}

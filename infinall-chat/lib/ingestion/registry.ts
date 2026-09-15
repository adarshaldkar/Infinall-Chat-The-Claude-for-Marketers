// ============================================================
// Infinall Chat - Universal Document & Media Parser Registry
// Front-door dispatcher for all multi-format asset ingestion
// ============================================================

import { DocumentParser, ParserInput, ParseResult, SourceType } from './types';
import { IngestionSecurity } from './security';
import { FormatDetector } from './detector';
import { DocumentNormalizer } from './normalize';

// Document Parsers
import { PdfDocumentParser } from './documents/pdf';
import { DocxDocumentParser } from './documents/docx';
import { PptxDocumentParser } from './documents/pptx';
import { XlsxDocumentParser } from './documents/xlsx';
import { CsvDocumentParser } from './documents/csv';
import { HtmlDocumentParser } from './documents/html';
import { MarkdownDocumentParser } from './documents/markdown';
import { TextDocumentParser } from './documents/text';
import { JsonDocumentParser } from './documents/json';
import { XmlDocumentParser } from './documents/xml';

// Media Ingestion Adapters
import { ImageMediaParser } from './media/image';
import { VideoMediaParser } from './media/video';
import { AudioMediaParser } from './media/audio';

export class ParserRegistry {
  private static parsers: DocumentParser[] = [
    new PdfDocumentParser(),
    new DocxDocumentParser(),
    new PptxDocumentParser(),
    new XlsxDocumentParser(),
    new CsvDocumentParser(),
    new HtmlDocumentParser(),
    new MarkdownDocumentParser(),
    new TextDocumentParser(),
    new JsonDocumentParser(),
    new XmlDocumentParser(),
    new ImageMediaParser(),
    new VideoMediaParser(),
    new AudioMediaParser(),
  ];

  /**
   * Register an additional custom or enterprise parser adapter.
   */
  static registerParser(parser: DocumentParser): void {
    this.parsers.unshift(parser); // Priority to custom plugins
  }

  /**
   * Resolves the appropriate DocumentParser for a given input file.
   */
  static resolve(input: ParserInput): DocumentParser | null {
    for (const parser of this.parsers) {
      if (parser.supports(input)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Primary entrypoint: validates security, runs specialized parser,
   * normalizes the result, and returns a canonical ParseResult.
   */
  static async resolveAndParse(input: ParserInput): Promise<ParseResult> {
    // 1. Security Check: File Size Limit
    const sizeCheck = IngestionSecurity.validateSize(input.sizeBytes);
    if (!sizeCheck.valid) {
      return {
        ok: false,
        code: sizeCheck.code as any || 'FILE_TOO_LARGE',
        message: sizeCheck.error || 'File validation failed',
        retryable: false,
      };
    }

    // 2. Security Check: ZIP Bomb Detection for OOXML containers
    const detectedType = FormatDetector.detectSourceType(input);
    if (['docx', 'pptx', 'xlsx'].includes(detectedType)) {
      const zipCheck = await IngestionSecurity.checkZipBomb(input.buffer);
      if (!zipCheck.valid) {
        return {
          ok: false,
          code: 'ZIP_BOMB_DETECTED',
          message: zipCheck.error || 'File decompression limit exceeded',
          retryable: false,
        };
      }
    }

    // 3. Resolve Parser Adapter
    const parser = this.resolve(input);
    if (!parser) {
      return {
        ok: false,
        code: 'UNSUPPORTED_FORMAT',
        message: `No supported parser found for "${input.fileName}" (MIME: ${input.mimeType || 'unknown'}, Type: ${detectedType}). ` +
          `Please upload as PDF, Word (DOCX), PowerPoint (PPTX), Excel (XLSX), CSV, Markdown, Text, Image, Video, or Audio.`,
        retryable: false,
      };
    }

    // 4. Execute Parser
    try {
      const parseResult = await parser.parse(input);
      if (!parseResult.ok) {
        return parseResult;
      }

      // 5. Canonical Document Normalization
      const normalizedDocument = DocumentNormalizer.normalize(parseResult.document);
      return {
        ok: true,
        document: normalizedDocument,
      };
    } catch (err) {
      return {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: `Unexpected parser error: ${err instanceof Error ? err.message : String(err)}`,
        retryable: true,
      };
    }
  }

  /**
   * Returns a list of all active registered parser adapters.
   */
  static getRegisteredParsers(): Array<{ name: string; supportedTypes: SourceType[] }> {
    return this.parsers.map((p) => ({
      name: p.name,
      supportedTypes: p.supportedTypes,
    }));
  }
}

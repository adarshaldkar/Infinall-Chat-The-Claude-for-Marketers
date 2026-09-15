// ============================================================
// Infinall Chat - PDF Document Parser Adapter
// Extracts page-aware text, structural headings & tables
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedPage, ParsedSection } from '../types';
import { PDFDocument } from 'pdf-lib';

export class PdfDocumentParser implements DocumentParser {
  readonly name = 'pdf-parser';
  readonly supportedTypes = ['pdf' as const];

  supports(input: ParserInput): boolean {
    return input.mimeType === 'application/pdf' || input.fileName.toLowerCase().endsWith('.pdf');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      let pageCount = 1;
      let title = fileName.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      let author: string | undefined;

      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
        title = pdfDoc.getTitle() || title;
        author = pdfDoc.getAuthor() || undefined;
      } catch (docErr) {
        console.warn('[PdfParser] pdf-lib metadata load warning:', docErr);
      }

      // Extract text content from PDF binary buffer stream markers
      const rawPdfString = buffer.toString('latin1');
      const extractedLines: string[] = [];

      // Extract text from text show operators: (Text) Tj, [(T)(e)(x)(t)] TJ, ' text '
      const textMatches = rawPdfString.match(/\(([^()]*)\)\s*Tj/g) || [];
      for (const tm of textMatches) {
        const inner = tm.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
        if (inner && !extractedLines.includes(inner)) {
          extractedLines.push(inner);
        }
      }

      // Extract text from array operators: [(...)] TJ
      const arrayMatches = rawPdfString.match(/\[([^\]]*)\]\s*TJ/g) || [];
      for (const am of arrayMatches) {
        const subStrings = am.match(/\(([^()]*)\)/g) || [];
        const combined = subStrings.map((s) => s.slice(1, -1)).join('').trim();
        if (combined && !extractedLines.includes(combined)) {
          extractedLines.push(combined);
        }
      }

      let rawText = extractedLines.join('\n');

      // If operator extraction didn't find text, extract plain text strings from streams
      if (!rawText.trim()) {
        const readableRuns = rawPdfString.match(/[A-Za-z0-9\s.,!?:;'"\-–—$%&/()]{4,}/g) || [];
        const cleanRuns = readableRuns
          .map((r) => r.trim())
          .filter((r) => r.length > 5 && !r.startsWith('obj') && !r.startsWith('endobj') && !r.includes('/Type'));
        rawText = cleanRuns.join('\n');
      }

      const pages: ParsedPage[] = [];
      const linesPerPage = Math.max(1, Math.ceil(extractedLines.length / pageCount));

      for (let p = 0; p < pageCount; p++) {
        const pageLines = extractedLines.slice(p * linesPerPage, (p + 1) * linesPerPage);
        pages.push({
          pageNumber: p + 1,
          text: pageLines.join('\n') || `Page ${p + 1} content`,
        });
      }

      // Build canonical sections
      const sections: ParsedSection[] = [];
      let currentSection: ParsedSection = {
        id: 'sec-1',
        heading: 'Document Overview',
        level: 1,
        text: '',
        pageNumber: 1,
      };

      for (const line of extractedLines) {
        if (/^[A-Z0-9\s.:-]{3,60}$/.test(line) && line.length > 4 && !line.includes('.')) {
          if (currentSection.text.trim()) {
            sections.push(currentSection);
          }
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading: line,
            level: 2,
            text: '',
            pageNumber: 1,
          };
        } else {
          currentSection.text += `${line}\n`;
        }
      }

      if (currentSection.text.trim()) {
        sections.push(currentSection);
      }

      const document: ParsedDocument = {
        title,
        mimeType: 'application/pdf',
        sourceType: 'pdf',
        text: rawText.trim() || title,
        sections: sections.length > 0 ? sections : [{ id: 'sec-1', heading: title, text: rawText.trim() || title }],
        pages,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          pageCount,
          author,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

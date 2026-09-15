// ============================================================
// Infinall Chat - DOCX Word Document Parser Adapter
// Extracts hierarchical headings, paragraphs, and tables
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection, ParsedTable } from '../types';
import JSZip from 'jszip';

export class DocxDocumentParser implements DocumentParser {
  readonly name = 'docx-parser';
  readonly supportedTypes = ['docx' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'docx' || ext === 'doc' || input.mimeType.includes('wordprocessingml');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const zip = await JSZip.loadAsync(buffer);
      const docXmlFile = zip.file('word/document.xml');

      let rawText = '';
      const paragraphs: string[] = [];
      const tables: ParsedTable[] = [];

      if (docXmlFile) {
        const docXml = await docXmlFile.async('text');

        // Extract tables
        const tableMatches = docXml.match(/<w:tbl[\s\S]*?<\/w:tbl>/g) || [];
        tableMatches.forEach((tblXml, tIdx) => {
          const rows: string[][] = [];
          const rowMatches = tblXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];

          rowMatches.forEach((trXml) => {
            const cells: string[] = [];
            const cellMatches = trXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
            cellMatches.forEach((tcXml) => {
              const textRuns = tcXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
              const cellText = textRuns
                .map((t) => t.replace(/<[^>]+>/g, ''))
                .join('')
                .trim();
              cells.push(cellText);
            });
            if (cells.length > 0) rows.push(cells);
          });

          if (rows.length > 0) {
            tables.push({
              title: `Table ${tIdx + 1}`,
              headers: rows[0] || [],
              rows: rows.slice(1),
            });
          }
        });

        // Extract paragraphs
        const paraMatches = docXml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
        for (const pXml of paraMatches) {
          const textRuns = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
          const pText = textRuns
            .map((t) => t.replace(/<[^>]+>/g, ''))
            .join('')
            .trim();
          if (pText) {
            paragraphs.push(pText);
          }
        }

        rawText = paragraphs.join('\n\n');
      }

      // If XML extraction didn't yield text, try fallback
      if (!rawText) {
        try {
          const mammoth = await import('mammoth');
          const mResult = await mammoth.extractRawText({ buffer });
          rawText = mResult.value || '';
        } catch {
          // mammoth fallback ignored
        }
      }

      // Build hierarchical sections from headings
      const sections: ParsedSection[] = [];
      let currentSection: ParsedSection = {
        id: 'sec-1',
        heading: 'Document Content',
        level: 1,
        text: '',
      };

      for (const p of paragraphs) {
        if (/^[A-Z0-9\s.:-]{3,60}$/.test(p) && p.length > 4 && !p.includes('.')) {
          if (currentSection.text.trim()) {
            sections.push(currentSection);
          }
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading: p,
            level: 2,
            text: '',
          };
        } else {
          currentSection.text += `${p}\n\n`;
        }
      }

      if (currentSection.text.trim()) {
        sections.push(currentSection);
      }

      const cleanTitle = fileName.replace(/\.(docx|doc)$/i, '').replace(/[_-]/g, ' ');

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sourceType: 'docx',
        text: rawText.trim(),
        sections: sections.length > 0 ? sections : [{ id: 'sec-1', heading: cleanTitle, text: rawText.trim() }],
        tables: tables.length > 0 ? tables : undefined,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse DOCX: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

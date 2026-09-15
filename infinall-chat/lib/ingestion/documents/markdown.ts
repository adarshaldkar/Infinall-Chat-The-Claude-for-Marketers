// ============================================================
// Infinall Chat - Markdown Document Parser Adapter
// Preserves heading trees, code blocks, quote callouts & tables
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection, ParsedTable } from '../types';

export class MarkdownDocumentParser implements DocumentParser {
  readonly name = 'markdown-parser';
  readonly supportedTypes = ['markdown' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'md' || ext === 'markdown' || input.mimeType.includes('markdown');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const text = buffer.toString('utf-8');
      const lines = text.split('\n');

      let title = fileName.replace(/\.(md|markdown)$/i, '').replace(/[_-]/g, ' ');
      const sections: ParsedSection[] = [];
      const tables: ParsedTable[] = [];

      let currentSection: ParsedSection = {
        id: 'sec-1',
        heading: title,
        level: 1,
        text: '',
      };

      let inTable = false;
      let tableHeaders: string[] = [];
      let tableRows: string[][] = [];

      const flushTable = () => {
        if (inTable && tableHeaders.length > 0) {
          tables.push({
            title: currentSection.heading || 'Table',
            headers: tableHeaders,
            rows: tableRows,
          });
          inTable = false;
          tableHeaders = [];
          tableRows = [];
        }
      };

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (trimmed.includes('---')) continue;
          const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
          if (!inTable) {
            inTable = true;
            tableHeaders = cells;
            tableRows = [];
          } else {
            tableRows.push(cells);
          }
          currentSection.text += `${line}\n`;
          continue;
        } else if (inTable) {
          flushTable();
        }

        if (trimmed.startsWith('# ')) {
          title = trimmed.replace(/^#\s+/, '');
          if (currentSection.text.trim() || currentSection.heading !== title) {
            sections.push(currentSection);
          }
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading: title,
            level: 1,
            text: '',
          };
        } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
          sections.push(currentSection);
          const level = trimmed.match(/^#+/)?.[0].length || 2;
          const heading = trimmed.replace(/^#+\s+/, '');
          currentSection = {
            id: `sec-${sections.length + 1}`,
            heading,
            level,
            text: '',
          };
        } else {
          currentSection.text += `${line}\n`;
        }
      }

      flushTable();
      if (currentSection.text.trim() || sections.length === 0) {
        sections.push(currentSection);
      }

      const document: ParsedDocument = {
        title,
        mimeType: 'text/markdown',
        sourceType: 'markdown',
        text: text.trim(),
        sections,
        tables: tables.length > 0 ? tables : undefined,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          sectionCount: sections.length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse Markdown: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

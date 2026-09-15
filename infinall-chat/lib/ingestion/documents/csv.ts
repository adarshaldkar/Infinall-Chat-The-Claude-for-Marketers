// ============================================================
// Infinall Chat - CSV / TSV Document Parser Adapter
// RFC 4180-compliant streaming parser for tabular marketing data
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSheet, ParsedTable, ParsedSection } from '../types';

export class CsvDocumentParser implements DocumentParser {
  readonly name = 'csv-parser';
  readonly supportedTypes = ['csv' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'csv' || ext === 'tsv' || input.mimeType === 'text/csv' || input.mimeType === 'text/tab-separated-values';
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const ext = fileName.toLowerCase().split('.').pop();
      const delimiter = ext === 'tsv' ? '\t' : ',';
      const text = buffer.toString('utf-8');

      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }

      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
      }

      const headers = rows[0] || [];
      const dataRows = rows.slice(1);

      // Convert rows to semantic business records
      const semanticRecords = dataRows
        .slice(0, 1000)
        .map((r) => {
          const fields = headers
            .map((h, idx) => (r[idx] ? `${h}: ${r[idx]}` : ''))
            .filter(Boolean)
            .join(' | ');
          return fields ? `- [Record] ${fields}` : '';
        })
        .filter(Boolean)
        .join('\n');

      const cleanTitle = fileName.replace(/\.(csv|tsv)$/i, '').replace(/[_-]/g, ' ');
      const tableMarkdown = `# ${cleanTitle}\n\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${dataRows.slice(0, 20).map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n### Semantic Records:\n${semanticRecords}`;

      const sheet: ParsedSheet = {
        name: cleanTitle,
        headers,
        rows: dataRows,
        rowCount: dataRows.length,
      };

      const table: ParsedTable = {
        title: cleanTitle,
        headers,
        rows: dataRows,
      };

      const section: ParsedSection = {
        id: 'sec-1',
        heading: cleanTitle,
        level: 1,
        text: tableMarkdown,
      };

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: ext === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
        sourceType: 'csv',
        text: tableMarkdown,
        sections: [section],
        sheets: [sheet],
        tables: [table],
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          rowCount: dataRows.length,
          columnCount: headers.length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse CSV: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

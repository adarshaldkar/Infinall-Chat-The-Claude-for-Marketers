// ============================================================
// Infinall Chat - XLSX Spreadsheet Parser Adapter
// Extracts multi-sheet data and converts rows to semantic records
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSheet, ParsedTable, ParsedSection } from '../types';
import ExcelJS from 'exceljs';

export class XlsxDocumentParser implements DocumentParser {
  readonly name = 'xlsx-parser';
  readonly supportedTypes = ['xlsx' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'xlsx' || ext === 'xls' || input.mimeType.includes('spreadsheetml');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const sheets: ParsedSheet[] = [];
      const tables: ParsedTable[] = [];
      const sections: ParsedSection[] = [];
      let fullText = '';

      workbook.eachSheet((worksheet) => {
        const sheetName = worksheet.name;
        const rows: string[][] = [];
        let headers: string[] = [];

        worksheet.eachRow((row, rowNumber) => {
          const values: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell) => {
            let val = '';
            if (cell.value !== null && cell.value !== undefined) {
              if (typeof cell.value === 'object') {
                val = (cell.value as any).result?.toString() || (cell.value as any).text?.toString() || JSON.stringify(cell.value);
              } else {
                val = cell.value.toString();
              }
            }
            values.push(val.trim());
          });

          if (rowNumber === 1) {
            headers = values.filter(Boolean);
          } else if (values.some(Boolean)) {
            rows.push(values);
          }
        });

        sheets.push({
          name: sheetName,
          headers,
          rows,
          rowCount: rows.length,
        });

        tables.push({
          title: sheetName,
          headers,
          rows,
          sheetName,
        });

        // Convert tabular rows into semantic business records
        const semanticRecords = rows
          .slice(0, 500)
          .map((r) => {
            const fields = headers
              .map((h, idx) => (r[idx] ? `${h}: ${r[idx]}` : ''))
              .filter(Boolean)
              .join(' | ');
            return fields ? `- [Record] ${fields}` : '';
          })
          .filter(Boolean)
          .join('\n');

        const sheetMarkdown = `## Sheet: ${sheetName}\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.slice(0, 20).map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\n### Semantic Records:\n${semanticRecords}`;

        sections.push({
          id: `sheet-${sheetName}`,
          heading: `Sheet: ${sheetName}`,
          level: 2,
          text: sheetMarkdown,
          sheetName,
        });

        fullText += `${sheetMarkdown}\n\n`;
      });

      const cleanTitle = fileName.replace(/\.(xlsx|xls)$/i, '').replace(/[_-]/g, ' ');

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sourceType: 'xlsx',
        text: fullText.trim(),
        sections,
        sheets,
        tables,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          sheetCount: sheets.length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse XLSX: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

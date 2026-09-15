// ============================================================
// Spreadsheet Parser: CSV & Excel XLSX
// Supports multi-sheet tabular extraction with header context
// ============================================================

import ExcelJS from 'exceljs';
import { ParsedDocument, DocumentPage } from './types';

export async function parseSpreadsheet(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number,
  isCsv: boolean
): Promise<ParsedDocument> {
  try {
    const workbook = new ExcelJS.Workbook();
    const pages: DocumentPage[] = [];
    let fullText = '';

    if (isCsv) {
      const csvContent = buffer.toString('utf-8');
      const lines = csvContent.split(/\r?\n/).filter(Boolean);
      const headers = lines.length > 0 ? lines[0] : '';
      const sampleRows = lines.slice(0, 100);

      const tableText = sampleRows.join('\n');
      fullText = tableText;

      pages.push({
        pageNumber: 1,
        sectionTitle: `CSV: ${headers.slice(0, 60)}`,
        text: tableText,
      });
    } else {
      // XLSX workbook
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

      workbook.eachSheet((worksheet, sheetId) => {
        const sheetName = worksheet.name || `Sheet ${sheetId}`;
        const rowTexts: string[] = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber > 250) return; // Cap huge sheets for token efficiency
          const values = Array.isArray(row.values)
            ? row.values.slice(1).map(v => (v !== null && v !== undefined ? String(v).trim() : ''))
            : [];
          if (values.some(Boolean)) {
            rowTexts.push(values.join(' | '));
          }
        });

        const sheetText = `[Sheet: ${sheetName}]\n` + rowTexts.join('\n');
        pages.push({
          pageNumber: sheetId,
          sectionTitle: sheetName,
          text: sheetText,
        });

        fullText += (fullText ? '\n\n' : '') + sheetText;
      });
    }

    const title = fileName.replace(/\.[^/.]+$/, '');

    return {
      title,
      fullText,
      pages,
      metadata: {
        title,
        fileType: isCsv ? 'csv' : 'xlsx',
        fileSizeBytes,
        pageCount: pages.length || 1,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse spreadsheet '${fileName}': ${message}`);
  }
}

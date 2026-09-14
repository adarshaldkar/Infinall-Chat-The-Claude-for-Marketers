// ============================================================
// Infinall Chat - Native Multi-Sheet XLSX Excel Generator
// ============================================================

import ExcelJS from 'exceljs';
import { SpreadsheetWorkbookPayload } from '../types';

export class XlsxBuilder {
  static async buildWorkbook(
    payload: SpreadsheetWorkbookPayload | string
  ): Promise<Buffer> {
    let parsed: SpreadsheetWorkbookPayload;

    if (typeof payload === 'string') {
      try {
        parsed = JSON.parse(payload);
      } catch {
        // Fallback: parse markdown table into a single sheet
        parsed = this.parseMarkdownTableToSheet(payload);
      }
    } else {
      parsed = payload;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Infinall Marketing AI';
    workbook.created = new Date();

    const sheets = parsed.sheets && parsed.sheets.length > 0
      ? parsed.sheets
      : [
          {
            name: 'Data Sheet',
            headers: ['Item', 'Channel', 'Budget', 'Target CPA', 'Conversions'],
            rows: [
              ['Campaign 1', 'Meta Ads', 5000, 45, 111],
              ['Campaign 2', 'Google Search', 8000, 60, 133],
              ['Total', 'All', { formula: 'SUM(C2:C3)' }, 52.5, { formula: 'SUM(E2:E3)' }],
            ],
          },
        ];

    for (const sheetData of sheets) {
      const worksheet = workbook.addWorksheet(sheetData.name.slice(0, 31));

      // Header row styling
      if (sheetData.headers && sheetData.headers.length > 0) {
        const headerRow = worksheet.addRow(sheetData.headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' }, // Dark slate
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 28;
      }

      // Add data rows
      for (const row of sheetData.rows) {
        const formattedRow = row.map((cell) => {
          if (typeof cell === 'object' && cell !== null && 'formula' in cell) {
            return { formula: (cell as { formula: string }).formula };
          }
          return cell;
        });

        const addedRow = worksheet.addRow(formattedRow);
        addedRow.height = 22;

        // Apply cell formats & alignments
        addedRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          if (typeof cell.value === 'number') {
            // Apply currency format if column header implies money
            const header = sheetData.headers?.[colNumber - 1]?.toLowerCase() || '';
            if (
              header.includes('budget') ||
              header.includes('spend') ||
              header.includes('cost') ||
              header.includes('cpa') ||
              header.includes('cac') ||
              header.includes('revenue')
            ) {
              cell.numFmt = '$#,##0.00';
            } else if (header.includes('rate') || header.includes('roas') || header.includes('%')) {
              cell.numFmt = '0.00%';
            }
          }
        });
      }

      // Freeze header row
      worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

      // Auto-fit column widths
      worksheet.columns.forEach((column, index) => {
        let maxLen = sheetData.headers?.[index]?.length || 10;
        sheetData.rows.forEach((row) => {
          const val = row[index];
          if (val !== undefined && val !== null) {
            const strLen = String(val).length;
            if (strLen > maxLen) maxLen = strLen;
          }
        });
        column.width = Math.min(Math.max(maxLen + 4, 14), 40);
      });
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  private static parseMarkdownTableToSheet(md: string): SpreadsheetWorkbookPayload {
    const lines = md.split('\n').filter((l) => l.trim().startsWith('|'));
    if (lines.length < 2) {
      return {
        sheets: [
          {
            name: 'Summary',
            headers: ['Col 1', 'Col 2'],
            rows: [['Data A', 'Data B']],
          },
        ],
      };
    }

    const headers = lines[0]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    // Skip separator row (line index 1)
    const rows: Array<Array<string | number>> = [];
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i]
        .split('|')
        .slice(1, -1)
        .map((c) => {
          const trimmed = c.trim();
          const num = Number(trimmed.replace(/[$,%]/g, ''));
          return !isNaN(num) && trimmed !== '' ? num : trimmed;
        });
      if (cells.length > 0) rows.push(cells);
    }

    return {
      sheets: [
        {
          name: 'Marketing Plan',
          headers,
          rows,
        },
      ],
    };
  }
}

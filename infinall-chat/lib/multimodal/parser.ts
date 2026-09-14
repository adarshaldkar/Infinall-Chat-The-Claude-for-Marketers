// ============================================================
// Infinall Chat - Real Document Parser (PDF / DOCX / CSV)
// - PDF: extracted via pdf-parse (real text extraction)
// - DOCX: extracted via mammoth (Word document to plaintext)
// - CSV: RFC 4180-compliant parser (handles quoted commas, newlines)
// ============================================================

import { DocumentParseResult } from './types';

export class MultimodalDocumentParser {
  /**
   * Parse document content from buffer.
   * Supports: CSV (real RFC 4180), PDF (real text extraction), DOCX (real Word extraction).
   */
  static async parseDocument(
    fileName: string,
    fileBuffer: Buffer | string
  ): Promise<DocumentParseResult> {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (ext === 'csv' || ext === 'tsv') {
      return parseCSV(fileName, fileBuffer, ext === 'tsv' ? '\t' : ',');
    }

    if (ext === 'pdf') {
      return parsePDF(fileName, fileBuffer);
    }

    if (ext === 'docx' || ext === 'doc') {
      return parseDOCX(fileName, fileBuffer);
    }

    if (ext === 'json') {
      return parseJSON(fileName, fileBuffer);
    }

    if (ext === 'md' || ext === 'txt') {
      const text = typeof fileBuffer === 'string' ? fileBuffer : fileBuffer.toString('utf-8');
      return {
        title: fileName,
        rawText: text,
        tables: [],
      };
    }

    // Unknown format
    return {
      title: fileName,
      rawText: `[Unsupported file format: .${ext}. Supported: CSV, PDF, DOCX, JSON, MD, TXT]`,
      tables: [],
    };
  }
}

/**
 * RFC 4180-compliant CSV parser. Handles quoted fields, commas inside quotes, and escaped quotes.
 */
function parseCSV(
  fileName: string,
  content: Buffer | string,
  delimiter = ','
): DocumentParseResult {
  const text = typeof content === 'string' ? content : content.toString('utf-8');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead for escaped quote
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++; // skip \r in CRLF
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (ch !== '\r') {
        currentField += ch;
      }
    }
    i++;
  }

  // Final field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== '')) rows.push(currentRow);
  }

  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1);

  return {
    title: fileName,
    rawText: text,
    tables: [
      {
        title: `${fileName} — ${dataRows.length} rows`,
        headers,
        rows: dataRows,
      },
    ],
  };
}

/**
 * Real PDF text extraction using pdf-parse library.
 */
async function parsePDF(
  fileName: string,
  content: Buffer | string
): Promise<DocumentParseResult> {
  try {
    // Dynamic import — pdf-parse is CJS, use require() via createRequire for Next.js compat
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
    const buffer = typeof content === 'string' ? Buffer.from(content, 'base64') : content;
    const result = await pdfParse(buffer);

    const rawText = result.text || '';
    const pageCount = result.numpages;

    // Extract tables from structured text (heuristic: rows where cells are tab/space aligned)
    const tables = extractTablesFromText(rawText);

    return {
      title: fileName,
      pageCount,
      rawText: rawText.slice(0, 50_000), // truncate very long docs
      tables,
    };
  } catch (err) {
    console.error('[DocParser] PDF parsing failed:', err);
    return {
      title: fileName,
      rawText: `[PDF parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please ensure the file is a valid, non-encrypted PDF.]`,
      tables: [],
    };
  }
}

/**
 * Real DOCX text extraction using mammoth library.
 */
async function parseDOCX(
  fileName: string,
  content: Buffer | string
): Promise<DocumentParseResult> {
  try {
    const mammoth = await import('mammoth');
    const buffer = typeof content === 'string' ? Buffer.from(content, 'base64') : content;
    const result = await mammoth.extractRawText({ buffer });

    const rawText = result.value || '';
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message);

    const tables = extractTablesFromText(rawText);

    return {
      title: fileName,
      rawText: rawText.slice(0, 50_000),
      tables,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (err) {
    console.error('[DocParser] DOCX parsing failed:', err);
    return {
      title: fileName,
      rawText: `[DOCX parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please ensure the file is a valid .docx file.]`,
      tables: [],
    };
  }
}

/**
 * JSON document parser.
 */
function parseJSON(
  fileName: string,
  content: Buffer | string
): DocumentParseResult {
  const text = typeof content === 'string' ? content : content.toString('utf-8');
  try {
    const parsed = JSON.parse(text);
    const rows: string[][] = [];
    let headers: string[] = [];

    // If JSON is an array of objects, render as table
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      headers = Object.keys(parsed[0]);
      for (const item of parsed) {
        rows.push(headers.map((h) => String(item[h] ?? '')));
      }
    }

    return {
      title: fileName,
      rawText: text.slice(0, 50_000),
      tables: rows.length > 0 ? [{ title: `${fileName} — JSON Table`, headers, rows }] : [],
    };
  } catch {
    return {
      title: fileName,
      rawText: `[Invalid JSON in ${fileName}]`,
      tables: [],
    };
  }
}

/**
 * Heuristic table extractor from plaintext.
 * Finds lines that look like they have consistent column structure.
 */
function extractTablesFromText(
  text: string
): Array<{ title: string; headers: string[]; rows: string[][] }> {
  const tables: Array<{ title: string; headers: string[]; rows: string[][] }> = [];
  const lines = text.split('\n');
  let inTable = false;
  let tableLines: string[] = [];
  let tableStartIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Tab-delimited or pipe-delimited line heuristic
    const hasTabs = line.includes('\t') && line.split('\t').length >= 2;
    const hasPipes = line.includes('|') && line.split('|').length >= 3;

    if (hasTabs || hasPipes) {
      if (!inTable) {
        inTable = true;
        tableStartIdx = i;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (inTable && tableLines.length >= 3) {
        const delimiter = tableLines[0].includes('\t') ? '\t' : '|';
        const parsed = tableLines
          .filter((l) => !l.match(/^[\s|-]+$/)) // skip separator lines
          .map((l) => l.split(delimiter).map((c) => c.trim()).filter((c) => c !== ''));
        if (parsed.length >= 2 && parsed[0].length >= 2) {
          tables.push({
            title: `Table at line ${tableStartIdx + 1}`,
            headers: parsed[0],
            rows: parsed.slice(1),
          });
        }
      }
      inTable = false;
      tableLines = [];
    }
  }

  return tables;
}

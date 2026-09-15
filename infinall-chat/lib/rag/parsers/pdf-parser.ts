// ============================================================
// PDF Document Parser (Binary extraction using PDFParse v2)
// ============================================================

import { ParsedDocument, DocumentPage } from './types';

export async function parsePdf(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number
): Promise<ParsedDocument> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parserInstance = new PDFParse({ data: buffer });
    const result = await parserInstance.getText();

    const fullText = (result.text || '').trim();
    const pages: DocumentPage[] = [];

    if (result.pages && Array.isArray(result.pages)) {
      result.pages.forEach((p: { text: string; num: number }) => {
        const clean = (p.text || '').trim();
        const lines = clean.split('\n').filter(Boolean);
        const sectionTitle = lines.length > 0 ? lines[0].slice(0, 80) : `Page ${p.num}`;
        pages.push({
          pageNumber: p.num,
          text: clean || `[Page ${p.num}]`,
          sectionTitle,
        });
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        text: fullText || `[Empty or unreadable PDF: ${fileName}]`,
        sectionTitle: fileName.replace(/\.[^/.]+$/, ''),
      });
    }

    const title = fileName.replace(/\.[^/.]+$/, '');

    return {
      title,
      fullText,
      pages,
      metadata: {
        title,
        fileType: 'pdf',
        fileSizeBytes,
        pageCount: result.total || pages.length,
      },
    };
  } catch (err: unknown) {
    // Fallback: raw stream text extraction
    console.warn(`[PDFParser] Primary parser failed for ${fileName}, attempting stream extraction:`, err);
    const rawContent = buffer.toString('utf-8');
    const matches: string[] = [];
    const streamRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = streamRegex.exec(rawContent)) !== null) {
      const textSnippets = match[0].match(/\((.*?)\)/g);
      if (textSnippets) {
        matches.push(textSnippets.map(s => s.slice(1, -1)).join(' '));
      }
    }

    const extracted = matches.join('\n').trim() || `[PDF: ${fileName}]`;
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      fullText: extracted,
      pages: [{ pageNumber: 1, text: extracted, sectionTitle: 'Page 1' }],
      metadata: {
        title: fileName.replace(/\.[^/.]+$/, ''),
        fileType: 'pdf',
        fileSizeBytes,
        pageCount: 1,
      },
    };
  }
}
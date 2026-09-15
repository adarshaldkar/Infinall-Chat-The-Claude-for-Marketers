// ============================================================
// Text & Markdown Parser (.md, .txt, .json, .html)
// Preserves headings, code blocks, and markdown structure
// ============================================================

import { ParsedDocument, DocumentPage } from './types';

export function parseTextDocument(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number,
  extension: string
): ParsedDocument {
  const content = buffer.toString('utf-8');
  const pages: DocumentPage[] = [];

  const title = fileName.replace(/\.[^/.]+$/, '');

  if (extension === 'md') {
    // Split by Markdown Level 1 or 2 headings (# Title or ## Section)
    const sections = content.split(/(?=(?:^|\n)#{1,2}\s+)/g);
    let pageNum = 1;

    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;

      const firstLine = trimmed.split('\n')[0] || '';
      const heading = firstLine.replace(/^#+\s*/, '').trim();

      pages.push({
        pageNumber: pageNum++,
        sectionTitle: heading || `Section ${pageNum}`,
        text: trimmed,
      });
    }
  }

  // If not markdown or no headings found, split by logical paragraphs
  if (pages.length === 0) {
    const paragraphs = content.split(/\n{3,}/);
    paragraphs.forEach((p, idx) => {
      const trimmed = p.trim();
      if (trimmed) {
        pages.push({
          pageNumber: idx + 1,
          sectionTitle: `Page ${idx + 1}`,
          text: trimmed,
        });
      }
    });
  }

  if (pages.length === 0) {
    pages.push({
      pageNumber: 1,
      sectionTitle: title,
      text: content,
    });
  }

  return {
    title,
    fullText: content,
    pages,
    metadata: {
      title,
      fileType: extension,
      fileSizeBytes,
      pageCount: pages.length,
    },
  };
}

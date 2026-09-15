// ============================================================
// Word DOCX & DOC Parser (Using mammoth for binary OpenXML)
// ============================================================

import mammoth from 'mammoth';
import { ParsedDocument, DocumentPage } from './types';

export async function parseDocx(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number
): Promise<ParsedDocument> {
  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    const fullText = (rawResult.value || '').trim();

    // Split paragraphs / page markers into logical sections
    const paragraphs = fullText.split(/\n{2,}/);
    const pages: DocumentPage[] = [];

    let currentPageText = '';
    let currentPageIndex = 1;
    let currentSectionTitle: string | undefined;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (!currentSectionTitle && trimmed.length < 100) {
        currentSectionTitle = trimmed;
      }

      currentPageText += (currentPageText ? '\n\n' : '') + trimmed;

      // Group roughly ~400 words (~500 tokens) per page representation
      if (currentPageText.split(/\s+/).length >= 400) {
        pages.push({
          pageNumber: currentPageIndex++,
          text: currentPageText,
          sectionTitle: currentSectionTitle,
        });
        currentPageText = '';
        currentSectionTitle = undefined;
      }
    }

    if (currentPageText) {
      pages.push({
        pageNumber: currentPageIndex,
        text: currentPageText,
        sectionTitle: currentSectionTitle,
      });
    }

    const title = fileName.replace(/\.[^/.]+$/, '');

    return {
      title,
      fullText,
      pages,
      metadata: {
        title,
        fileType: 'docx',
        fileSizeBytes,
        pageCount: Math.max(pages.length, 1),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse DOCX document '${fileName}': ${message}`);
  }
}

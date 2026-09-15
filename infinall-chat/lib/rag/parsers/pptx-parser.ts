// ============================================================
// PowerPoint PPTX & PPT Presentation Parser
// Extracts slide titles and text from OpenXML ZIP structure
// ============================================================

import JSZip from 'jszip';
import { ParsedDocument, DocumentPage } from './types';

export async function parsePptx(
  buffer: Buffer,
  fileName: string,
  fileSizeBytes: number
): Promise<ParsedDocument> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const slideNames = Object.keys(zip.files)
      .filter(
        (name) =>
          name.startsWith('ppt/slides/slide') &&
          name.endsWith('.xml') &&
          !zip.files[name].dir
      )
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    const pages: DocumentPage[] = [];
    let fullText = '';

    for (let idx = 0; idx < slideNames.length; idx++) {
      const slideXml = await zip.files[slideNames[idx]].async('string');
      // Extract all text within <a:t>...</a:t> tags
      const textMatches: string[] = [];
      const regex = /<a:t(?:\s+[^>]*)?>([^<]+)<\/a:t>/gi;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(slideXml)) !== null) {
        if (match[1] && match[1].trim()) {
          textMatches.push(match[1].trim());
        }
      }

      if (textMatches.length > 0) {
        const slideTitle = textMatches[0];
        const slideContent = textMatches.join('\n');
        const pageNum = idx + 1;

        pages.push({
          pageNumber: pageNum,
          sectionTitle: `Slide ${pageNum}: ${slideTitle.slice(0, 60)}`,
          text: slideContent,
        });

        fullText += (fullText ? '\n\n' : '') + `[Slide ${pageNum}: ${slideTitle}]\n` + slideContent;
      }
    }

    if (pages.length === 0) {
      fullText = `Presentation: ${fileName}`;
      pages.push({
        pageNumber: 1,
        sectionTitle: 'Slide 1',
        text: fullText,
      });
    }

    const title = fileName.replace(/\.[^/.]+$/, '');

    return {
      title,
      fullText,
      pages,
      metadata: {
        title,
        fileType: 'pptx',
        fileSizeBytes,
        pageCount: pages.length,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse PowerPoint document '${fileName}': ${message}`);
  }
}
// ============================================================
// Infinall Chat - PPTX Presentation Parser Adapter
// Extracts slide-by-slide text, titles, speaker notes & visuals
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSlide, ParsedSection } from '../types';
import JSZip from 'jszip';

export class PptxDocumentParser implements DocumentParser {
  readonly name = 'pptx-parser';
  readonly supportedTypes = ['pptx' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return ext === 'pptx' || ext === 'ppt' || input.mimeType.includes('presentationml');
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, sizeBytes } = input;
      const zip = await JSZip.loadAsync(buffer);

      const slides: ParsedSlide[] = [];
      const sections: ParsedSection[] = [];
      let fullText = '';

      // Find all slide XML files (ppt/slides/slide1.xml, etc.)
      const slideFileNames = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''), 10);
          const numB = parseInt(b.replace(/\D/g, ''), 10);
          return numA - numB;
        });

      for (let idx = 0; idx < slideFileNames.length; idx++) {
        const slideName = slideFileNames[idx];
        const slideXml = await zip.files[slideName].async('text');

        // Extract all text elements: <a:t>text</a:t>
        const textMatches = slideXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
        const textLines = textMatches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean);

        const slideTitle = textLines[0] || `Slide ${idx + 1}`;
        const slideBody = textLines.slice(1).join('\n');
        const slideFull = textLines.join('\n');

        // Check if there are speaker notes (ppt/notesSlides/notesSlide1.xml)
        let speakerNotes = '';
        const notesName = `ppt/notesSlides/notesSlide${idx + 1}.xml`;
        if (zip.files[notesName]) {
          const notesXml = await zip.files[notesName].async('text');
          const noteMatches = notesXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
          speakerNotes = noteMatches.map((m) => m.replace(/<[^>]+>/g, '').trim()).join(' ');
        }

        slides.push({
          slideNumber: idx + 1,
          title: slideTitle,
          text: slideFull,
          speakerNotes: speakerNotes || undefined,
        });

        sections.push({
          id: `slide-${idx + 1}`,
          heading: `Slide ${idx + 1}: ${slideTitle}`,
          level: 2,
          text: slideBody ? `${slideTitle}\n${slideBody}` : slideTitle,
          slideNumber: idx + 1,
        });

        fullText += `### Slide ${idx + 1}: ${slideTitle}\n${slideBody}\n\n`;
      }

      const cleanTitle = fileName.replace(/\.(pptx|ppt)$/i, '').replace(/[_-]/g, ' ');

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceType: 'pptx',
        text: fullText.trim(),
        sections,
        slides,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          slideCount: slides.length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'CORRUPT_FILE',
        message: `Failed to parse PPTX: ${err instanceof Error ? err.message : String(err)}`,
        retryable: false,
      };
    }
  }
}

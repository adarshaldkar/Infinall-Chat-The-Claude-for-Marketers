// ============================================================
// Infinall Chat - Image Media Ingestion Adapter
// Converts image creative vision audits into canonical ParsedDocument
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument } from '../types';
import { MultimodalGateway } from '@/lib/multimodal/gateway';

export class ImageMediaParser implements DocumentParser {
  readonly name = 'image-media-parser';
  readonly supportedTypes = ['image' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return (
      input.mimeType.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext || '')
    );
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, mimeType, sizeBytes } = input;
      const base64Data = buffer.toString('base64');

      const analysis = await MultimodalGateway.analyzeImage({
        fileName,
        mimeType,
        base64Data,
      });

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

      const formattedMarkdown = `# Creative Asset: ${cleanTitle}\n\n` +
        `### Visual Summary\n${analysis.summary}\n\n` +
        `### Creative Performance Audit\n` +
        `- **Headline / Hook Score:** ${analysis.headlineHookScore ?? 'N/A'}/10\n` +
        `- **Visual Contrast Score:** ${analysis.visualContrastScore ?? 'N/A'}/10\n` +
        `- **CTA Prominence Score:** ${analysis.ctaProminenceScore ?? 'N/A'}/10\n` +
        `- **Primary Focal Point:** ${analysis.primaryFocalPoint ?? 'N/A'}\n` +
        `- **Detected Visual Elements:** ${analysis.detectedText ?? 'N/A'}\n\n` +
        `### Actionable Recommendations\n` +
        (analysis.recommendations || []).map((r) => `- ${r}`).join('\n');

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType,
        sourceType: 'image',
        text: formattedMarkdown,
        sections: [
          {
            id: 'sec-1',
            heading: cleanTitle,
            level: 1,
            text: formattedMarkdown,
          },
        ],
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          hookScore: analysis.headlineHookScore,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: `Failed to analyze image: ${err instanceof Error ? err.message : String(err)}`,
        retryable: true,
      };
    }
  }
}

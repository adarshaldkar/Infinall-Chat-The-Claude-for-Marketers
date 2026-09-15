// ============================================================
// Infinall Chat - Audio Media Ingestion Adapter
// Converts speech audio into transcript & marketing signals
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection } from '../types';
import { transcribeAudio } from '@/lib/multimodal/audio';

export class AudioMediaParser implements DocumentParser {
  readonly name = 'audio-media-parser';
  readonly supportedTypes = ['audio' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return (
      input.mimeType.startsWith('audio/') ||
      ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext || '')
    );
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, mimeType, sizeBytes } = input;
      const audioResult = await transcribeAudio(fileName, buffer, mimeType);

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const sections: ParsedSection[] = [];

      let fullMarkdown = `# Audio Recording: ${cleanTitle}\n\n`;

      if (audioResult.marketingInsights) {
        fullMarkdown += `### Marketing Signals & Customer Intelligence\n` +
          `- **Buying Intent:** **${audioResult.marketingInsights.buyingIntent}**\n` +
          `- **Pain Points:** ${audioResult.marketingInsights.painPoints.join('; ')}\n` +
          `- **Key Objections:** ${audioResult.marketingInsights.objections.join('; ')}\n` +
          `- **Competitor Mentions:** ${audioResult.marketingInsights.competitorMentions.join(', ') || 'None'}\n\n`;
      }

      fullMarkdown += `### Full Transcript\n`;

      if (audioResult.speakers && audioResult.speakers.length > 0) {
        audioResult.speakers.forEach((s, idx) => {
          const entry = `[${s.timestamp}] **${s.speaker}:** ${s.text}\n`;
          fullMarkdown += entry;
          sections.push({
            id: `speech-${idx + 1}`,
            heading: `${s.speaker} (${s.timestamp})`,
            level: 3,
            text: entry,
          });
        });
      } else {
        fullMarkdown += audioResult.transcript || '[No audible speech detected]';
        sections.push({
          id: 'sec-1',
          heading: cleanTitle,
          level: 1,
          text: fullMarkdown,
        });
      }

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType,
        sourceType: 'audio',
        text: fullMarkdown.trim(),
        sections,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          durationSeconds: audioResult.durationSeconds,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: `Failed to transcribe audio: ${err instanceof Error ? err.message : String(err)}`,
        retryable: true,
      };
    }
  }
}

// ============================================================
// Infinall Chat - Video Media Ingestion Adapter
// Converts video scene analyses and transcripts into canonical ParsedDocument
// ============================================================

import { DocumentParser, ParserInput, ParseResult, ParsedDocument, ParsedSection } from '../types';
import { MultimodalGateway } from '@/lib/multimodal/gateway';

export class VideoMediaParser implements DocumentParser {
  readonly name = 'video-media-parser';
  readonly supportedTypes = ['video' as const];

  supports(input: ParserInput): boolean {
    const ext = input.fileName.toLowerCase().split('.').pop();
    return (
      input.mimeType.startsWith('video/') ||
      ['mp4', 'webm', 'mov', 'mkv', 'avi', 'ogg'].includes(ext || '')
    );
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { fileName, buffer, mimeType, sizeBytes } = input;

      const analysis = await MultimodalGateway.analyzeVideo({
        fileName,
        mimeType,
        buffer,
      });

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      const sections: ParsedSection[] = [];

      let fullMarkdown = `# Video Asset: ${cleanTitle}\n\n` +
        `### Overview & Duration\n` +
        `- **Duration:** ${Math.round(analysis.durationSeconds)} seconds\n` +
        `- **Summary:** ${analysis.summary}\n` +
        `- **Hook Strength Score:** ${analysis.marketingSignals?.hookStrengthScore ?? 'N/A'}/10\n` +
        `- **CTA Timestamp:** ${analysis.marketingSignals?.ctaTimestamp ? `${Math.floor(analysis.marketingSignals.ctaTimestamp / 60)}:${analysis.marketingSignals.ctaTimestamp % 60 < 10 ? '0' : ''}${analysis.marketingSignals.ctaTimestamp % 60}` : 'N/A'}\n\n` +
        `### Scene Breakdown & Timestamps\n`;

      analysis.scenes.forEach((scene, idx) => {
        const startMin = Math.floor(scene.startSeconds / 60);
        const startSec = scene.startSeconds % 60;
        const tsLabel = `${startMin < 10 ? '0' : ''}${startMin}:${startSec < 10 ? '0' : ''}${startSec}`;

        const sceneMd = `#### [▶ ${tsLabel}] ${scene.title}\n${scene.description}\n\n`;
        fullMarkdown += sceneMd;

        sections.push({
          id: `scene-${idx + 1}`,
          heading: `[${tsLabel}] ${scene.title}`,
          level: 3,
          text: sceneMd,
        });
      });

      if (analysis.transcript && analysis.transcript.length > 0) {
        fullMarkdown += `### Full Transcript\n`;
        analysis.transcript.forEach((t) => {
          const m = Math.floor(t.startSeconds / 60);
          const s = t.startSeconds % 60;
          const ts = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
          fullMarkdown += `[${ts}] ${t.speaker ? `**${t.speaker}:** ` : ''}${t.text}\n`;
        });
      }

      const document: ParsedDocument = {
        title: cleanTitle,
        mimeType,
        sourceType: 'video',
        text: fullMarkdown.trim(),
        sections,
        metadata: {
          fileName,
          fileSizeBytes: sizeBytes,
          durationSeconds: analysis.durationSeconds,
          sceneCount: analysis.scenes.length,
          parsedAt: new Date().toISOString(),
          parserName: this.name,
        },
      };

      return { ok: true, document };
    } catch (err) {
      return {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: `Failed to analyze video: ${err instanceof Error ? err.message : String(err)}`,
        retryable: true,
      };
    }
  }
}

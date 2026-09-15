// ============================================================
// Infinall Chat - Unified Multimodal Model Gateway
// Direct Visual & Video Comprehension with Timestamp Citations
// ============================================================

import {
  VisualAnalysis,
  VideoAnalysis,
  TimestampCitation,
  TranscriptSegment,
  VideoScene,
} from './types';
import { VideoProcessor } from './video';
import { CreativeVisionAnalyzer } from './vision';

export interface ImageAnalysisInput {
  fileName: string;
  mimeType: string;
  base64Data?: string;
  url?: string;
  userPrompt?: string;
}

export interface VideoAnalysisInput {
  fileName: string;
  mimeType: string;
  buffer?: Buffer;
  url?: string;
  userPrompt?: string;
}

export class MultimodalGateway {
  /**
   * Run immediate visual understanding on an image asset.
   */
  static async analyzeImage(input: ImageAnalysisInput): Promise<VisualAnalysis> {
    const { fileName, mimeType, base64Data } = input;
    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9.+_-]+;base64,/, '');
      return CreativeVisionAnalyzer.auditCreativeImage(fileName, mimeType, cleanBase64);
    }

    // No image data available — return honest unavailable response.
    // Do NOT fabricate scores or recommendations.
    return {
      summary: `Image "${fileName}" uploaded but not available for analysis (no base64 data).`,
      headlineHookScore: 0,
      visualContrastScore: 0,
      ctaProminenceScore: 0,
      primaryFocalPoint: '',
      detectedText: '',
      complianceRisks: [],
      recommendations: [],
      available: false,
    };
  }

  /**
   * Run direct video understanding and generate scene breakdown with timestamp citations.
   */
  static async analyzeVideo(input: VideoAnalysisInput): Promise<VideoAnalysis> {
    const { fileName, mimeType, buffer, url } = input;

    let transcript: TranscriptSegment[] = [];
    let scenes: VideoScene[] = [];
    let durationSeconds = 60;

    if (buffer) {
      const processed = await VideoProcessor.processVideoMedia(fileName, buffer, mimeType);
      durationSeconds = processed.metadata.durationSeconds;
      transcript = processed.transcript;
      scenes = processed.scenes;
    } else {
      // Default fallback scenes
      durationSeconds = 90;
      scenes = [
        {
          id: 'scene-1',
          startSeconds: 0,
          endSeconds: 15,
          title: 'Opening Hook & Problem Statement',
          description: 'High energy intro addressing the primary marketing challenge.',
        },
        {
          id: 'scene-2',
          startSeconds: 16,
          endSeconds: 65,
          title: 'Core Value Demonstration',
          description: 'Detailed platform workflow and differentiator breakdown.',
        },
        {
          id: 'scene-3',
          startSeconds: 66,
          endSeconds: 90,
          title: 'Call to Action & Final Offer',
          description: 'Clear pricing terms, guarantee, and end-card link.',
        },
      ];
    }

    // Build structured timestamp citations for interactive seeking
    const citations: TimestampCitation[] = scenes.map((sc, idx) => ({
      id: `cite-${idx + 1}`,
      startSeconds: sc.startSeconds,
      endSeconds: sc.endSeconds,
      label: formatTimestamp(sc.startSeconds),
      videoUrl: url,
      snippet: `${sc.title}: ${sc.description.slice(0, 80)}`,
    }));

    // Determine if real analysis was performed (buffer provided and processed)
    const wasReallyAnalyzed = !!buffer && transcript.length > 0;

    const summary = wasReallyAnalyzed
      ? `Video analysis for "${fileName}" (${Math.round(durationSeconds)}s). ${scenes.length} scene segments with timestamp citations.`
      : `Video "${fileName}" uploaded (${Math.round(durationSeconds)}s estimated). Real-time scene analysis requires a vision-capable model. Timestamps are estimates only.`;

    return {
      summary,
      durationSeconds,
      transcript,
      scenes,
      citations,
      // Only emit marketing signals when real analysis occurred
      marketingSignals: wasReallyAnalyzed ? {
        hookStrengthScore: 0, // Requires real frame analysis
        pacingScore: 0,       // Requires real scene analysis
        ctaTimestamp: scenes[scenes.length - 1]?.startSeconds || Math.max(0, durationSeconds - 15),
        keyTakeaways: scenes.map((s) => `${formatTimestamp(s.startSeconds)} - ${s.title}`),
        objectionsAddressed: [], // Cannot be inferred without real content analysis
      } : undefined,
      available: wasReallyAnalyzed,
    };
  }
}

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

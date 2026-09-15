// ============================================================
// Infinall Chat - Video Intelligence Pipeline
// Async marketing video processing: scene breakdown, hook grading & CTA timing
// ============================================================

import { VideoProcessor, VideoMetadata, formatTimestamp } from './video';
import { VideoScene, VideoAnalysis } from './types';

export interface VideoPipelineReport {
  fileName: string;
  metadata: VideoMetadata;
  scenes: VideoScene[];
  analysis: VideoAnalysis;
  hookGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  hookFeedback: string;
  ctaGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  ctaFeedback: string;
  pacingSummary: string;
}

export async function processMarketingVideo(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<VideoPipelineReport> {
  const { metadata, transcript, scenes, analysis } = await VideoProcessor.processVideoMedia(
    fileName,
    buffer,
    mimeType
  );

  // 1. Hook Analysis (First 3 seconds)
  const hookScene = scenes[0];
  let hookGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  let hookFeedback = 'Strong opening scene visually engaged within the first 3 seconds.';

  if (hookScene) {
    if (hookScene.keyVisuals?.includes('person') || hookScene.keyVisuals?.includes('product-ui')) {
      hookGrade = 'A';
      hookFeedback = 'High retention hook: Immediate on-screen human or product demonstration detected in the opening 3 seconds.';
    } else if (scenes.length === 1) {
      hookGrade = 'C';
      hookFeedback = 'Static hook: Consider adding dynamic movement or problem framing in the opening 3 seconds.';
    }
  }

  // 2. CTA Timing Analysis
  const ctaScene = scenes.find((s) =>
    s.title.toLowerCase().includes('cta') ||
    s.title.toLowerCase().includes('call to action') ||
    s.description.toLowerCase().includes('call to action')
  );

  let ctaGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  let ctaFeedback = 'Call to action presented cleanly in the closing scene.';

  if (ctaScene) {
    const ctaPercent = ctaScene.startSeconds / (metadata.durationSeconds || 30);
    if (ctaPercent >= 0.75) {
      ctaGrade = 'A';
      ctaFeedback = `Optimal CTA placement: Appears at ${formatTimestamp(ctaScene.startSeconds)} (${Math.round(ctaPercent * 100)}% of video), allowing strong narrative buildup.`;
    } else {
      ctaGrade = 'C';
      ctaFeedback = `Premature CTA: Appears at ${formatTimestamp(ctaScene.startSeconds)} before full value proposition is established.`;
    }
  } else {
    ctaGrade = 'D';
    ctaFeedback = 'No clear visual or auditory CTA detected. Recommend adding a high-contrast end-card button.';
  }

  // 3. Pacing Summary
  const sceneCount = scenes.length;
  const avgSceneSecs = metadata.durationSeconds / Math.max(1, sceneCount);
  const pacingSummary = `${sceneCount} distinct visual scenes detected averaging ${Math.round(avgSceneSecs)}s per scene. ${
    avgSceneSecs <= 6 ? 'Fast, highly engaging short-form pacing.' : 'Moderate pacing suitable for in-depth B2B product demos.'
  }`;

  return {
    fileName,
    metadata,
    scenes,
    analysis,
    hookGrade,
    hookFeedback,
    ctaGrade,
    ctaFeedback,
    pacingSummary,
  };
}

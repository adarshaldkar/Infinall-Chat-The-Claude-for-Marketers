// ============================================================
// Infinall Chat - Ad Creative & Landing Page Vision Analyzer
// Uses real vision-capable LLM (Claude Sonnet) to analyze images.
// NEVER fabricates scores: if no image data, no credential, or the
// model call fails, it returns available=false with the reason.
// ============================================================

import { VisionAuditResult } from './types';

const VISION_SYSTEM_PROMPT = `You are an expert direct-response ad creative auditor and landing page conversion specialist.

Analyze the provided image and return a structured JSON audit with EXACTLY this schema:
{
  "headlineHookScore": <number 1-10, how scroll-stopping the primary headline is>,
  "visualContrastScore": <number 1-10, foreground/background contrast and visual hierarchy>,
  "ctaProminenceScore": <number 1-10, how visible and compelling the CTA is>,
  "primaryFocalPoint": "<string: where the eye goes first>",
  "detectedText": "<string: primary headline or text visible in the image>",
  "complianceRisks": ["<any claim that needs substantiation or may violate ad policies>"],
  "recommendations": [
    "<specific, actionable improvement 1>",
    "<specific, actionable improvement 2>",
    "<specific, actionable improvement 3>"
  ]
}

Be direct and data-driven. Base scores on real creative best practices:
- Hook score: Does the first 3 seconds stop the scroll? Is it contrarian, curiosity-driven, or problem-aware?
- Visual contrast: Is there a clear visual hierarchy? Can it be read on a mobile screen quickly?
- CTA prominence: Is there an obvious next step? Is the button above the fold?
Respond ONLY with the JSON object — no preamble.`;

export class CreativeVisionAnalyzer {
  /**
   * Analyze ad creative or landing page image via real vision model.
   * Accepts base64-encoded image data.
   * Returns available=false (never fabricated scores) when analysis is impossible.
   */
  static async auditCreativeImage(
    fileName: string,
    mimeType: string,
    base64Data?: string
  ): Promise<VisionAuditResult> {
    if (!base64Data || base64Data.length <= 100) {
      return unavailable(`No image data provided for "${fileName}". Upload an actual image to run real vision analysis.`);
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(base64Data, 'base64');
    } catch {
      return unavailable(`Invalid base64 encoding in image data for "${fileName}".`);
    }

    // Validate magic bytes for supported image formats (PNG, JPEG, GIF, WebP)
    const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isGif = buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    const isWebp =
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP';

    if (!isPng && !isJpeg && !isGif && !isWebp) {
      return unavailable(
        `Invalid or corrupted image format for "${fileName}". Expected valid PNG, JPEG, GIF, or WebP binary.`
      );
    }

    if (!process.env.LLM_GATEWAY_API_KEY) {
      return unavailable('Vision model is not configured: set LLM_GATEWAY_API_KEY (and optionally LLM_GATEWAY_BASE_URL).');
    }

    try {
      const result = await analyzeWithVisionModel(fileName, mimeType, base64Data);
      return { ...result, available: true };
    } catch (err) {
      console.warn('[VisionAnalyzer] Model call unavailable:', err instanceof Error ? err.message : String(err));
      return unavailable(
        `Vision model call failed: ${err instanceof Error ? err.message : String(err)}. ` +
          'No scores fabricated — configure a reachable vision-capable model and retry.'
      );
    }
  }
}

function unavailable(unavailableReason: string): VisionAuditResult {
  return {
    headlineHookScore: 0,
    visualContrastScore: 0,
    ctaProminenceScore: 0,
    primaryFocalPoint: 'N/A',
    detectedText: 'N/A',
    complianceRisks: [],
    recommendations: [],
    available: false,
    unavailableReason,
  };
}

/**
 * Calls the real vision-capable LLM with the image as a content block.
 */
async function analyzeWithVisionModel(
  fileName: string,
  mimeType: string,
  base64Data: string
): Promise<VisionAuditResult> {
  const apiKey = process.env.LLM_GATEWAY_API_KEY!;
  const base = process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in';

  // Validate mime type is a supported image format
  const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const effectiveMime = validMimes.includes(mimeType) ? mimeType : 'image/jpeg';

  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', // vision-capable model
      max_tokens: 1024,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: effectiveMime,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Analyze this ad creative or landing page: "${fileName}". Return the JSON audit.`,
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision model request failed ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const rawText: string = data.content?.[0]?.text ?? '';
  const clean = rawText.replace(/```json\n?|```/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Vision model returned non-JSON: ${clean.slice(0, 200)}`);
  }

  const result = parsed as VisionAuditResult;

  // Validate required fields
  if (typeof result.headlineHookScore !== 'number') {
    throw new Error('Vision model output missing headlineHookScore');
  }

  return result;
}
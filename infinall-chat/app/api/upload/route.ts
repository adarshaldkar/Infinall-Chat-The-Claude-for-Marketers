// ============================================================
// Infinall Chat - Multimodal Asset Upload API Router
// Enforces file size limits, validates MIME types, extracts
// real text (PDF/DOCX/CSV/JSON), runs real vision analysis on
// images, and runs speech transcription on audio files!
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { UploadedAttachment, AttachmentKind } from '@/lib/multimodal/types';
import { CreativeVisionAnalyzer } from '@/lib/multimodal/vision';
import { MultimodalDocumentParser } from '@/lib/multimodal/parser';
import { transcribeAudio } from '@/lib/multimodal/audio';

export const runtime = 'nodejs';

// Hard file size limits
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB for images (Anthropic Vision limit)
const MAX_DOC_BYTES = 25 * 1024 * 1024;    // 25MB for documents
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;  // 25MB for audio files

// Allowed MIME types
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

const ALLOWED_DOC_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',  // .doc
  'text/csv', 'text/plain', 'text/markdown', 'text/tab-separated-values',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
]);

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/m4a', 'audio/x-m4a',
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const fileName = file.name;
    const sizeBytes = file.size;

    // Determine file kind
    let kind: AttachmentKind = 'document';
    if (mimeType.startsWith('image/')) kind = 'image';
    else if (mimeType.startsWith('audio/') || ALLOWED_AUDIO_MIMES.has(mimeType)) kind = 'audio';

    // ── Security: enforce file size limits ──────────────────────
    const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : kind === 'audio' ? MAX_AUDIO_BYTES : MAX_DOC_BYTES;
    if (sizeBytes > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max size for ${kind}: ${Math.round(maxBytes / 1024 / 1024)}MB` },
        { status: 413 }
      );
    }

    // ── Security: validate MIME type whitelist ───────────────────
    const allowed = kind === 'image' ? ALLOWED_IMAGE_MIMES : kind === 'audio' ? ALLOWED_AUDIO_MIMES : ALLOWED_DOC_MIMES;
    if (!allowed.has(mimeType) && !mimeType.startsWith('text/')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Allowed: images (JPEG/PNG/WebP/GIF), audio (MP3/WAV/M4A/WebM), PDF, DOCX, CSV, JSON, TXT, MD` },
        { status: 415 }
      );
    }

    // ── Magic byte validation ────────────────────────────────────
    const firstBytes = Buffer.from(await file.slice(0, 8).arrayBuffer());
    if (kind === 'document' && mimeType === 'application/pdf') {
      if (!firstBytes.toString('ascii').startsWith('%PDF')) {
        return NextResponse.json({ error: 'File does not appear to be a valid PDF.' }, { status: 400 });
      }
    }

    // Read full buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const attachment: UploadedAttachment = {
      id,
      name: fileName,
      kind,
      mimeType,
      sizeBytes,
    };

    if (kind === 'image') {
      // Store base64 for vision model
      const rawBase64 = buffer.toString('base64');
      attachment.base64Data = rawBase64;

      // Run real vision analysis via LLM (or explicit unavailable state)
      attachment.visionSummary = await CreativeVisionAnalyzer.auditCreativeImage(
        fileName,
        mimeType,
        rawBase64
      );
    } else if (kind === 'document') {
      // Run real document text extraction
      const parsedDoc = await MultimodalDocumentParser.parseDocument(fileName, buffer);
      attachment.extractedText = parsedDoc.rawText;
      if (parsedDoc.tables && parsedDoc.tables.length > 0) {
        const tablesSummary = parsedDoc.tables
          .map((t) => `**${t.title}**\n| ${t.headers.join(' | ')} |\n| ${t.headers.map(() => '---').join(' | ')} |\n${t.rows.slice(0, 10).map((r) => `| ${r.join(' | ')} |`).join('\n')}`)
          .join('\n\n');
        attachment.extractedText = parsedDoc.rawText.slice(0, 2000) + '\n\n' + tablesSummary;
      }
    } else if (kind === 'audio') {
      // Run real audio speech transcription & marketing takeaways extraction
      const audioResult = await transcribeAudio(fileName, buffer, mimeType);

      // Honest handling: never fabricate a transcript when STT is unavailable
      if (!audioResult.available) {
        attachment.extractedText =
          `[Transcription unavailable] ${audioResult.unavailableReason ?? 'Speech-to-text not configured.'}`;
      } else {
        const speakerTranscript = audioResult.speakers
          ? audioResult.speakers.map((s) => `[${s.timestamp} - ${s.speaker}]: ${s.text}`).join('\n')
          : audioResult.transcript;

        const insightsSummary = audioResult.marketingInsights
          ? [
              `\n\n### 🎙️ Audio Transcription & Marketing Signals:`,
              `- **Duration:** ${Math.round(audioResult.durationSeconds / 60)}m ${audioResult.durationSeconds % 60}s`,
              `- **Buying Intent:** **${audioResult.marketingInsights.buyingIntent}**`,
              `- **Pain Points Identified:** ${audioResult.marketingInsights.painPoints.join('; ')}`,
              `- **Key Objections:** ${audioResult.marketingInsights.objections.join('; ')}`,
              `- **Competitor Mentions:** ${audioResult.marketingInsights.competitorMentions.join(', ')}`,
              `- **Key Quotes:** ${audioResult.marketingInsights.keyQuotes.join(' ')}`,
            ].join('\n')
          : '';

        attachment.extractedText = speakerTranscript + insightsSummary;
      }
    }

    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload processing failed' },
      { status: 500 }
    );
  }
}

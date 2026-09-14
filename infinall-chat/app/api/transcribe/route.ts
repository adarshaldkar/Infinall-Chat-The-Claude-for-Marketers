// ============================================================
// /api/transcribe — Dedicated Audio Transcription Endpoint
// Accepts audio file uploads (WAV, MP3, M4A, WebM) and returns
// full transcript with diarization and marketing insights.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/multimodal/audio';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'audio/mpeg';
    const result = await transcribeAudio(file.name, buffer, mimeType);

    return NextResponse.json({
      success: true,
      transcription: result,
    });
  } catch (err) {
    console.error('[Transcribe Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcription failed' },
      { status: 500 }
    );
  }
}

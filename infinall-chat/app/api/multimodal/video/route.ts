// ============================================================
// /api/multimodal/video — Video Intelligence Processing API
// Accepts video file uploads and returns scene breakdowns & marketing metrics
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { processMarketingVideo } from '@/lib/multimodal/video-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const report = await processMarketingVideo(file.name, buffer, file.type || 'video/mp4');

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    console.error('[API /multimodal/video] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

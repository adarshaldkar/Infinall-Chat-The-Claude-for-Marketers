// ============================================================
// Infinall Chat - Dynamic Uploaded Asset Server
// Ensures newly uploaded images/videos/documents are served immediately
// without requiring dev server restart or Turbopack re-indexing.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  try {
    const { filename } = await params;
    const cleanFilename = filename.join('/');
    const safeBase = path.basename(cleanFilename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeBase);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeBase).slice(1).toLowerCase();
    const contentType = MIME_MAP[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[Upload Serve Route Error]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

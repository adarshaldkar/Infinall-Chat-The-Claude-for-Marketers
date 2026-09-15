// ============================================================
// /api/knowledge/upload — Asynchronous Multi-Format RAG Ingestion API
// Supports: PDF, DOCX, DOC, PPTX, PPT, XLSX, CSV, MD, TXT, JSON, HTML
// Scoped strictly by project_id and user_id
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ingestionWorker } from '@/lib/rag/ingestion-worker';
import { extractSessionFromRequest } from '@/lib/security/auth';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = (formData.get('projectId') as string) || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || 'document.pdf';
    const fileSizeBytes = buffer.length;
    const documentId = crypto.randomUUID();

    // Start background asynchronous ingestion job
    await ingestionWorker.processIngestionAsync(
      buffer,
      fileName,
      fileSizeBytes,
      session.userId,
      projectId,
      documentId
    );

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        title: fileName,
        fileType: (fileName.split('.').pop() || 'txt').toLowerCase(),
        projectId: projectId || null,
        status: 'validating',
      },
      message: 'Ingestion job started. Connect to SSE stream for live progress updates.',
      streamUrl: `/api/knowledge/stream?docId=${documentId}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

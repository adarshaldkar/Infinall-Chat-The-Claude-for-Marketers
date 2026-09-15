// ============================================================
// /api/knowledge/stream — Server-Sent Events (SSE) Progress Route
// Streams real-time parsing, chunking, and embedding progress to UI
// ============================================================

import { NextRequest } from 'next/server';
import { ingestionWorker, IngestionJobEvent } from '@/lib/rag/ingestion-worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get('docId');

  if (!docId) {
    return new Response(JSON.stringify({ error: 'Missing docId query parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to push SSE message
  const pushSSE = async (event: IngestionJobEvent) => {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(data));
    } catch (_) {
      // Client disconnected
    }
  };

  const unsubscribe = ingestionWorker.subscribe(docId, (event) => {
    pushSSE(event);
    if (event.status === 'ready' || event.status === 'failed') {
      // Close stream once terminal state reached
      setTimeout(() => {
        try {
          writer.close();
        } catch (_) {}
      }, 1000);
    }
  });

  req.signal.addEventListener('abort', () => {
    unsubscribe();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

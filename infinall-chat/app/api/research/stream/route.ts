// ============================================================
// Infinall Chat - Deep Research SSE Streaming API Router
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { ResearchOrchestrator } from '@/lib/subagents/orchestrator';
import { extractSessionFromRequest } from '@/lib/security/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt = '' } = body;

    if (!prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required for research' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of ResearchOrchestrator.executeResearch(prompt)) {
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', payload: { finishReason: 'stop' } })}\n\n`));
          controller.close();
        } catch (err) {
          const errorEvent = {
            type: 'subagent_error',
            payload: {
              subagentId: 'master-orchestrator',
              error: err instanceof Error ? err.message : 'Research failed',
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research stream failed' },
      { status: 500 }
    );
  }
}

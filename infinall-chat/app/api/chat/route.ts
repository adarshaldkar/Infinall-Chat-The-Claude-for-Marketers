// ============================================================
// /api/chat — SSE Streaming Agent Endpoint
// Runs the full pipeline: planner → agent loop → SSE stream
// ============================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runPlanner } from '@/lib/state/planner';
import { runAgentLoop } from '@/lib/state/agent-loop';
import { DEFAULT_MODEL_ID, MODEL_CATALOG } from '@/lib/gateway/catalog';
import { CanonicalSSEEvent, LLMMessage } from '@/lib/gateway/types';
import { ArtifactInterceptor } from '@/lib/artifacts/interceptor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
  modelId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      sseError({ message: 'Invalid JSON body', code: 'PARSE_ERROR', recoverable: false }),
      { status: 400, headers: sseHeaders() }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      sseError({ message: parsed.error.message, code: 'VALIDATION_ERROR', recoverable: false }),
      { status: 400, headers: sseHeaders() }
    );
  }

  const { messages, modelId = DEFAULT_MODEL_ID, sessionId = 'anon' } = parsed.data;

  const abortController = new AbortController();
  req.signal.addEventListener('abort', () => abortController.abort());

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: CanonicalSSEEvent) => {
        try {
          controller.enqueue(encodeSSE(event));
        } catch {
          // Stream already closed
        }
      };

      try {
        // Step 1: Run planning pass
        enqueue({ type: 'plan_start', payload: { taskId: sessionId } });

        const userMessage = messages[messages.length - 1]?.content ?? '';
        const plan = await runPlanner(userMessage, modelId);

        enqueue({
          type: 'plan_complete',
          payload: {
            taskType: plan.task_type,
            recommendedModel: plan.recommended_model,
            candidateTools: plan.candidate_tools,
            expectedArtifactType: plan.expected_artifact_type,
          },
        });

        // Use user-selected model if specified and valid, otherwise planner recommended model
        const resolvedModelId =
          modelId && MODEL_CATALOG[modelId]
            ? modelId
            : MODEL_CATALOG[plan.recommended_model]
            ? plan.recommended_model
            : DEFAULT_MODEL_ID;

        // Step 2: Convert messages to LLMMessage format
        const llmMessages: LLMMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Step 3: Run autonomous agent loop with artifact interception
        const interceptor = new ArtifactInterceptor();

        for await (const event of runAgentLoop(
          {
            selectedModelId: resolvedModelId,
            messages: llmMessages,
            systemPrompt: '',
            plan,
            sessionId,
          },
          abortController.signal
        )) {
          // Intercept text_delta for artifact detection & stream routing
          if (event.type === 'text_delta') {
            const routedEvents = interceptor.processDelta(event.payload.delta);
            for (const re of routedEvents) {
              enqueue(re);
            }
          } else {
            enqueue(event);
          }
        }

        // Flush any trailing buffer in the interceptor
        for (const fe of interceptor.flush()) {
          enqueue(fe);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        enqueue({
          type: 'error',
          payload: { message, code: 'AGENT_ERROR', recoverable: false },
        });
      } finally {
        enqueue({ type: 'done', payload: { finishReason: 'complete' } });
        controller.close();
      }
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

// ============================================================
// Helpers
// ============================================================

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

function encodeSSE(event: CanonicalSSEEvent): Uint8Array {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  return new TextEncoder().encode(data);
}

function sseError(payload: { message: string; code: string; recoverable: boolean }): string {
  return `data: ${JSON.stringify({ type: 'error', payload })}\n\ndata: ${JSON.stringify({ type: 'done', payload: { finishReason: 'error' } })}\n\n`;
}

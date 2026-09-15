// ============================================================
// /api/chat — SSE Streaming Agent Endpoint
// Runs the full pipeline: planner → agent loop → SSE stream
// ============================================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { runPlanner } from '@/lib/state/planner';
import { runAgentLoop } from '@/lib/state/agent-loop';
import { DEFAULT_MODEL_ID, MODEL_CATALOG } from '@/lib/gateway/catalog';
import { CanonicalSSEEvent, LLMMessage, LLMContentBlock } from '@/lib/gateway/types';
import { ArtifactInterceptor } from '@/lib/artifacts/interceptor';
import { SkillResolver } from '@/lib/skills/resolver';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { SupabaseClient } from '@supabase/supabase-js';
import { assembleContext } from '@/lib/state/context-assembler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.union([z.string(), z.array(z.any())]),
    })
  ),
  modelId: z.string().optional(),
  sessionId: z.string().optional(),
  projectId: z.string().uuid().optional(),
  activeArtifact: z.object({ id: z.string(), title: z.string(), type: z.string(), content: z.string().optional() }).nullable().optional(),
});

// Extract plain text from content blocks for planning / skill resolution / RAG.
// Does NOT strip image blocks from the message sent to the LLM.
function extractTextForPlanning(content: string | unknown[]): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const obj = part as Record<string, unknown>;
          if (typeof obj.text === 'string') return obj.text;
          if (obj.type === 'text' && typeof obj.text === 'string') return obj.text;
          // Image blocks: extract filename hint if present but don't fabricate analysis
          if (obj.type === 'image') return '[Image attached]';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(content || '');
}

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return new Response(
      sseError({ message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED', recoverable: false }),
      { status: 401, headers: sseHeaders() }
    );
  }

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

  const { messages: rawMessages, modelId = DEFAULT_MODEL_ID, sessionId = `session-${session.userId}`, projectId, activeArtifact } = parsed.data;

  // Preserve multimodal content blocks (images, text)
  const messages: LLMMessage[] = rawMessages.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role as 'user' | 'assistant', content: m.content };
    }
    if (Array.isArray(m.content)) {
      const blocks: LLMContentBlock[] = [];
      for (const item of m.content) {
        if (typeof item === 'string') {
          blocks.push({ type: 'text', text: item });
        } else if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          if (obj.type === 'text' && typeof obj.text === 'string') {
            blocks.push({ type: 'text', text: obj.text });
          } else if (obj.type === 'image' && obj.source && typeof obj.source === 'object') {
            const src = obj.source as Record<string, string>;
            blocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: src.media_type || 'image/png',
                data: src.data || '',
              },
            });
          }
        }
      }
      return { role: m.role as 'user' | 'assistant', content: blocks.length > 0 ? blocks : '' };
    }
    return { role: m.role as 'user' | 'assistant', content: String(m.content || '') };
  });

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
        // Step 1: Resolve Progressive Skills & Multimodal Context
        enqueue({ type: 'plan_start', payload: { taskId: sessionId } });

        const lastMsg = messages[messages.length - 1];
        // Extract plain text for planning / RAG / skill resolution.
        // The full multimodal content (including images) is preserved separately for the LLM.
        const rawUserMessage = typeof lastMsg?.content === 'string'
          ? lastMsg.content
          : Array.isArray(lastMsg?.content)
          ? extractTextForPlanning(lastMsg.content)
          : '';

        const skillResolution = SkillResolver.resolveSkill(rawUserMessage);
        const activeSkill = skillResolution.matchedSkill;
        const cleanedUserMessage = skillResolution.cleanedPrompt;

        // Step 1.5: Dynamic RAG & Brand Memory Context Assembly
        const [retrievedChunks, retrievedMemories] = await Promise.all([
          import('@/lib/rag/retriever').then(m => m.hybridRetrieve(cleanedUserMessage, { topK: 5, userId: session.userId, projectId })).catch(() => []),
          import('@/lib/continuity/memory-retriever').then(m => m.retrieveBrandMemories({ query: cleanedUserMessage, userId: session.userId, projectId })).catch(() => []),
        ]);

        // Background brand memory consolidation from conversation
        import('@/lib/continuity/consolidation')
          .then(m => m.consolidateBrandMemory(cleanedUserMessage, sessionId, session.userId, projectId))
          .catch(() => {});

        let ragKnowledgeContext = '';
        if (retrievedChunks && retrievedChunks.length > 0) {
          const chunkLines = retrievedChunks
            .map(c => `[SOURCE: ${c.citation}]\n${c.content}`)
            .join('\n\n');
          ragKnowledgeContext = `\n<knowledge_context>\nVerified Knowledge Base documents retrieved for this query:\n${chunkLines}\nGround your response in these verified documents and cite the sources when referencing them.\n</knowledge_context>\n`;

          // Emit structured citation events (first-class, not piggybacked on tool_call_result)
          enqueue({
            type: 'citations',
            payload: {
              citations: retrievedChunks.map((c, idx) => ({
                citationId: `kc-${idx + 1}`,
                documentId: c.documentId,
                chunkId: c.id,
                title: c.documentTitle,
                pageNumber: c.pageNumber,
                sectionTitle: c.sectionTitle,
                snippet: c.content.slice(0, 200),
                score: c.score,
                provider: 'knowledge_base',
              })),
            },
          });
        }

        const brandMemoryContext = (await import('@/lib/continuity/memory-retriever'))
          .formatBrandMemoryContext(retrievedMemories || []);

        let projectInstructions = '';
        if (projectId) {
          const projectClient = (await import('@/lib/supabase/server')).getSupabaseServerClient();
          if (projectClient) {
            const { data: project } = await (projectClient as SupabaseClient)
              .from('projects')
              .select('instructions')
              .eq('id', projectId)
              .eq('owner_id', session.userId)
              .is('deleted_at', null)
              .maybeSingle();
            projectInstructions = project?.instructions ?? '';
          }
        }

        const plan = await runPlanner(cleanedUserMessage, modelId);

        enqueue({
          type: 'plan_complete',
          payload: {
            taskType: activeSkill ? activeSkill.category : plan.task_type,
            recommendedModel: plan.recommended_model,
            candidateTools: activeSkill?.suggestedTools.length ? activeSkill.suggestedTools : plan.candidate_tools,
            expectedArtifactType: activeSkill?.defaultArtifactType || plan.expected_artifact_type,
          },
        });

        // Use planner-recommended model, unless user explicitly selected a real model (not 'auto')
        const userSelectedModel = (modelId && modelId !== 'auto' && MODEL_CATALOG[modelId]) ? modelId : undefined;
        const resolvedModelId = userSelectedModel
          ?? (MODEL_CATALOG[plan.recommended_model] ? plan.recommended_model : DEFAULT_MODEL_ID);

        // Step 2: Assemble System Prompt with Skills + Brand Memory + RAG Knowledge
        // Step 3: Convert messages to LLMMessage format.
        // CRITICAL: Preserve multimodal content blocks (images) on the last message.
        // Only extract plain text for planning / skills — not for the actual LLM payload.
        const llmMessages: LLMMessage[] = messages.map((m, idx) => {
          if (idx === messages.length - 1) {
            // Preserve the full content array (which may contain image blocks)
            // if the message has multimodal content. Replace with cleaned text only
            // when the content is already a plain string.
            if (typeof m.content === 'string') {
              return {
                role: m.role as 'user' | 'assistant',
                content: cleanedUserMessage,
              };
            }
            // Multimodal: keep image blocks intact, replace text blocks with cleaned text
            const blocks = m.content as LLMContentBlock[];
            const hasImages = blocks.some((b) => b.type === 'image');
            if (hasImages) {
              // Replace only the first text block with the cleaned message; keep all image blocks
              let replacedText = false;
              const newBlocks: LLMContentBlock[] = blocks.map((b) => {
                if (b.type === 'text' && !replacedText) {
                  replacedText = true;
                  return { type: 'text' as const, text: cleanedUserMessage || b.text };
                }
                return b;
              });
              if (!replacedText && cleanedUserMessage) {
                newBlocks.unshift({ type: 'text', text: cleanedUserMessage });
              }
              return { role: m.role as 'user' | 'assistant', content: newBlocks };
            }
            return {
              role: m.role as 'user' | 'assistant',
              content: cleanedUserMessage,
            };
          }
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content,
          };
        });

        const context = assembleContext({
          projectInstructions,
          brandMemory: brandMemoryContext,
          knowledgeContext: ragKnowledgeContext,
          history: llmMessages,
          activeArtifact,
          toolIndex: activeSkill?.suggestedTools.join(', ') || plan.candidate_tools.join(', '),
        });

        // Step 4: Run autonomous agent loop with artifact interception
        const interceptor = new ArtifactInterceptor();

        for await (const event of runAgentLoop(
          {
            selectedModelId: resolvedModelId,
            messages: llmMessages,
            systemPrompt: [activeSkill?.systemPromptInjection, context.systemPrompt].filter(Boolean).join('\n\n'),
            plan: {
              ...plan,
              candidate_tools: activeSkill?.suggestedTools.length ? activeSkill.suggestedTools : plan.candidate_tools,
            },
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

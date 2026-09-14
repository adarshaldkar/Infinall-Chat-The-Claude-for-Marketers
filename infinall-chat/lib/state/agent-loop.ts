// ============================================================
// Autonomous Agent Loop — Phase 2 Multi-Turn Harness
// Features: Deferred discovery, Promise.allSettled, lifecycle hooks,
// Zod error recovery, and HMAC mutation safety.
// ============================================================

import { LLMMessage, CanonicalSSEEvent, LLMContentBlock, SourceCitation } from '../gateway/types';
import { ModelCatalogEntry, getModel } from '../gateway/catalog';
import { streamModelTurn, ToolSchema } from '../gateway/index';
import { PlannerOutput } from './planner';
import { DEFAULT_AGENT_POLICY, AgentPolicy } from './policy';
import { isMutationTool, validateToolArgs } from '../tools/registry';
import { resolveCandidateTools } from '../tools/search';
import { beforeToolExecution, afterToolExecution } from '../tools/hooks';
import { executeWebSearch } from '../tools/web-search';
import { executeFirecrawlScrape } from '../mcp/adapters/firecrawl-adapter';
import { executeGA4Metrics } from '../mcp/adapters/ga4-adapter';
import { executeMetaAdsRead } from '../mcp/adapters/meta-ads-adapter';
import { createApproval } from '../tools/approval/store';

export interface AgentLoopConfig {
  selectedModelId: string;
  messages: LLMMessage[];
  systemPrompt: string;
  plan: PlannerOutput;
  sessionId: string;
  policy?: Partial<AgentPolicy>;
}

const INFINALL_SYSTEM_PROMPT = `You are Infinall Chat, an expert autonomous AI marketing strategist designed for growth leaders, CMOs, and campaign operators.

## Tone & Formatting Style
- Write with exceptional clarity, high executive density, and direct actionability — just like senior Claude.
- Structure responses with clean section headers (## and ###), bold key concepts, and concise bullet points.
- When comparing strategies, competitors, metrics, or timelines, ALWAYS use clear, well-formatted Markdown tables:
| Metric / Parameter | Option A | Option B | Strategic Impact |
|---|---|---|---|
| ... | ... | ... | ... |

- When delivering interactive calculators, dashboards, micro-apps, or landing pages, ALWAYS output them inside an artifact tag:
<antArtifact identifier="calculator-roi" type="html" title="Interactive Tool Title">
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  ...
  <script>
    // CRITICAL: MUST BE 100% FUNCTIONAL INTERACTIVE JAVASCRIPT
    // 1. Attach live input event listeners to ALL sliders & inputs (oninput & onchange).
    // 2. Real-time recalculate metrics, percentages, dollar amounts, and progress bar widths on every change.
    // 3. Make buttons trigger immediate calculation updates and animations.
    // 4. Never leave sliders, buttons, or chart bars static!
  </script>
</body>
</html>
</antArtifact>

- For standalone strategy docs, playbooks, or roadmaps:
<antArtifact identifier="strategy-doc" type="markdown" title="Strategy Title">
...content...
</antArtifact>

Be thorough, grounded with real metrics, and provide direct, high-conviction marketing recommendations.`;

export async function* runAgentLoop(
  config: AgentLoopConfig,
  abortSignal?: AbortSignal
): AsyncGenerator<CanonicalSSEEvent> {
  const signal = abortSignal ?? new AbortController().signal;
  const policy: AgentPolicy = { ...DEFAULT_AGENT_POLICY, ...config.policy };
  const model: ModelCatalogEntry = getModel(config.selectedModelId);

  // 1. Deferred Tool Discovery: Combine Planner recommendations with Tool Catalog search
  const lastUserMsg = config.messages.filter((m) => m.role === 'user').pop();
  const userText = typeof lastUserMsg?.content === 'string'
    ? lastUserMsg.content
    : '';

  const candidateTools = resolveCandidateTools(config.plan.candidate_tools, userText);
  const candidateToolSchemas: ToolSchema[] = candidateTools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  let currentMessages: LLMMessage[] = [...config.messages];
  let turn = 0;
  let totalToolCalls = 0;
  let totalOutputTokens = 0;

  while (turn < policy.maxTurns) {
    if (signal.aborted) {
      yield { type: 'done', payload: { finishReason: 'cancelled' } };
      return;
    }

    turn++;

    const pendingToolEnds: Map<string, { callId: string; toolName: string; args: Record<string, unknown> }> = new Map();
    const thinkingBuffer: string[] = [];
    let textBuffer = '';

    // Stream from model
    for await (const event of streamModelTurn(
      model,
      currentMessages,
      candidateToolSchemas,
      INFINALL_SYSTEM_PROMPT,
      signal
    )) {
      yield event; // pass event through to the SSE stream

      if (event.type === 'tool_call_end') {
        pendingToolEnds.set(event.payload.callId, event.payload);
      }

      if (event.type === 'text_delta') {
        textBuffer += event.payload.delta;
      }

      if (event.type === 'thinking_delta') {
        thinkingBuffer.push(event.payload.delta);
      }

      if (event.type === 'done' || event.type === 'error') {
        break;
      }
    }

    // No tool calls this turn → model produced its complete final response
    if (pendingToolEnds.size === 0) {
      return;
    }

    // Token budget enforcement: count approximate output tokens this turn
    const turnOutputTokens = Math.ceil(textBuffer.length / 4); // ~4 chars per token
    totalOutputTokens += turnOutputTokens;
    if (totalOutputTokens > policy.totalTokenBudget) {
      yield {
        type: 'error',
        payload: {
          message: `Token budget exceeded (used ~${totalOutputTokens.toLocaleString()} / ${policy.totalTokenBudget.toLocaleString()} tokens). Agent loop stopped.`,
          code: 'TOKEN_BUDGET_EXCEEDED',
          recoverable: false,
        },
      };
      return;
    }

    // Separate read tools from write mutation tools
    const readTools: typeof pendingToolEnds = new Map();
    const writeTools: typeof pendingToolEnds = new Map();

    for (const [callId, tc] of pendingToolEnds) {
      if (isMutationTool(tc.toolName)) {
        writeTools.set(callId, tc);
      } else {
        readTools.set(callId, tc);
      }
    }

    // Handle Write Mutations → Generate Cryptographic HMAC Token & Pause for User Approval
    if (writeTools.size > 0) {
      for (const [, tc] of writeTools) {
        try {
          const validatedArgs = validateToolArgs(tc.toolName, tc.args);
          const approval = createApproval(tc.toolName, validatedArgs, config.sessionId);

          yield {
            type: 'approval_required',
            payload: {
              executionId: approval.executionId,
              toolName: tc.toolName,
              actionSummary: approval.actionSummary,
              diff: approval.diff,
              expiresAt: approval.expiresAt,
            },
          };
        } catch (err) {
          yield {
            type: 'error',
            payload: {
              message: err instanceof Error ? err.message : 'Mutation validation failed',
              code: 'INVALID_MUTATION_ARGS',
              recoverable: true,
            },
          };
        }
      }
      // Pause loop — will resume via /api/chat/approval/resume upon user decision
      return;
    }

    // Execute Read Tools in Parallel using Promise.allSettled
    if (readTools.size > 0) {
      // Per-turn limit check
      if (readTools.size > policy.maxToolCallsPerTurn) {
        yield {
          type: 'error',
          payload: {
            message: `Too many parallel tool calls this turn (${readTools.size} > maxToolCallsPerTurn: ${policy.maxToolCallsPerTurn}).`,
            code: 'MAX_TOOL_CALLS_PER_TURN',
            recoverable: false,
          },
        };
        return;
      }
      // Total lifetime cap check
      totalToolCalls += readTools.size;
      if (totalToolCalls > policy.maxToolCallsTotal) {
        yield {
          type: 'error',
          payload: {
            message: `Maximum total tool calls exceeded (${totalToolCalls} > maxToolCallsTotal: ${policy.maxToolCallsTotal}). Stopping agent loop.`,
            code: 'MAX_TOOL_CALLS_TOTAL',
            recoverable: false,
          },
        };
        return;
      }

      interface SettledToolOutput {
        callId: string;
        toolName: string;
        result: unknown;
        sources: SourceCitation[];
        isError?: boolean;
        errorMessage?: string;
      }

      const toolResults = await Promise.allSettled(
        Array.from(readTools.values()).map(async (tc): Promise<SettledToolOutput> => {
          const startTime = Date.now();
          const hookCtx = {
            toolName: tc.toolName,
            args: tc.args,
            sessionId: config.sessionId,
            timestamp: startTime,
          };

          // 1. PreToolUse lifecycle hook
          const hookCheck = await beforeToolExecution(hookCtx);
          if (!hookCheck.proceed) {
            return {
              callId: tc.callId,
              toolName: tc.toolName,
              result: `Pre-execution check failed: ${hookCheck.error}`,
              sources: [],
              isError: true,
              errorMessage: hookCheck.error,
            };
          }

          try {
            // 2. Validate tool arguments with Zod
            const validatedArgs = validateToolArgs(tc.toolName, tc.args);
            let rawResult: unknown;
            let sources: SourceCitation[] = [];

            if (tc.toolName === 'web_search') {
              const searchRes = await executeWebSearch(validatedArgs as unknown as Parameters<typeof executeWebSearch>[0]);
              sources = searchRes.flatMap((r, i) => r.sources.map((s) => ({ ...s, id: i * 10 + s.id })));
              rawResult = searchRes.map((r) => `Query: "${r.query}"\n${r.summary}`).join('\n\n');
            } else if (tc.toolName === 'firecrawl_scrape') {
              const scrapeRes = await executeFirecrawlScrape(validatedArgs as unknown as Parameters<typeof executeFirecrawlScrape>[0]);
              sources = [{ id: 1, title: scrapeRes.title, url: scrapeRes.url, domain: new URL(scrapeRes.url).hostname, snippet: scrapeRes.markdown.slice(0, 300) }];
              rawResult = scrapeRes.markdown;
            } else if (tc.toolName === 'ga4_metrics') {
              const ga4Res = await executeGA4Metrics(validatedArgs as unknown as Parameters<typeof executeGA4Metrics>[0]);
              rawResult = JSON.stringify(ga4Res, null, 2);
            } else if (tc.toolName === 'meta_ads_read') {
              const metaRes = await executeMetaAdsRead(validatedArgs as unknown as Parameters<typeof executeMetaAdsRead>[0]);
              rawResult = JSON.stringify(metaRes, null, 2);
            } else {
              rawResult = { error: `Tool ${tc.toolName} not supported.` };
            }

            // 3. PostToolUse lifecycle hook
            const finalResult = await afterToolExecution({
              toolName: tc.toolName,
              args: tc.args,
              result: rawResult,
              latencyMs: Date.now() - startTime,
              isError: false,
              sessionId: config.sessionId,
            });

            return {
              callId: tc.callId,
              toolName: tc.toolName,
              result: finalResult,
              sources,
            };
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Tool execution error';
            // Schema-error recovery: Structured error feedback given to model to self-correct
            return {
              callId: tc.callId,
              toolName: tc.toolName,
              result: `Tool Execution Error: ${message}. Please check your arguments and adjust your approach.`,
              sources: [],
              isError: true,
              errorMessage: message,
            };
          }
        })
      );

      // 1. Append assistant turn containing tool_use blocks
      const assistantBlocks: LLMContentBlock[] = [];
      if (textBuffer) {
        assistantBlocks.push({ type: 'text', text: textBuffer });
      }
      for (const [callId, tc] of pendingToolEnds) {
        assistantBlocks.push({
          type: 'tool_use',
          id: callId,
          name: tc.toolName,
          input: tc.args,
        });
      }
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: assistantBlocks },
      ];

      // 2. Append tool results to message history for the next turn
      const toolResultContent: LLMContentBlock[] = [];
      for (const settled of toolResults) {
        if (settled.status === 'fulfilled') {
          const r = settled.value;
          toolResultContent.push({
            type: 'tool_result',
            tool_use_id: r.callId,
            content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
            ...(r.isError ? { is_error: true } : {}),
          });
        }
      }

      if (toolResultContent.length > 0) {
        currentMessages = [
          ...currentMessages,
          { role: 'user', content: toolResultContent },
        ];
      }

      // 3. Emit SSE events for each tool result
      for (const settled of toolResults) {
        if (settled.status === 'fulfilled') {
          const r = settled.value;
          if (r.isError) {
            yield {
              type: 'error',
              payload: { message: r.errorMessage ?? 'Tool failed', code: 'TOOL_ERROR', recoverable: true },
            };
          } else {
            yield {
              type: 'tool_call_result',
              payload: { callId: r.callId, toolName: r.toolName, result: r.result, sources: r.sources },
            };
          }
        }
      }
    }

    // Loop automatically iterates to Turn N+1: model receives tool results and continues
  }

  yield { type: 'done', payload: { finishReason: 'max_turns' } };
}

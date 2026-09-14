// ============================================================
// Anthropic /v1/messages Adapter
// Handles streaming for Claude models via the custom proxy.
// ============================================================

import { LLMMessage, ToolCallRequest, CanonicalSSEEvent } from './types';
import { ModelCatalogEntry, getApiKey } from './catalog';

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

async function* streamAnthropic(
  model: ModelCatalogEntry,
  messages: LLMMessage[],
  tools: AnthropicTool[],
  systemPrompt: string,
  abortSignal: AbortSignal
): AsyncGenerator<CanonicalSSEEvent> {
  const apiKey = getApiKey('anthropic');

  const body: Record<string, unknown> = {
    model: model.id,
    max_tokens: 8192,
    messages,
    stream: true,
  };

  if (systemPrompt) {
    body.system = model.supportsPromptCaching
      ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
      : systemPrompt;
  }

  if (tools.length > 0) {
    body.tools = tools;
  }

  // Extended thinking disabled for Phase 1 — proxy may not support thinking blocks
  // Re-enable when confirmed working:
  // if (model.supportsExtendedThinking) {
  //   body.thinking = { type: 'enabled', budget_tokens: 2048 };
  // }

  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errText = await response.text();
    yield {
      type: 'error',
      payload: {
        message: `Anthropic gateway error ${response.status}: ${errText}`,
        code: `HTTP_${response.status}`,
        recoverable: response.status === 429 || response.status >= 500,
      },
    };
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Tool argument buffers: callId → accumulated args string
  const toolArgBuffers: Record<number, string> = {};
  const toolNames: Record<number, string> = {};
  const toolIds: Record<number, string> = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const eventType = parsed.type as string;

        // Thinking block
        if (eventType === 'content_block_start') {
          const block = parsed.content_block as Record<string, unknown>;
          if (block?.type === 'thinking') {
            yield { type: 'thinking_delta', payload: { delta: '' } };
          }
          if (block?.type === 'tool_use') {
            const idx = parsed.index as number;
            toolArgBuffers[idx] = '';
            toolNames[idx] = block.name as string;
            toolIds[idx] = (block.id as string) || `call_${idx}`;
            yield {
              type: 'tool_call_start',
              payload: { callId: toolIds[idx], toolName: block.name as string },
            };
          }
        }

        if (eventType === 'content_block_delta') {
          const delta = parsed.delta as Record<string, unknown>;
          const idx = parsed.index as number;

          if (delta?.type === 'thinking_delta') {
            yield {
              type: 'thinking_delta',
              payload: { delta: delta.thinking as string },
            };
          } else if (delta?.type === 'text_delta') {
            yield {
              type: 'text_delta',
              payload: { delta: delta.text as string },
            };
          } else if (delta?.type === 'input_json_delta') {
            // Buffer tool arguments — never execute partial JSON
            if (idx !== undefined) {
              toolArgBuffers[idx] = (toolArgBuffers[idx] ?? '') + (delta.partial_json as string);
              yield {
                type: 'tool_call_delta',
                payload: { callId: toolIds[idx] ?? String(idx), argsChunk: delta.partial_json as string },
              };
            }
          }
        }

        if (eventType === 'content_block_stop') {
          const idx = parsed.index as number;
          if (toolArgBuffers[idx] !== undefined) {
            // Tool args are complete — validate JSON before yielding
            try {
              const args = JSON.parse(toolArgBuffers[idx]);
              yield {
                type: 'tool_call_end',
                payload: { callId: toolIds[idx] ?? String(idx), toolName: toolNames[idx], args },
              };
            } catch {
              yield {
                type: 'error',
                payload: {
                  message: `Invalid tool args JSON for ${toolNames[idx]}`,
                  code: 'INVALID_TOOL_ARGS',
                  recoverable: false,
                },
              };
            }
            delete toolArgBuffers[idx];
          }
        }

        if (eventType === 'message_delta') {
          const usage = (parsed.usage as Record<string, unknown>) ?? {};
          yield {
            type: 'usage_metadata',
            payload: {
              promptTokens: 0,
              completionTokens: (usage.output_tokens as number) ?? 0,
              model: model.id,
              latencyMs: 0,
            },
          };
        }

        if (eventType === 'message_stop') {
          yield { type: 'done', payload: { finishReason: 'stop' } };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export { streamAnthropic };

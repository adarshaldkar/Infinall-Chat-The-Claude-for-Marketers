// ============================================================
// OpenAI /v1/chat/completions Adapter
// Handles streaming for Kimi-K2.6 and other OpenAI-protocol models.
// ============================================================

import { LLMMessage, CanonicalSSEEvent } from './types';
import { ModelCatalogEntry, getApiKey } from './catalog';

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

async function* streamOpenAI(
  model: ModelCatalogEntry,
  messages: LLMMessage[],
  tools: OpenAITool[],
  systemPrompt: string,
  abortSignal: AbortSignal
): AsyncGenerator<CanonicalSSEEvent> {
  const apiKey = getApiKey('openai');

  // Convert Anthropic-style messages to OpenAI format
  const openaiMessages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    openaiMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: msg.role, content: msg.content });
    } else {
      // Flatten content blocks to text for OpenAI
      const text = msg.content
        .filter((b) => b.type === 'text')
        .map((b) => ('text' in b ? b.text : ''))
        .join('\n');
      openaiMessages.push({ role: msg.role, content: text });
    }
  }

  const body: Record<string, unknown> = {
    model: model.id,
    messages: openaiMessages,
    stream: true,
    max_tokens: 4096,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errText = await response.text();
    yield {
      type: 'error',
      payload: {
        message: `OpenAI gateway error ${response.status}: ${errText}`,
        code: `HTTP_${response.status}`,
        recoverable: response.status === 429 || response.status >= 500,
      },
    };
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Tool argument buffers per tool call index
  const toolArgBuffers: Record<number, string> = {};
  const toolCallMeta: Record<number, { id: string; name: string }> = {};

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
        if (data === '[DONE]') {
          yield { type: 'done', payload: { finishReason: 'stop' } };
          return;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        const choices = parsed.choices as Array<Record<string, unknown>>;
        if (!choices?.length) continue;

        const delta = choices[0].delta as Record<string, unknown>;
        const finishReason = choices[0].finish_reason as string | null;

        // Text content
        if (typeof delta?.content === 'string' && delta.content) {
          yield { type: 'text_delta', payload: { delta: delta.content } };
        }

        // Tool calls
        if (Array.isArray(delta?.tool_calls)) {
          for (const tc of delta.tool_calls as Array<Record<string, unknown>>) {
            const idx = tc.index as number;

            if (tc.id) {
              // First chunk for this tool call
              const fn = tc.function as Record<string, unknown>;
              toolCallMeta[idx] = { id: tc.id as string, name: fn?.name as string };
              toolArgBuffers[idx] = '';
              yield {
                type: 'tool_call_start',
                payload: { callId: tc.id as string, toolName: fn?.name as string },
              };
            }

            const fn = tc.function as Record<string, unknown> | undefined;
            if (fn?.arguments) {
              toolArgBuffers[idx] = (toolArgBuffers[idx] ?? '') + (fn.arguments as string);
              yield {
                type: 'tool_call_delta',
                payload: { callId: toolCallMeta[idx]?.id ?? String(idx), argsChunk: fn.arguments as string },
              };
            }
          }
        }

        // Finish: flush all buffered tool calls
        if (finishReason === 'tool_calls' || finishReason === 'stop') {
          for (const [idxStr, argsStr] of Object.entries(toolArgBuffers)) {
            const idx = Number(idxStr);
            const meta = toolCallMeta[idx];
            if (!meta) continue;
            try {
              const args = JSON.parse(argsStr);
              yield {
                type: 'tool_call_end',
                payload: { callId: meta.id, toolName: meta.name, args },
              };
            } catch {
              yield {
                type: 'error',
                payload: {
                  message: `Invalid tool args JSON for ${meta.name}`,
                  code: 'INVALID_TOOL_ARGS',
                  recoverable: false,
                },
              };
            }
          }

          // Usage
          const usage = parsed.usage as Record<string, unknown> | undefined;
          if (usage) {
            yield {
              type: 'usage_metadata',
              payload: {
                promptTokens: (usage.prompt_tokens as number) ?? 0,
                completionTokens: (usage.completion_tokens as number) ?? 0,
                model: model.id,
                latencyMs: 0,
              },
            };
          }

          yield { type: 'done', payload: { finishReason: finishReason ?? 'stop' } };
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export { streamOpenAI };

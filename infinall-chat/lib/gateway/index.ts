// ============================================================
// Unified ModelGateway dispatcher
// Routes to the correct adapter based on ModelCatalog.apiType.
// The agent loop NEVER talks to Anthropic/OpenAI directly.
// ============================================================

import { LLMMessage, CanonicalSSEEvent } from './types';
import { ModelCatalogEntry } from './catalog';
import { streamAnthropic, AnthropicTool } from './anthropic';
import { streamOpenAI, OpenAITool } from './openai';

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object
}

export async function* streamModelTurn(
  model: ModelCatalogEntry,
  messages: LLMMessage[],
  tools: ToolSchema[],
  systemPrompt: string,
  abortSignal: AbortSignal
): AsyncGenerator<CanonicalSSEEvent> {
  if (model.apiType === 'messages') {
    // Convert to Anthropic tool format
    const anthropicTools: AnthropicTool[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
    yield* streamAnthropic(model, messages, anthropicTools, systemPrompt, abortSignal);
  } else {
    // Convert to OpenAI tool format
    const openaiTools: OpenAITool[] = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    yield* streamOpenAI(model, messages, openaiTools, systemPrompt, abortSignal);
  }
}

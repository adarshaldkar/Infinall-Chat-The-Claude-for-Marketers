// ============================================================
// Model Catalog — decoupled from transport protocol
// DO NOT use model.startsWith("claude") for routing.
// Use the apiType field from this catalog.
// ============================================================

export interface ModelCatalogEntry {
  id: string;          // upstream model ID sent to the proxy
  name: string;        // display name shown in UI
  provider: 'anthropic' | 'openai';
  apiType: 'messages' | 'chat-completions';
  endpoint: string;
  contextWindow: number;
  supportsExtendedThinking: boolean;
  supportsPromptCaching: boolean;
  supportsVision: boolean;
}

export const MODEL_CATALOG: Record<string, ModelCatalogEntry> = {
  'claude-sonnet-4-6': {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    apiType: 'messages',
    endpoint: `${process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in'}/v1/messages`,
    contextWindow: 200_000,
    supportsExtendedThinking: true,
    supportsPromptCaching: true,
    supportsVision: true,
  },
  'Kimi-K2.6': {
    id: 'Kimi-K2.6',
    name: 'Kimi K2.6',
    provider: 'openai',
    apiType: 'chat-completions',
    endpoint: `${process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in'}/v1/chat/completions`,
    contextWindow: 128_000,
    supportsExtendedThinking: false,
    supportsPromptCaching: false,
    supportsVision: true,
  },
  'claude-opus-5': {
    id: 'claude-opus-5',
    name: 'Claude Opus 5',
    provider: 'anthropic',
    apiType: 'messages',
    endpoint: `${process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in'}/v1/messages`,
    contextWindow: 200_000,
    supportsExtendedThinking: true,
    supportsPromptCaching: true,
    supportsVision: true,
  },
  'gpt-5-6': {
    id: 'gpt-5-6',
    name: 'GPT-5.6',
    provider: 'openai',
    apiType: 'chat-completions',
    endpoint: `${process.env.LLM_GATEWAY_BASE_URL ?? 'https://llm.ganeshnayak.in'}/v1/chat/completions`,
    contextWindow: 128_000,
    supportsExtendedThinking: false,
    supportsPromptCaching: false,
    supportsVision: true,
  },
};

export const DEFAULT_MODEL_ID = 'claude-sonnet-4-6';

export function getModel(modelId: string): ModelCatalogEntry {
  const model = MODEL_CATALOG[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}. Valid models: ${Object.keys(MODEL_CATALOG).join(', ')}`);
  }
  return model;
}

export function getApiKey(provider: ModelCatalogEntry['provider']): string {
  const scoped = process.env[`LLM_GATEWAY_API_KEY_${provider.toUpperCase()}`] ?? process.env.LLM_GATEWAY_API_KEY;
  if (!scoped) throw new Error('LLM_GATEWAY_API_KEY is not set in environment variables');
  return scoped;
}

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

export function resolveAutoModel(promptText?: string): ModelCatalogEntry {
  if (!promptText) return MODEL_CATALOG[DEFAULT_MODEL_ID];
  const lower = promptText.toLowerCase();

  // Route high-stakes multi-channel strategy, deep research synthesis, or executive positioning to Opus 5
  if (
    lower.includes('deep research') ||
    lower.includes('comprehensive strategy') ||
    lower.includes('gtm roadmap') ||
    lower.includes('brand positioning') ||
    lower.includes('executive brief')
  ) {
    return MODEL_CATALOG['claude-opus-5'];
  }

  // Route heavy structured JSON, data extraction, or second opinion checks to GPT-5.6
  if (
    lower.includes('second opinion') ||
    lower.includes('cross-model') ||
    lower.includes('extract json') ||
    lower.includes('format as csv')
  ) {
    return MODEL_CATALOG['gpt-5-6'];
  }

  // Default to Claude Sonnet 4.6 (workhorse for campaigns, copy, reasoning, artifacts)
  return MODEL_CATALOG['claude-sonnet-4-6'];
}

export function getModel(modelId?: string, promptText?: string): ModelCatalogEntry {
  if (!modelId || modelId === 'auto') {
    return resolveAutoModel(promptText);
  }
  const model = MODEL_CATALOG[modelId];
  if (!model) {
    // If unknown, fallback to default rather than crashing
    return MODEL_CATALOG[DEFAULT_MODEL_ID];
  }
  return model;
}

export function getApiKey(provider: ModelCatalogEntry['provider']): string {
  const scoped = process.env[`LLM_GATEWAY_API_KEY_${provider.toUpperCase()}`] ?? process.env.LLM_GATEWAY_API_KEY;
  if (!scoped) throw new Error('LLM_GATEWAY_API_KEY is not set in environment variables');
  return scoped;
}

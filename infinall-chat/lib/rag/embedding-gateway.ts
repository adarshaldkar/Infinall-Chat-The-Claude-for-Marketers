// ============================================================
// Infinall Chat - Embedding Gateway Architecture
// Multi-Provider Embedding Service (OpenAI, Gemini, Custom Gateways)
// Strict Production Error Handling & Isolated Test-Only Deterministic Fallback
// ============================================================

import crypto from 'crypto';

export const EMBEDDING_DIMENSION = 1536;

export type EmbeddingProvider = 'openai' | 'gemini' | 'custom';

export interface EmbeddingGatewayOptions {
  provider?: EmbeddingProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
  allowDeterministicTestFallback?: boolean;
}

export class EmbeddingGateway {
  private provider: EmbeddingProvider;
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private maxRetries: number;
  private timeoutMs: number;
  private allowDeterministicTestFallback: boolean;

  constructor(options: EmbeddingGatewayOptions = {}) {
    this.provider = options.provider || (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'openai';
    this.apiKey =
      options.apiKey ||
      process.env.EMBEDDING_API_KEY ||
      process.env.LLM_GATEWAY_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';
    this.baseUrl =
      options.baseUrl ||
      process.env.EMBEDDING_BASE_URL ||
      process.env.LLM_GATEWAY_BASE_URL ||
      (this.provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com');
    this.model = options.model || (this.provider === 'gemini' ? 'text-embedding-004' : 'text-embedding-3-small');
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.allowDeterministicTestFallback =
      options.allowDeterministicTestFallback ?? (process.env.NODE_ENV === 'test');
  }

  /**
   * Generates a 1536-dimensional vector for single text with retries.
   */
  public async embedText(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    if (!results || results.length === 0) {
      throw new Error(`Embedding gateway failed to generate vector for text.`);
    }
    return results[0];
  }

  /**
   * Batch embedding generation with exponential backoff and provider routing.
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const cleanedTexts = texts.map((t) => t.trim().slice(0, 8000)).map((t) => (t.length > 0 ? t : 'empty'));

    // Check if live API key is present
    if (this.apiKey) {
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          if (this.provider === 'gemini') {
            return await this.callGeminiEmbeddings(cleanedTexts);
          } else {
            return await this.callOpenAICompatibleEmbeddings(cleanedTexts);
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < this.maxRetries) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise((res) => setTimeout(res, backoffMs));
          }
        }
      }

      // If all retries failed and test fallback is explicitly enabled
      if (this.allowDeterministicTestFallback) {
        console.warn(`[EmbeddingGateway] Remote embedding failed after ${this.maxRetries} retries. Using TEST deterministic fallback.`);
        return cleanedTexts.map((text) => this.generateDeterministicTestEmbedding(text));
      }

      throw new Error(`[EmbeddingGateway] Embedding generation failed after ${this.maxRetries} attempts: ${lastError?.message}`);
    }

    // No API key provided:
    if (this.allowDeterministicTestFallback) {
      return cleanedTexts.map((text) => this.generateDeterministicTestEmbedding(text));
    }

    throw new Error(
      `[EmbeddingGateway] Missing API key for embedding provider '${this.provider}'. Set EMBEDDING_API_KEY or OPENAI_API_KEY in .env.`
    );
  }

  /**
   * OpenAI / OpenAI-compatible endpoint handler
   */
  private async callOpenAICompatibleEmbeddings(texts: string[]): Promise<number[][]> {
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const endpoint = cleanBase.endsWith('/v1') ? `${cleanBase}/embeddings` : `${cleanBase}/v1/embeddings`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          dimensions: EMBEDDING_DIMENSION,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${errorBody}`);
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.data)) {
        throw new Error(`Invalid response structure from OpenAI embedding endpoint`);
      }

      const sorted = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
      return sorted.map((item: { embedding: number[] }) => item.embedding);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Google Gemini embedding handler
   */
  private async callGeminiEmbeddings(texts: string[]): Promise<number[][]> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: `models/${this.model}`,
            content: { parts: [{ text: t }] },
            outputDimensionality: EMBEDDING_DIMENSION,
          })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`Gemini HTTP ${res.status}: ${err}`);
      }

      const data = await res.json();
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error(`Invalid response from Gemini batchEmbedContents`);
      }

      return data.embeddings.map((e: { values: number[] }) => {
        const vec = e.values;
        // Validate dimension strictly — never pad or truncate.
        // The outputDimensionality parameter should guarantee 1536 from the API.
        if (vec.length !== EMBEDDING_DIMENSION) {
          throw new Error(
            `[EmbeddingGateway] Gemini returned ${vec.length} dimensions, expected ${EMBEDDING_DIMENSION}. ` +
            `Check outputDimensionality in the request or switch to text-embedding-3-small (OpenAI).`
          );
        }
        return vec;
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Deterministic 1536-dimensional projection strictly for unit tests.
   */
  public generateDeterministicTestEmbedding(text: string): number[] {
    const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
    const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const tokens = clean.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      vector[0] = 1.0;
      return vector;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const hash = crypto.createHash('sha256').update(token).digest();

      for (let j = 0; j < 8; j++) {
        const dimIndex = hash.readUInt16BE(j * 2) % EMBEDDING_DIMENSION;
        const weight = 1.0 / Math.sqrt(i + 1);
        const sign = hash[j * 2] % 2 === 0 ? 1 : -1;
        vector[dimIndex] += sign * weight;
      }
    }

    let sumSq = 0;
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq) || 1.0;
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }

    return vector;
  }
}

export const defaultEmbeddingGateway = new EmbeddingGateway();

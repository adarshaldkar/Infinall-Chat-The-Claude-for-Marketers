// ============================================================
// Vector Embedder - Powered by EmbeddingGateway
// Supports multi-provider routing and isolated test fallback
// ============================================================

import { EmbeddingGateway, EmbeddingGatewayOptions, EMBEDDING_DIMENSION } from './embedding-gateway';

export { EMBEDDING_DIMENSION, EmbeddingGateway };
export type { EmbeddingGatewayOptions as EmbedderOptions };

export class VectorEmbedder {
  private gateway: EmbeddingGateway;

  constructor(options: EmbeddingGatewayOptions = {}) {
    this.gateway = new EmbeddingGateway(options);
  }

  public async embedText(text: string): Promise<number[]> {
    return this.gateway.embedText(text);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return this.gateway.embedBatch(texts);
  }

  public generateDeterministicEmbedding(text: string): number[] {
    return this.gateway.generateDeterministicTestEmbedding(text);
  }
}

export const defaultEmbedder = new VectorEmbedder();

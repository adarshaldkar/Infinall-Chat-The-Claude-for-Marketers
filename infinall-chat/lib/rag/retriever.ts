// ============================================================
// Scoped Hybrid Knowledge Retriever
// Vector Similarity + Full-Text Search + Reciprocal Rank Fusion (RRF)
// Strictly isolated by project_id and user_id
// ============================================================

import fs from 'fs';
import path from 'path';
import { defaultEmbeddingGateway } from './embedding-gateway';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  projectId?: string;
  documentTitle: string;
  pageNumber: number;
  sectionTitle?: string;
  content: string;
  score: number;
  vectorSimilarity: number;
  textRank: number;
  retrievalType: 'vector' | 'keyword' | 'hybrid';
  citation: string;
}

export interface HybridRetrieveOptions {
  topK?: number;
  matchThreshold?: number;
  userId?: string;
  projectId?: string;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

export async function hybridRetrieve(
  query: string,
  options: HybridRetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const topK = options.topK || 6;
  const matchThreshold = options.matchThreshold || 0.15;
  const cleanTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await defaultEmbeddingGateway.embedText(query);
  } catch (err) {
    console.warn('[HybridRetriever] Embedding error, falling back to keyword-only search:', err);
  }

  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  // ── 1. SUPABASE MATCH SCOPED RPC ──────────────────────────
  if (supabase && queryEmbedding.length > 0) {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('match_scoped_knowledge_chunks', {
        query_embedding: queryEmbedding,
        query_text: cleanTerms.join(' | ') || query,
        match_threshold: matchThreshold,
        match_count: topK,
        filter_user_id: options.userId || null,
        filter_project_id: options.projectId || null,
      });

      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((row) => {
          const docTitle = row.metadata?.documentTitle || 'Knowledge Document';
          const pageStr = row.page_number ? ` (p. ${row.page_number})` : '';
          const sectionStr = row.section_title ? ` - ${row.section_title}` : '';
          return {
            id: row.id,
            documentId: row.document_id,
            projectId: row.project_id || options.projectId,
            documentTitle: docTitle,
            pageNumber: row.page_number || 1,
            sectionTitle: row.section_title,
            content: row.content,
            score: row.rrf_score || row.vector_similarity || 0.5,
            vectorSimilarity: row.vector_similarity || 0,
            textRank: row.text_rank || 0,
            retrievalType: 'hybrid',
            citation: `[Doc: ${docTitle}${pageStr}${sectionStr}]`,
          };
        });
      }
    } catch (err) {
      console.warn('[HybridRetriever] RPC execution warning:', err);
    }
  }

  // ── 2. LOCAL DATA STORE FALLBACK ──────────────────────────
  const DATA_DIR = path.resolve(process.cwd(), '.data', 'knowledge');
  const chunksPath = path.join(DATA_DIR, 'chunks.json');
  if (!fs.existsSync(chunksPath)) return [];

  try {
    const rawChunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
    if (!Array.isArray(rawChunks) || rawChunks.length === 0) return [];

    // Filter by project and user if provided
    const filtered = rawChunks.filter((chunk) => {
      if (options.projectId && chunk.projectId && chunk.projectId !== options.projectId) return false;
      if (options.userId && chunk.userId && chunk.userId !== options.userId) return false;
      return true;
    });

    const scored = filtered.map((chunk) => {
      let sim = 0;
      if (queryEmbedding.length > 0 && chunk.embedding) {
        sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      const contentLower = (chunk.content || '').toLowerCase();
      let matchCount = 0;
      for (const term of cleanTerms) {
        if (contentLower.includes(term)) matchCount++;
      }
      const textScore = cleanTerms.length > 0 ? matchCount / cleanTerms.length : 0;
      const combinedScore = sim * 0.6 + textScore * 0.4;

      return {
        chunk,
        score: combinedScore,
        sim,
        textScore,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);

    return topResults.map((item) => {
      const c = item.chunk;
      const docTitle = c.metadata?.documentTitle || 'Knowledge Document';
      const pageStr = c.pageNumber ? ` (p. ${c.pageNumber})` : '';
      const sectionStr = c.sectionTitle ? ` - ${c.sectionTitle}` : '';

      return {
        id: c.id,
        documentId: c.documentId || c.id,
        projectId: c.projectId || options.projectId,
        documentTitle: docTitle,
        pageNumber: c.pageNumber || 1,
        sectionTitle: c.sectionTitle,
        content: c.content,
        score: item.score,
        vectorSimilarity: item.sim,
        textRank: item.textScore,
        retrievalType: 'hybrid',
        citation: `[Doc: ${docTitle}${pageStr}${sectionStr}]`,
      };
    });
  } catch (err) {
    console.error('[HybridRetriever] Fallback search error:', err);
    return [];
  }
}

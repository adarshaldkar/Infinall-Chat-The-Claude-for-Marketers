// ============================================================
// Scoped Hybrid Knowledge Retriever
// Vector Similarity + Full-Text Search + Reciprocal Rank Fusion (RRF, k=60)
// Strictly isolated by project_id and user_id via auth.uid() in the DB RPC
// ============================================================

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

// RRF scoring per standard: score(d) = Σ 1 / (k + rank(d))
// where k=60 smooths the impact of high-rank results.
function rrfScore(rankInList: number, k = 60): number {
  return 1 / (k + rankInList + 1); // +1 because ranks are 0-indexed
}

/**
 * Merges two ranked result sets using Reciprocal Rank Fusion (k=60).
 * Each list is an array of IDs in ranked order. Returns a merged
 * score map by ID.
 */
function reciprocalRankFusion(
  vectorRanking: string[],
  textRanking: string[],
  k = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  for (let i = 0; i < vectorRanking.length; i++) {
    const id = vectorRanking[i];
    scores.set(id, (scores.get(id) ?? 0) + rrfScore(i, k));
  }

  for (let i = 0; i < textRanking.length; i++) {
    const id = textRanking[i];
    scores.set(id, (scores.get(id) ?? 0) + rrfScore(i, k));
  }

  return scores;
}

export class RetrievalUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetrievalUnavailableError';
  }
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
    console.warn('[HybridRetriever] Embedding error, retrieval may fall back to keyword-only:', err);
  }

  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  // ── SUPABASE: Primary path with RRF RPC ───────────────────────────────────
  if (supabase && queryEmbedding.length > 0) {
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('match_scoped_knowledge_chunks', {
        query_embedding: queryEmbedding,
        query_text: cleanTerms.join(' | ') || query,
        match_threshold: matchThreshold,
        match_count: topK,
        // SECURITY: filter_user_id / filter_project_id are passed as hints for the RPC,
        // but the RPC itself uses auth.uid() for actual access control.
        // Callers cannot bypass access by supplying arbitrary IDs.
        filter_user_id: options.userId || null,
        filter_project_id: options.projectId || null,
      });

      if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        return rpcData.map((row) => {
          const docTitle = row.metadata?.documentTitle || 'Knowledge Document';
          const pageStr = row.page_number ? ` (p. ${row.page_number})` : '';
          const sectionStr = row.section_title ? ` — ${row.section_title}` : '';
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

      if (rpcErr) {
        console.warn('[HybridRetriever] Supabase RPC error:', rpcErr.message);
      }
    } catch (err) {
      console.warn('[HybridRetriever] RPC execution warning:', err);
    }
  }

  // ── LOCAL FALLBACK: Available only in development / STORAGE_MODE=local ────
  // In production, we fail clearly rather than switching to a different algorithm.
  if (process.env.NODE_ENV === 'production' && process.env.STORAGE_MODE !== 'local') {
    // Return empty results and log — do NOT silently degrade to weighted scoring
    console.error('[HybridRetriever] Supabase unavailable in production. Returning empty results. Check DB connectivity.');
    return [];
  }

  // Development local fallback using proper in-memory RRF (not weighted blend)
  const fs = await import('fs');
  const path = await import('path');
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

    // Build separate ranked lists for vector and keyword results
    const vectorRanked = filtered
      .map((chunk) => {
        let sim = 0;
        if (queryEmbedding.length > 0 && chunk.embedding) {
          // Dot product (vectors should already be normalized)
          for (let i = 0; i < Math.min(queryEmbedding.length, chunk.embedding.length); i++) {
            sim += queryEmbedding[i] * chunk.embedding[i];
          }
        }
        return { id: chunk.id, sim, chunk };
      })
      .sort((a, b) => b.sim - a.sim)
      .slice(0, topK * 2);

    const textRanked = filtered
      .map((chunk) => {
        const contentLower = (chunk.content || '').toLowerCase();
        let matchCount = 0;
        for (const term of cleanTerms) {
          if (contentLower.includes(term)) matchCount++;
        }
        const textScore = cleanTerms.length > 0 ? matchCount / cleanTerms.length : 0;
        return { id: chunk.id, textScore, chunk };
      })
      .sort((a, b) => b.textScore - a.textScore)
      .slice(0, topK * 2);

    // Apply true RRF (k=60)
    const rrfScores = reciprocalRankFusion(
      vectorRanked.map((r) => r.id),
      textRanked.map((r) => r.id)
    );

    // Build lookup for chunks
    const chunkById = new Map([
      ...vectorRanked.map((r) => [r.id, r.chunk] as [string, typeof r.chunk]),
      ...textRanked.map((r) => [r.id, r.chunk] as [string, typeof r.chunk]),
    ]);

    const results = Array.from(rrfScores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topK)
      .map(([id, score]) => {
        const c = chunkById.get(id)!;
        const docTitle = c.metadata?.documentTitle || 'Knowledge Document';
        const pageStr = c.pageNumber ? ` (p. ${c.pageNumber})` : '';
        const sectionStr = c.sectionTitle ? ` — ${c.sectionTitle}` : '';

        return {
          id: c.id,
          documentId: c.documentId || c.id,
          projectId: c.projectId || options.projectId,
          documentTitle: docTitle,
          pageNumber: c.pageNumber || 1,
          sectionTitle: c.sectionTitle,
          content: c.content,
          score,
          vectorSimilarity: vectorRanked.find((r) => r.id === id)?.sim ?? 0,
          textRank: textRanked.find((r) => r.id === id)?.textScore ?? 0,
          retrievalType: 'hybrid' as const,
          citation: `[Doc: ${docTitle}${pageStr}${sectionStr}]`,
        };
      });

    return results;
  } catch (err) {
    console.error('[HybridRetriever] Local fallback search error:', err);
    return [];
  }
}

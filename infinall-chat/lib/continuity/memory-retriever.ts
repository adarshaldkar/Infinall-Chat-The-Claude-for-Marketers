// ============================================================
// Brand Memory Retriever & Context Formatter
// Fetches active brand voice, audience ICPs, and marketing rules.
// SECURITY: All DB access enforced via auth.uid() in the RPC —
// filter_project_id is a scope hint, never a sole access gate.
// ============================================================

import { BrandMemoryItem } from './types';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { defaultEmbeddingGateway } from '@/lib/rag/embedding-gateway';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RetrieveMemoryOptions {
  userId?: string;
  projectId?: string;
  limit?: number;
  query?: string;
}

export async function retrieveBrandMemories(
  queryOrOptions?: string | RetrieveMemoryOptions,
  userId?: string,
  projectId?: string
): Promise<BrandMemoryItem[]> {
  const options: RetrieveMemoryOptions =
    typeof queryOrOptions === 'string'
      ? { query: queryOrOptions, userId, projectId }
      : queryOrOptions || {};

  const limit = options.limit || 8;
  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  // ── Supabase path (primary) ────────────────────────────────────
  if (supabase) {
    try {
      // Vector search path: use RPC when a query is provided
      if (options.query) {
        let queryVec: number[] = [];
        try {
          queryVec = await defaultEmbeddingGateway.embedText(options.query);
        } catch (_) {}

        if (queryVec.length > 0) {
          const { data: rpcData } = await supabase.rpc('match_scoped_brand_memories', {
            query_embedding: queryVec,
            match_threshold: 0.15,
            match_count: limit,
            // SECURITY: These are scope hints only. The RPC uses auth.uid() for actual access.
            filter_user_id: options.userId || null,
            filter_project_id: options.projectId || null,
          });

          if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
            return rpcData.map((row) => ({
              id: row.id,
              userId: row.user_id,
              projectId: row.project_id || options.projectId,
              category: row.category,
              key: row.memory_key || row.key,
              value: row.memory_value || row.value,
              confidence: row.confidence,
              status: 'active' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
          }
        }
      }

      // Standard active memories lookup (no vector search)
      let queryBuilder = supabase
        .from('brand_memories')
        .select('id, user_id, project_id, category, key, value, memory_key, memory_value, confidence, status, created_at, updated_at')
        .eq('status', 'active')
        .order('confidence', { ascending: false })
        .limit(limit);

      // Apply scope filters (RLS will also enforce auth.uid() independently)
      if (options.projectId) {
        queryBuilder = queryBuilder.eq('project_id', options.projectId);
      } else if (options.userId) {
        queryBuilder = queryBuilder.eq('user_id', options.userId);
      }

      const { data, error } = await queryBuilder;
      if (!error && data && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          projectId: row.project_id,
          sessionId: undefined,
          category: row.category,
          key: row.memory_key || row.key,
          value: row.memory_value || row.value,
          confidence: row.confidence,
          status: row.status || 'active',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
    } catch (err) {
      console.warn('[BrandMemory] Database fetch warning:', err);
    }
  }

  // ── Local fallback: ONLY in explicit dev/local mode ─────────────
  if (process.env.NODE_ENV !== 'production' && process.env.STORAGE_MODE === 'local') {
    const fs = await import('fs');
    const path = await import('path');
    const MEMORIES_DIR = path.resolve(process.cwd(), '.data', 'memories');
    const localPath = path.join(MEMORIES_DIR, 'memories.json');
    if (!fs.existsSync(localPath)) return [];

    try {
      const list: BrandMemoryItem[] = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
      return list
        .filter((m) => {
          if (m.status !== 'active') return false;
          if (options.projectId && m.projectId && m.projectId !== options.projectId) return false;
          if (options.userId && m.userId && m.userId !== options.userId) return false;
          return true;
        })
        .slice(0, limit);
    } catch (_) {
      return [];
    }
  }

  // Production with no Supabase → return empty, log clearly
  if (process.env.NODE_ENV === 'production') {
    console.error('[BrandMemory] Supabase unavailable in production — no brand memory context injected.');
  }

  return [];
}

export function formatBrandMemoryContext(memories: BrandMemoryItem[]): string {
  if (!memories || memories.length === 0) return '';
  const lines = memories
    .filter((m) => m.status === 'active')
    .map((m) => `- [${m.category.toUpperCase().replace(/_/g, ' ')}] ${m.key}: ${m.value}  (confidence: ${(m.confidence * 100).toFixed(0)}%)`);
  if (lines.length === 0) return '';
  return `<brand_memory>\nActive brand rules, audience ICPs, and learned marketer guidelines:\n${lines.join('\n')}\nAlways respect these guidelines in all responses and copy.\n</brand_memory>`;
}

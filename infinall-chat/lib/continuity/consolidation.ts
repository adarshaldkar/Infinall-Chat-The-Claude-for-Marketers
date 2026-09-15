// ============================================================
// Brand Memory Consolidation & Conflict Resolution Engine
// Uses LLM extraction for fact discovery, semantic dedup via
// embedding similarity, and proper active/superseded/conflicted
// state management. Project-scoped — never user-only isolation.
// ============================================================

import crypto from 'crypto';
import { BrandMemoryItem, MemoryCategory } from './types';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { defaultEmbeddingGateway } from '@/lib/rag/embedding-gateway';
import type { SupabaseClient } from '@supabase/supabase-js';

const VALID_CATEGORIES: MemoryCategory[] = [
  'brand_voice', 'target_audience', 'positioning', 'guideline',
  'performance_benchmark', 'do_not_mention', 'pricing_model',
  'competitive_edge', 'competitor_positioning', 'campaign_learning', 'custom',
];

function toMemoryCategory(raw: string): MemoryCategory {
  return VALID_CATEGORIES.includes(raw as MemoryCategory)
    ? (raw as MemoryCategory)
    : 'custom';
}

interface ExtractedFact {
  category: string;
  key: string;
  value: string;
  confidence: number;
}

function extractFactsRuleBased(userText: string): ExtractedFact[] {
  const lower = userText.toLowerCase();
  const facts: ExtractedFact[] = [];
  if (lower.includes('target audience') || lower.includes('audience is') || lower.includes('icp')) {
    facts.push({
      category: 'target_audience',
      key: 'target_audience',
      value: userText,
      confidence: 0.95,
    });
  }
  return facts;
}

/**
 * Use a lightweight LLM call to extract brand facts from user text.
 * Returns structured JSON facts or an empty array on failure.
 */
async function extractFactsWithLLM(userText: string): Promise<ExtractedFact[]> {
  const gatewayBaseUrl = process.env.LLM_GATEWAY_BASE_URL || (process.env.OPENAI_API_KEY ? 'https://api.openai.com' : null);
  const apiKey = process.env.LLM_GATEWAY_API_KEY || process.env.OPENAI_API_KEY || '';

  if (!gatewayBaseUrl || !apiKey) {
    if (process.env.NODE_ENV === 'test' || process.env.STORAGE_MODE === 'local') {
      return extractFactsRuleBased(userText);
    }
    console.warn('[BrandMemory] No LLM API configured for memory extraction. Skipping.');
    return [];
  }

  const systemPrompt = `You are a brand intelligence extractor. Your task is to extract structured brand facts from user messages.

Return ONLY a JSON object with this exact structure:
{
  "facts": [
    { "category": "<category>", "key": "<key>", "value": "<value>", "confidence": <0.0-1.0> }
  ]
}

Valid categories: target_audience, brand_voice, competitor_positioning, campaign_learning, product_positioning, messaging_rule, icp_profile
If you find no relevant facts, return: { "facts": [] }
Do NOT include any text outside the JSON object.`;

  const userPrompt = `Extract brand facts from this message:
"${userText.slice(0, 2000)}"`;

  try {
    const endpoint = gatewayBaseUrl.includes('openai.com')
      ? 'https://api.openai.com/v1/chat/completions'
      : `${gatewayBaseUrl.replace(/\/$/, '')}/v1/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.MEMORY_EXTRACTION_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[BrandMemory] LLM extraction HTTP ${res.status}`);
      if (process.env.NODE_ENV === 'test' || process.env.STORAGE_MODE === 'local') {
        return extractFactsRuleBased(userText);
      }
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.facts)) return [];

    return parsed.facts.filter(
      (f: ExtractedFact) =>
        typeof f.category === 'string' &&
        typeof f.key === 'string' &&
        typeof f.value === 'string' &&
        typeof f.confidence === 'number' &&
        f.value.trim().length > 0
    );
  } catch (err) {
    console.warn('[BrandMemory] LLM extraction failed:', err);
    if (process.env.NODE_ENV === 'test' || process.env.STORAGE_MODE === 'local') {
      return extractFactsRuleBased(userText);
    }
    return [];
  }
}

/**
 * Compute cosine similarity between two normalized embedding vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // assumes vectors are already L2-normalized
}

/**
 * Consolidate brand memory from a user message.
 * Pipeline:
 *   1. LLM extraction → candidate facts
 *   2. Embed each fact
 *   3. Semantic dedup (cosine > 0.85 → skip)
 *   4. Semantic conflict (same key, cosine < 0.7 → mark old as 'conflicted')
 *   5. Insert new active memory
 *
 * SECURITY: Every memory MUST have a project_id. If none provided and Supabase
 * is available, memories are skipped (not silently assigned to wrong scope).
 */
export async function consolidateBrandMemory(
  userText: string,
  sessionId?: string,
  userId?: string,
  projectId?: string
): Promise<BrandMemoryItem[]> {
  // SECURITY: Brand memories must be project-scoped to prevent cross-brand leakage.
  if (!projectId) {
    if (process.env.NODE_ENV === 'test' || process.env.STORAGE_MODE === 'local') {
      projectId = 'test-default-project';
    } else {
      console.warn('[BrandMemory] No projectId provided — skipping memory consolidation to prevent cross-project contamination.');
      return [];
    }
  }

  // Short texts unlikely to contain brand facts
  if (!userText || userText.trim().length < 20) return [];

  // Step 1: Extract facts using LLM
  const facts = await extractFactsWithLLM(userText);
  if (facts.length === 0) return [];

  const now = new Date().toISOString();
  const savedItems: BrandMemoryItem[] = [];
  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  for (const fact of facts) {
    const memoryId = crypto.randomUUID();
    const textToEmbed = `${fact.category}: ${fact.key} = ${fact.value}`;
    let embedding: number[] | undefined;

    try {
      embedding = await defaultEmbeddingGateway.embedText(textToEmbed);
    } catch (_) {
      console.warn('[BrandMemory] Could not embed fact, skipping dedup check.');
    }

    if (supabase) {
      try {
        // Fetch existing active memories with same key in this project
        const { data: existingMemories } = await supabase
          .from('brand_memories')
          .select('id, memory_value, embedding, status')
          .eq('category', fact.category)
          .eq('memory_key', fact.key)
          .eq('project_id', projectId)
          .eq('status', 'active');

        let shouldInsert = true;

        for (const existing of existingMemories || []) {
          const existingEmbedding = existing.embedding as number[] | null;

          if (embedding && existingEmbedding && existingEmbedding.length > 0) {
            const similarity = cosineSimilarity(embedding, existingEmbedding);

            if (similarity > 0.85) {
              // Semantically duplicate — skip insertion
              console.log(`[BrandMemory] Dedup: "${fact.value}" is semantically similar to existing memory (cos=${similarity.toFixed(3)})`);
              shouldInsert = false;
              break;
            } else if (similarity < 0.70) {
              // Semantic conflict — mark existing as conflicted
              await supabase
                .from('brand_memories')
                .update({ status: 'conflicted', superseded_by: memoryId, updated_at: now })
                .eq('id', existing.id);
            } else {
              // Overlapping but not clearly duplicate or conflicting — supersede old
              await supabase
                .from('brand_memories')
                .update({ status: 'superseded', superseded_by: memoryId, updated_at: now })
                .eq('id', existing.id);
            }
          } else {
            // No embeddings available — fall back to string comparison
            if (existing.memory_value.trim().toLowerCase() === fact.value.trim().toLowerCase()) {
              shouldInsert = false;
              break;
            } else {
              await supabase
                .from('brand_memories')
                .update({ status: 'superseded', superseded_by: memoryId, updated_at: now })
                .eq('id', existing.id);
            }
          }
        }

        if (shouldInsert) {
          await supabase.from('brand_memories').insert({
            id: memoryId,
            user_id: userId || null,
            project_id: projectId,
            session_id: sessionId || null,
            category: fact.category,
            memory_key: fact.key,
            memory_value: fact.value,
            confidence: fact.confidence,
            status: 'active',
            embedding: embedding || null,
            created_at: now,
            updated_at: now,
          });

          savedItems.push({
            id: memoryId,
            userId,
            projectId,
            sessionId,
            category: toMemoryCategory(fact.category),
            key: fact.key,
            value: fact.value,
            confidence: fact.confidence,
            status: 'active',
            embedding,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (dbErr) {
        console.warn('[BrandMemory] Database operation warning:', dbErr);
      }
    }

    // Local storage fallback if Supabase was unavailable or failed
    if (savedItems.length === 0 && process.env.NODE_ENV !== 'production' && process.env.STORAGE_MODE === 'local') {
      const fs = await import('fs');
      const path = await import('path');
      const MEMORIES_DIR = path.resolve(process.cwd(), '.data', 'memories');
      if (!fs.existsSync(MEMORIES_DIR)) fs.mkdirSync(MEMORIES_DIR, { recursive: true });

      const localPath = path.join(MEMORIES_DIR, 'memories.json');
      let localList: BrandMemoryItem[] = [];
      if (fs.existsSync(localPath)) {
        try { localList = JSON.parse(fs.readFileSync(localPath, 'utf-8')); } catch (_) { localList = []; }
      }

      const newRecord: BrandMemoryItem = {
        id: memoryId,
        userId,
        projectId,
        sessionId,
        category: toMemoryCategory(fact.category),
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        status: 'active',
        embedding,
        createdAt: now,
        updatedAt: now,
      };

      localList = localList.filter(
        (m) => !(m.category === fact.category && m.key === fact.key && m.projectId === projectId && m.status === 'active')
      );
      localList.unshift(newRecord);
      fs.writeFileSync(localPath, JSON.stringify(localList, null, 2), 'utf-8');
      savedItems.push(newRecord);
    } else if (savedItems.length === 0 && !supabase) {
      console.warn('[BrandMemory] Supabase unavailable. Memory not persisted (production mode).');
    }
  }

  return savedItems;
}

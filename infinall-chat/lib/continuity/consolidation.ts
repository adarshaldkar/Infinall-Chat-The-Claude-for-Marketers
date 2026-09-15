// ============================================================
// Brand Memory Consolidation & Conflict Resolution Engine
// Automatically extracts, deduplicates, and resolves conflicts for brand knowledge
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BrandMemoryItem } from './types';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { defaultEmbeddingGateway } from '@/lib/rag/embedding-gateway';
import type { SupabaseClient } from '@supabase/supabase-js';

const MEMORIES_DIR = path.resolve(process.cwd(), '.data', 'memories');
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function consolidateBrandMemory(
  userText: string,
  sessionId?: string,
  userId?: string,
  projectId?: string
): Promise<BrandMemoryItem[]> {
  const extracted: Omit<BrandMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>[] = [];
  const lower = userText.toLowerCase();

  // 1. Target Audience Detection
  if (lower.includes('target audience') || lower.includes('our audience') || lower.includes('customers are') || lower.includes('selling to')) {
    const match = userText.match(/(?:target audience|our audience|customers are|selling to)\s+(?:is|are|focuses on)?\s*[:\-\s]*([^.!?\n]+)/i);
    if (match && match[1]) {
      extracted.push({
        userId,
        projectId,
        sessionId,
        category: 'target_audience',
        key: 'primary_target_audience',
        value: match[1].trim(),
        confidence: 0.92,
      });
    }
  }

  // 2. Brand Voice & Tone Detection
  if (lower.includes('brand voice') || lower.includes('tone should be') || lower.includes('sound like') || lower.includes('tone of voice')) {
    const match = userText.match(/(?:brand voice|tone should be|sound like|tone of voice)\s+(?:is|are|should be)?\s*[:\-\s]*([^.!?\n]+)/i);
    if (match && match[1]) {
      extracted.push({
        userId,
        projectId,
        sessionId,
        category: 'brand_voice',
        key: 'tone_and_voice_guideline',
        value: match[1].trim(),
        confidence: 0.95,
      });
    }
  }

  // 3. Competitor Positioning Detection
  if (lower.includes('competitor') || lower.includes('competing with') || lower.includes('alternative to')) {
    const match = userText.match(/(?:competitor|competing with|alternative to)\s+(?:is|are)?\s*[:\-\s]*([^.!?\n]+)/i);
    if (match && match[1]) {
      extracted.push({
        userId,
        projectId,
        sessionId,
        category: 'competitor_positioning',
        key: 'key_competitor',
        value: match[1].trim(),
        confidence: 0.88,
      });
    }
  }

  // 4. Campaign Rules / Constraints Detection
  if (lower.includes('never use') || lower.includes('always include') || lower.includes('budget limit') || lower.includes('do not use')) {
    const match = userText.match(/(?:never use|always include|budget limit|do not use)\s*[:\-\s]*([^.!?\n]+)/i);
    if (match && match[1]) {
      extracted.push({
        userId,
        projectId,
        sessionId,
        category: 'campaign_learning',
        key: 'campaign_constraint',
        value: match[1].trim(),
        confidence: 0.90,
      });
    }
  }

  if (extracted.length === 0) return [];

  const now = new Date().toISOString();
  const savedItems: BrandMemoryItem[] = [];
  const supabase = getSupabaseServerClient() as SupabaseClient | null;

  for (const item of extracted) {
    const memoryId = crypto.randomUUID();
    const textToEmbed = `${item.category}: ${item.key} = ${item.value}`;
    let embedding: number[] | undefined;

    try {
      embedding = await defaultEmbeddingGateway.embedText(textToEmbed);
    } catch (_) {}

    const memoryRecord: BrandMemoryItem = {
      id: memoryId,
      userId: item.userId,
      projectId: item.projectId,
      sessionId: item.sessionId,
      category: item.category,
      key: item.key,
      value: item.value,
      confidence: item.confidence,
      status: 'active',
      embedding,
      createdAt: now,
      updatedAt: now,
    };

    // ── CONFLICT RESOLUTION IN SUPABASE ─────────────────────
    if (supabase) {
      try {
        // If an active memory with the same key & category exists in this project, mark it superseded
        const { data: existing } = await supabase
          .from('brand_memories')
          .select('id, memory_value')
          .eq('category', item.category)
          .eq('memory_key', item.key)
          .eq('status', 'active')
          .match(item.projectId ? { project_id: item.projectId } : { user_id: item.userId || '' });

        if (existing && existing.length > 0) {
          for (const oldMem of existing) {
            if (oldMem.memory_value.trim().toLowerCase() !== item.value.trim().toLowerCase()) {
              // Values conflict: supersede old memory
              await supabase
                .from('brand_memories')
                .update({ status: 'superseded', superseded_by: memoryId, updated_at: now })
                .eq('id', oldMem.id);
            }
          }
        }

        // Insert new active memory
        await supabase.from('brand_memories').insert({
          id: memoryId,
          user_id: item.userId || null,
          project_id: item.projectId || null,
          session_id: item.sessionId || null,
          category: item.category,
          memory_key: item.key,
          memory_value: item.value,
          confidence: item.confidence,
          status: 'active',
          embedding: embedding || null,
          created_at: now,
          updated_at: now,
        });
      } catch (dbErr) {
        console.warn('[BrandMemory] Database upsert warning:', dbErr);
      }
    }

    // Local file fallback
    ensureDir(MEMORIES_DIR);
    const localPath = path.join(MEMORIES_DIR, 'memories.json');
    let localList: BrandMemoryItem[] = [];
    if (fs.existsSync(localPath)) {
      try { localList = JSON.parse(fs.readFileSync(localPath, 'utf-8')); } catch (_) { localList = []; }
    }

    // Mark previous active memory with same key and project as superseded locally
    localList.forEach((m) => {
      if (
        m.category === item.category &&
        m.key === item.key &&
        m.status === 'active' &&
        m.projectId === item.projectId &&
        m.value.toLowerCase() !== item.value.toLowerCase()
      ) {
        m.status = 'superseded';
        m.supersededBy = memoryId;
        m.updatedAt = now;
      }
    });

    localList.unshift(memoryRecord);
    fs.writeFileSync(localPath, JSON.stringify(localList, null, 2), 'utf-8');
    savedItems.push(memoryRecord);
  }

  return savedItems;
}

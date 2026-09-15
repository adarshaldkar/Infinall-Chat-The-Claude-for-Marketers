// ============================================================
// Infinall Chat - Brand Memory Database Repository
// ============================================================

import { getSupabaseServerClient } from '../../supabase/server';
import { BrandMemory, MemoryCategory, MemoryStatus } from '../types';

export class MemoryRepository {
  private static getClient() {
    return getSupabaseServerClient();
  }

  static async saveMemory(memory: {
    id?: string;
    projectId?: string;
    userId?: string;
    sessionId?: string;
    key: string;
    category: MemoryCategory;
    value: string;
    confidence?: number;
    provenance?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<BrandMemory | null> {
    const supabase = this.getClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('brand_memories')
      .insert({
        id: memory.id,
        project_id: memory.projectId || null,
        user_id: memory.userId || 'anonymous',
        key: memory.key,
        category: memory.category,
        value: memory.value,
        confidence: memory.confidence ?? 1.0,
        status: 'active',
        provenance: (memory.provenance as any) || {},
        metadata: (memory.metadata as any) || {},
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[MemoryRepository.saveMemory] error:', error?.message);
      return null;
    }

    return this.mapMemory(data);
  }

  static async getActiveMemories(
    userId: string,
    projectId?: string,
    minConfidence: number = 0.6
  ): Promise<BrandMemory[]> {
    const supabase = this.getClient();
    if (!supabase) return [];

    try {
      const { data, error } = await (supabase.rpc as any)('get_active_brand_memories', {
        p_user_id: userId,
        p_project_id: projectId || null,
        p_min_confidence: minConfidence,
      });

      if (!error && Array.isArray(data)) {
        return data.map(this.mapMemory);
      }
    } catch (_) {}

    // Fallback to table query
    let query = supabase
      .from('brand_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('confidence', minConfidence);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: tableData, error: tableErr } = await query.order('confidence', { ascending: false });
    if (tableErr || !tableData) return [];

    return tableData.map(this.mapMemory);
  }

  static async supersedeMemory(oldMemoryId: string, newMemoryId: string): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('brand_memories')
      .update({
        status: 'superseded',
        superseded_by: newMemoryId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oldMemoryId);

    return !error;
  }

  static async markConflict(memoryId: string, conflictingWithId: string): Promise<boolean> {
    const supabase = this.getClient();
    if (!supabase) return false;

    const { data } = await supabase.from('brand_memories').select('conflict_with').eq('id', memoryId).single();
    const existingConflicts: string[] = (data?.conflict_with as string[]) || [];
    if (!existingConflicts.includes(conflictingWithId)) {
      existingConflicts.push(conflictingWithId);
    }

    const { error } = await supabase
      .from('brand_memories')
      .update({
        status: 'conflicted',
        conflict_with: existingConflicts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId);

    return !error;
  }

  private static mapMemory(row: any): BrandMemory {
    return {
      id: row.id,
      projectId: row.project_id || undefined,
      userId: row.user_id || undefined,
      key: row.key,
      category: row.category as MemoryCategory,
      value: row.value,
      confidence: row.confidence,
      status: row.status as MemoryStatus,
      provenance: row.provenance || {
        sourceType: 'conversation',
        extractedAt: row.created_at,
      },
      supersededBy: row.superseded_by || undefined,
      conflictWith: row.conflict_with || undefined,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

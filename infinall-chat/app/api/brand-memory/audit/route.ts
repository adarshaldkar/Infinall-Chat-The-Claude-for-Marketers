// ============================================================
// /api/brand-memory/audit — Full Brand Brain Memory Audit Trail
// Computes memory health metrics, conflict logs, and category distribution
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  try {
    let query = supabase
      .from('brand_memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: memories, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = ((memories || []) as any[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      sessionId: row.session_id,
      category: row.category,
      key: row.memory_key || row.key || '',
      value: row.memory_value || row.value || '',
      confidence: row.confidence ?? 0.9,
      status: row.status || 'active',
      supersededBy: row.superseded_by,
      conflictWith: row.conflict_with,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const total = items.length;
    const activeCount = items.filter((m) => m.status === 'active').length;
    const conflictedCount = items.filter((m) => m.status === 'conflicted').length;
    const supersededCount = items.filter((m) => m.status === 'superseded').length;
    const archivedCount = items.filter((m) => m.status === 'archived').length;

    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    for (const m of items) {
      categoryDistribution[m.category] = (categoryDistribution[m.category] || 0) + 1;
    }

    // Average confidence of active memories
    const activeMemories = items.filter((m) => m.status === 'active');
    const avgConfidence =
      activeMemories.length > 0
        ? activeMemories.reduce((acc, m) => acc + (m.confidence || 0), 0) / activeMemories.length
        : 0;

    // Health score: 100 - (conflicts * 15) - (archived ratio) weighted by confidence
    const conflictPenalty = Math.min(40, conflictedCount * 10);
    const healthScore = Math.max(0, Math.min(100, Math.round(avgConfidence * 100 - conflictPenalty)));

    // Active conflicts requiring attention
    const conflicts = items.filter((m) => m.status === 'conflicted');

    return NextResponse.json({
      audit: {
        totalMemories: total,
        activeCount,
        conflictedCount,
        supersededCount,
        archivedCount,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        healthScore,
        categoryDistribution,
        conflicts,
        recentActivity: items.slice(0, 15),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

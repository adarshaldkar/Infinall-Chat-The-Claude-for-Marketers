import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  thinking: z.string().optional(),
  thinkingDone: z.boolean().optional(),
  toolCalls: z.array(z.unknown()).optional(),
  isStreaming: z.boolean().optional(),
  error: z.unknown().optional(),
  approvalRequired: z.unknown().optional(),
  model: z.string().optional(),
  variants: z.array(z.string()).optional(),
  activeVariantIndex: z.number().optional(),
  researchWorkers: z.array(z.unknown()).optional(),
  researchSynthesizing: z.boolean().optional(),
  researchComplete: z.boolean().optional(),
});

const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messages: z.array(MessageSchema),
  artifact: z.unknown().nullable(),
  artifacts: z.array(z.unknown()).optional(),
  isPinned: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
});

function unauthorized() {
  return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
}

interface SessionRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean | null;
  project_id: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  share_token: string | null;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: unknown;
  thinking: string | null;
}

interface MappedMessage {
  id: string;
  role: string;
  thinking?: string;
  content: string;
}

interface MappedSession {
  id: string;
  title: string;
  messages: MappedMessage[];
  [key: string]: unknown;
}

interface ArtifactRow {
  id: string;
  session_id: string;
  [key: string]: unknown;
}

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return unauthorized();

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ sessions: [], persistence: 'local_fallback' });

  const params = new URL(req.url).searchParams;
  const query = params.get('q')?.trim() || '';
  const includeArchived = params.get('includeArchived') === 'true';
  const includeDeleted = params.get('includeDeleted') === 'true';
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuidUser = session.userId && UUID_REGEX.test(session.userId);

  let sessionQuery = (supabase as SupabaseClient)
    .from('chat_sessions')
    .select('*');

  if (isUuidUser) {
    sessionQuery = sessionQuery.or(`user_id.eq.${session.userId},user_id.is.null`);
  }

  const { data: sessionRows, error: sessionError } = await sessionQuery.order('updated_at', { ascending: false });

  if (sessionError) {
    console.warn('[Sessions API] Supabase query failed (falling back to local):', sessionError.message);
    return NextResponse.json({ sessions: [], persistence: 'local_fallback', warning: sessionError.message });
  }

  const rows = (sessionRows ?? []).filter((row: SessionRow) => {
    if (!includeDeleted && row.deleted_at) return false;
    if (!includeArchived && row.archived_at) return false;
    return true;
  });
  const ids = rows.map((row: { id: string }) => row.id);

  const { data: messageRows } = ids.length
    ? await (supabase as SupabaseClient).from('chat_messages').select('*').in('session_id', ids).order('created_at', { ascending: true })
    : { data: [] };
  const { data: artifactRows } = ids.length
    ? await (supabase as SupabaseClient).from('doc_artifacts').select('*').in('session_id', ids).order('updated_at', { ascending: false })
    : { data: [] };

  const sessions = rows.map((row: SessionRow) => ({
    id: row.id,
    title: row.title,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    isPinned: row.is_pinned,
    projectId: row.project_id ?? null,
    archivedAt: row.archived_at ?? null,
    deletedAt: row.deleted_at ?? null,
    shareToken: row.share_token ?? null,
    messages: (messageRows ?? [])
      .filter((message: MessageRow) => message.session_id === row.id)
      .map((message: MessageRow): MappedMessage => ({
        id: message.id,
        role: message.role,
        thinking: message.thinking ?? undefined,
        content: typeof message.content === 'object' && message.content !== null && 'content' in (message.content as Record<string, unknown>)
          ? String((message.content as Record<string, unknown>).content ?? '')
          : String(message.content ?? ''),
      })),
    artifact: (artifactRows ?? []).find((artifact: ArtifactRow) => artifact.session_id === row.id) ?? null,
    artifacts: (artifactRows ?? []).filter((artifact: ArtifactRow) => artifact.session_id === row.id),
  }));

  const searchedSessions = query
    ? sessions.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.messages.some((message) =>
          typeof message.content === 'string' && message.content.toLowerCase().includes(query.toLowerCase())
        )
      )
    : sessions;
  return NextResponse.json({ sessions: searchedSessions, persistence: 'supabase' });
}

export async function POST(req: NextRequest) {
  return upsertSession(req);
}

export async function PATCH(req: NextRequest) {
  const action = new URL(req.url).searchParams.get('action');
  if (action) return updateSessionLifecycle(req, action);
  return upsertSession(req);
}

async function updateSessionLifecycle(req: NextRequest, action: string) {
  const session = await extractSessionFromRequest(req);
  if (!session) return unauthorized();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ updated: false, persistence: 'local_fallback' });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (action === 'archive') update.archived_at = now;
  else if (action === 'restore') update.archived_at = null;
  else if (action === 'delete') update.deleted_at = now;
  else if (action === 'restore_deleted') update.deleted_at = null;
  else if (action === 'share') {
    update.share_token = crypto.randomUUID();
    update.share_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  } else if (action === 'unshare') {
    update.share_token = null;
    update.share_expires_at = null;
  } else return NextResponse.json({ error: 'Unsupported lifecycle action' }, { status: 400 });

  const { data, error } = await (supabase as SupabaseClient).from('chat_sessions').update(update).eq('id', id).eq('user_id', session.userId).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data, persistence: 'supabase' });
}

async function upsertSession(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return unauthorized();

  const parsed = SessionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ persisted: false, persistence: 'local_fallback' });

  const value = parsed.data;
  const db = supabase as SupabaseClient;
  const now = new Date().toISOString();
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sessionId = UUID_REGEX.test(value.id) ? value.id : crypto.randomUUID();
  const userId = session.userId && UUID_REGEX.test(session.userId) ? session.userId : null;

  // Build session payload
  const sessionPayload: Record<string, unknown> = {
    id: sessionId,
    user_id: userId,
    title: value.title,
    model_id: 'auto',
    is_pinned: value.isPinned ?? false,
    created_at: new Date(value.createdAt).toISOString(),
    updated_at: now,
  };
  if (value.projectId && UUID_REGEX.test(value.projectId)) {
    sessionPayload.project_id = value.projectId;
  }

  let { error: sessionError } = await db.from('chat_sessions').upsert(sessionPayload);

  // If column project_id doesn't exist in the database table yet, retry without it
  if (sessionError && sessionError.message?.includes('project_id')) {
    delete sessionPayload.project_id;
    const retry = await db.from('chat_sessions').upsert(sessionPayload);
    sessionError = retry.error;
  }

  // If foreign key constraint failed on user_id, fallback to null user_id so conversation is not lost
  if (sessionError && (sessionError.message?.includes('foreign key') || sessionError.message?.includes('fkey'))) {
    sessionPayload.user_id = null;
    const retry = await db.from('chat_sessions').upsert(sessionPayload);
    sessionError = retry.error;
  }

  if (sessionError) {
    console.warn('[Sessions API] Supabase upsert error (using local fallback):', sessionError.message);
    return NextResponse.json({ persisted: false, persistence: 'local_fallback', error: sessionError.message });
  }

  // Ensure message IDs are valid UUIDs
  await db.from('chat_messages').delete().eq('session_id', sessionId);
  if (value.messages.length > 0) {
    const { error: msgError } = await db.from('chat_messages').insert(
      value.messages.map((message) => ({
        id: UUID_REGEX.test(message.id) ? message.id : crypto.randomUUID(),
        session_id: sessionId,
        role: message.role,
        content: message,
        thinking: message.thinking ?? null,
        created_at: now,
      }))
    );
    if (msgError) console.warn('[Sessions API] Message insert warning:', msgError.message);
  }

  if (value.artifact) {
    const artifacts = value.artifacts?.length ? value.artifacts : [value.artifact];
    await db.from('doc_artifacts').delete().eq('session_id', sessionId);
    await db.from('doc_artifacts').insert(
      artifacts.map((raw) => {
        const artifact = raw as Record<string, unknown>;
        const artifactId = typeof artifact.id === 'string' && UUID_REGEX.test(artifact.id) ? artifact.id : crypto.randomUUID();
        return {
          id: artifactId,
          session_id: sessionId,
          title: String(artifact.title ?? 'Artifact'),
          type: String(artifact.type ?? 'markdown'),
          language: artifact.language ? String(artifact.language) : null,
          content: String(artifact.content ?? ''),
          version: Number(artifact.version ?? 1),
          updated_at: now,
        };
      })
    );
  } else {
    await db.from('doc_artifacts').delete().eq('session_id', sessionId);
  }

  return NextResponse.json({ persisted: true, persistence: 'supabase', sessionId });
}

export async function DELETE(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return unauthorized();

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Session id is required' }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ deleted: false, persistence: 'local_fallback' });

  const { error } = await (supabase as SupabaseClient)
    .from('chat_sessions')
    .delete()
    .eq('id', id);

  if (error) {
    console.warn('[Sessions API] Supabase delete error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, persistence: 'supabase' });
}

import { NextResponse, NextRequest } from 'next/server';
import { ArtifactVersionStore } from '@/lib/artifacts/version-store';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get('artifactId');

  if (!id) {
    return NextResponse.json({ error: 'artifactId parameter required' }, { status: 400 });
  }

  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { data: artifact } = await (supabase as SupabaseClient)
      .from('doc_artifacts')
      .select('id,session_id')
      .eq('id', id)
      .maybeSingle();
    if (!artifact) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const { data: ownedSession } = await (supabase as SupabaseClient)
      .from('chat_sessions')
      .select('id')
      .eq('id', artifact.session_id)
      .eq('user_id', user.userId)
      .maybeSingle();
    if (!ownedSession) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    const { data: rows, error } = await (supabase as SupabaseClient)
      .from('artifact_versions')
      .select('*')
      .eq('artifact_id', id)
      .eq('user_id', user.userId)
      .order('version', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const latest = rows?.[rows.length - 1];
    return NextResponse.json({ artifactId: id, latestVersion: latest?.version ?? 1, history: rows ?? [], persistence: 'supabase' });
  }

  const history = ArtifactVersionStore.getHistory(id);
  const latest = history[history.length - 1];

  return NextResponse.json({
    artifactId: id,
    latestVersion: latest?.version ?? 1,
    history,
  });
}

const SnapshotSchema = z.object({ artifactId: z.string().uuid(), content: z.string(), version: z.number().int().positive().optional(), summary: z.string().max(500).optional() });

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  const parsed = SnapshotSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    const snapshot = ArtifactVersionStore.commit(parsed.data.artifactId, parsed.data.content, parsed.data.summary);
    return NextResponse.json({ snapshot, persistence: 'local_fallback' });
  }

  const { data: artifact } = await (supabase as SupabaseClient)
    .from('doc_artifacts')
    .select('id,session_id')
    .eq('id', parsed.data.artifactId)
    .maybeSingle();
  if (!artifact) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  const { data: owner } = await (supabase as SupabaseClient).from('chat_sessions').select('id').eq('id', artifact.session_id).eq('user_id', user.userId).maybeSingle();
  if (!owner) return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });

  const { data: latest } = await (supabase as SupabaseClient).from('artifact_versions').select('version').eq('artifact_id', parsed.data.artifactId).eq('user_id', user.userId).order('version', { ascending: false }).limit(1).maybeSingle();
  const version = parsed.data.version ?? ((latest?.version ?? 0) + 1);
  const { data: snapshot, error } = await (supabase as SupabaseClient).from('artifact_versions').insert({
    artifact_id: parsed.data.artifactId,
    user_id: user.userId,
    version,
    content: parsed.data.content,
    summary: parsed.data.summary ?? `Version ${version}`,
    diff_summary: parsed.data.summary ?? null,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ snapshot, persistence: 'supabase' }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { JsonCollection } from '@/lib/storage/db';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ProjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  instructions: z.string().max(50_000).default(''),
});

interface ProjectRecord {
  id: string;
  owner_id: string;
  name: string;
  instructions: string;
  archived_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

function getLocalProjectsCollection(): JsonCollection<ProjectRecord> {
  return new JsonCollection<ProjectRecord>('projects');
}

function authError() {
  return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return authError();
  const supabase = getSupabaseServerClient();
  const localCol = getLocalProjectsCollection();

  if (!supabase) {
    const localProjects = localCol.getAll().filter(p => !p.deleted_at);
    return NextResponse.json({ projects: localProjects, persistence: 'local_fallback' });
  }

  try {
    const [{ data: owned, error: ownedError }, { data: memberships, error: membershipError }] = await Promise.all([
      (supabase as SupabaseClient).from('projects').select('*').eq('owner_id', session.userId).is('deleted_at', null),
      (supabase as SupabaseClient).from('project_members').select('project_id').eq('user_id', session.userId),
    ]);

    if (ownedError || membershipError) {
      console.warn('[Projects API] Supabase query failed (falling back to local):', ownedError?.message || membershipError?.message);
      const localProjects = localCol.getAll().filter(p => !p.deleted_at);
      return NextResponse.json({ projects: localProjects, persistence: 'local_fallback' });
    }

    const memberIds = (memberships ?? []).map((membership: { project_id: string }) => membership.project_id);
    const { data: memberProjects, error: memberProjectError } = memberIds.length
      ? await (supabase as SupabaseClient).from('projects').select('*').in('id', memberIds).is('deleted_at', null)
      : { data: [], error: null };

    if (memberProjectError) {
      const localProjects = localCol.getAll().filter(p => !p.deleted_at);
      return NextResponse.json({ projects: localProjects, persistence: 'local_fallback' });
    }

    const projects = [...(owned ?? []), ...(memberProjects ?? [])]
      .filter((project, index, list) => list.findIndex((candidate) => candidate.id === project.id) === index)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    return NextResponse.json({ projects, persistence: 'supabase' });
  } catch (err) {
    console.warn('[Projects API] Exception in GET projects, using local fallback:', err);
    const localProjects = localCol.getAll().filter(p => !p.deleted_at);
    return NextResponse.json({ projects: localProjects, persistence: 'local_fallback' });
  }
}

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return authError();
  const parsed = ProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const localCol = getLocalProjectsCollection();

  const now = new Date().toISOString();
  const newProject: ProjectRecord = {
    id: crypto.randomUUID(),
    owner_id: session.userId,
    name: parsed.data.name,
    instructions: parsed.data.instructions,
    created_at: now,
    updated_at: now,
  };

  if (!supabase) {
    localCol.set(newProject.id, newProject);
    return NextResponse.json({ project: newProject, persistence: 'local_fallback' }, { status: 201 });
  }

  try {
    const { data, error } = await (supabase as SupabaseClient)
      .from('projects')
      .insert({ id: newProject.id, owner_id: session.userId, name: parsed.data.name, instructions: parsed.data.instructions })
      .select('*')
      .single();

    if (error) {
      console.warn('[Projects API] Supabase insert failed, saving locally:', error.message);
      localCol.set(newProject.id, newProject);
      return NextResponse.json({ project: newProject, persistence: 'local_fallback' }, { status: 201 });
    }

    try {
      await (supabase as SupabaseClient).from('project_members').insert({ project_id: data.id, user_id: session.userId, role: 'owner' });
    } catch {}

    localCol.set(data.id, data);
    return NextResponse.json({ project: data, persistence: 'supabase' }, { status: 201 });
  } catch {
    localCol.set(newProject.id, newProject);
    return NextResponse.json({ project: newProject, persistence: 'local_fallback' }, { status: 201 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return authError();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
  const parsed = ProjectSchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const localCol = getLocalProjectsCollection();

  const existingLocal = localCol.get(id);
  const now = new Date().toISOString();
  if (existingLocal) {
    localCol.set(id, { ...existingLocal, ...parsed.data, updated_at: now });
  }

  if (!supabase) {
    return NextResponse.json({ updated: true, persistence: 'local_fallback' });
  }

  try {
    const { data, error } = await (supabase as SupabaseClient)
      .from('projects')
      .update({ ...parsed.data, updated_at: now })
      .eq('id', id)
      .eq('owner_id', session.userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ project: existingLocal, persistence: 'local_fallback' });
    }
    return NextResponse.json({ project: data, persistence: 'supabase' });
  } catch {
    return NextResponse.json({ project: existingLocal, persistence: 'local_fallback' });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) return authError();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  const localCol = getLocalProjectsCollection();

  const now = new Date().toISOString();
  const existingLocal = localCol.get(id);
  if (existingLocal) {
    localCol.set(id, { ...existingLocal, deleted_at: now, updated_at: now });
  }

  if (!supabase) {
    return NextResponse.json({ deleted: true, persistence: 'local_fallback' });
  }

  try {
    const { error } = await (supabase as SupabaseClient)
      .from('projects')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('owner_id', session.userId);

    if (error) {
      return NextResponse.json({ deleted: true, persistence: 'local_fallback' });
    }
    return NextResponse.json({ deleted: true, persistence: 'supabase' });
  } catch {
    return NextResponse.json({ deleted: true, persistence: 'local_fallback' });
  }
}

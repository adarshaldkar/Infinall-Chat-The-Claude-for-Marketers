import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { encryptCredential } from '@/lib/security/credential-vault';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ConnectionSchema = z.object({
  connectorId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  credentials: z.record(z.string(), z.string()),
  scopes: z.array(z.string()).default([]),
});

function unauthorized() { return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 }); }

export async function GET(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return unauthorized();
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ connections: [], persistence: 'local_fallback' });
  const { data, error } = await (supabase as SupabaseClient)
    .from('connector_connections')
    .select('id,connector_id,display_name,status,scopes,last_health_check_at,last_used_at,expires_at,created_at,updated_at')
    .eq('user_id', user.userId)
    .order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connections: data ?? [], persistence: 'supabase' });
}

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return unauthorized();
  const parsed = ConnectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ connected: false, persistence: 'local_fallback' });

  const encryptedCredentials = encryptCredential(parsed.data.credentials);
  const { data, error } = await (supabase as SupabaseClient).from('connector_connections').upsert({
    user_id: user.userId,
    connector_id: parsed.data.connectorId,
    display_name: parsed.data.displayName,
    encrypted_credentials: encryptedCredentials,
    scopes: parsed.data.scopes,
    status: 'connected',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,connector_id' }).select('id,connector_id,display_name,status,scopes,updated_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connection: data, connected: true, persistence: 'supabase' });
}

export async function DELETE(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return unauthorized();
  const connectorId = new URL(req.url).searchParams.get('connectorId');
  if (!connectorId) return NextResponse.json({ error: 'connectorId is required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ revoked: false, persistence: 'local_fallback' });
  const { error } = await (supabase as SupabaseClient).from('connector_connections').update({ status: 'revoked', encrypted_credentials: null, updated_at: new Date().toISOString() }).eq('user_id', user.userId).eq('connector_id', connectorId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ revoked: true, persistence: 'supabase' });
}

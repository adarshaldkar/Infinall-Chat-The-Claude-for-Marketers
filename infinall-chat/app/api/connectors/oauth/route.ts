import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { encryptCredential } from '@/lib/security/credential-vault';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const StartSchema = z.object({ connectorId: z.string().min(1), scopes: z.array(z.string()).default([]) });

function config(connectorId: string) {
  const prefix = connectorId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return {
    authorizeUrl: process.env[`${prefix}_OAUTH_AUTHORIZE_URL`],
    tokenUrl: process.env[`${prefix}_OAUTH_TOKEN_URL`],
    clientId: process.env[`${prefix}_OAUTH_CLIENT_ID`],
    clientSecret: process.env[`${prefix}_OAUTH_CLIENT_SECRET`],
    redirectUri: process.env[`${prefix}_OAUTH_REDIRECT_URI`] || `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/connectors/oauth`,
  };
}

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  const parsed = StartSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const settings = config(parsed.data.connectorId);
  if (!settings.authorizeUrl || !settings.clientId || !settings.redirectUri) {
    return NextResponse.json({ error: `OAuth is not configured for ${parsed.data.connectorId}` }, { status: 501 });
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'OAuth persistence is unavailable' }, { status: 503 });
  const state = randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await (supabase as SupabaseClient).from('connector_oauth_states').insert({ state, user_id: user.userId, connector_id: parsed.data.connectorId, scopes: parsed.data.scopes, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const url = new URL(settings.authorizeUrl);
  url.searchParams.set('client_id', settings.clientId);
  url.searchParams.set('redirect_uri', settings.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  if (parsed.data.scopes.length) url.searchParams.set('scope', parsed.data.scopes.join(' '));
  return NextResponse.json({ authorizationUrl: url.toString(), expiresAt });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return NextResponse.json({ error: 'OAuth code and state are required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'OAuth persistence is unavailable' }, { status: 503 });
  const { data: pending, error: stateError } = await (supabase as SupabaseClient).from('connector_oauth_states').select('*').eq('state', state).maybeSingle();
  if (stateError || !pending || new Date(pending.expires_at).getTime() < Date.now() || pending.consumed_at) return NextResponse.json({ error: 'Invalid or expired OAuth state' }, { status: 400 });
  const settings = config(pending.connector_id);
  if (!settings.tokenUrl || !settings.clientId || !settings.clientSecret) return NextResponse.json({ error: 'OAuth token exchange is not configured' }, { status: 501 });

  const tokenResponse = await fetch(settings.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: settings.clientId, client_secret: settings.clientSecret, redirect_uri: settings.redirectUri }) });
  if (!tokenResponse.ok) return NextResponse.json({ error: `OAuth token exchange failed (${tokenResponse.status})` }, { status: 502 });
  const tokens = await tokenResponse.json() as Record<string, unknown>;
  await (supabase as SupabaseClient).from('connector_oauth_states').update({ consumed_at: new Date().toISOString() }).eq('state', state);
  const expiresAt = typeof tokens.expires_in === 'number' ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
  const { error } = await (supabase as SupabaseClient).from('connector_connections').upsert({ user_id: pending.user_id, connector_id: pending.connector_id, display_name: pending.connector_id, encrypted_credentials: encryptCredential(tokens), scopes: pending.scopes ?? [], status: 'connected', expires_at: expiresAt, updated_at: new Date().toISOString() }, { onConflict: 'user_id,connector_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ connected: true, connectorId: pending.connector_id });
}

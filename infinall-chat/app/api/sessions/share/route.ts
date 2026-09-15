import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Sharing is unavailable' }, { status: 503 });

  const { data: session, error } = await (supabase as SupabaseClient)
    .from('chat_sessions')
    .select('id,title,created_at,updated_at,share_expires_at,chat_messages(*),doc_artifacts(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !session) return NextResponse.json({ error: 'Shared session not found' }, { status: 404 });
  if (session.share_expires_at && new Date(session.share_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
  }
  return NextResponse.json({ session });
}
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HandoffSchema = z.object({
  action: z.enum(['google_drive', 'approval_center']),
  artifactId: z.string(),
  title: z.string().min(1),
  type: z.string(),
  content: z.string(),
});

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  const parsed = HandoffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Handoff persistence is unavailable' }, { status: 503 });

  if (parsed.data.action === 'google_drive') {
    const { data: connection } = await (supabase as SupabaseClient)
      .from('connector_connections')
      .select('id,status,scopes')
      .eq('user_id', user.userId)
      .eq('connector_id', 'google_drive')
      .eq('status', 'connected')
      .maybeSingle();
    if (!connection) return NextResponse.json({ error: 'Google Drive is not connected for this account.' }, { status: 409 });
    return NextResponse.json({ error: 'Google Drive upload worker is not configured.' }, { status: 501 });
  }

  return NextResponse.json({ error: 'Approval Center handoff is not configured for this deployment.' }, { status: 501 });
}

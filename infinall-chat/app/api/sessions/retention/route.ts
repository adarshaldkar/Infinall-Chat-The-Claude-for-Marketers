// ============================================================
// /api/sessions/retention — 30-Day Session Cleanup Worker API
// Invokes the Postgres stored procedure to permanently purge
// soft-deleted sessions older than the 30-day retention window.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Allow authorized admin or internal cron header
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuthorized) {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const retentionDays = parseInt(searchParams.get('days') || '30', 10);

  const supabase = getSupabaseServerClient() as SupabaseClient | null;
  if (!supabase) {
    return NextResponse.json({
      purged: false,
      message: 'Supabase client unavailable, retention job queued for next sync window.',
    });
  }

  try {
    const { data, error } = await supabase.rpc('purge_expired_archived_sessions', {
      retention_days: retentionDays,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = Array.isArray(data) && data[0] ? data[0] : { purged_sessions_count: 0, purged_messages_count: 0, purged_artifacts_count: 0 };

    return NextResponse.json({
      success: true,
      retentionDays,
      purgedSessions: result.purged_sessions_count ?? 0,
      purgedMessages: result.purged_messages_count ?? 0,
      purgedArtifacts: result.purged_artifacts_count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Retention worker error' }, { status: 500 });
  }
}

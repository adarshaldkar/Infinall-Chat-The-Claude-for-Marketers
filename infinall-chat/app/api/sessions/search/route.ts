// ============================================================
// /api/sessions/search — Full-Text History Search API
// Queries Postgres tsvector with GIN index & relevance ranking
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await extractSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';
    const projectId = searchParams.get('projectId') || null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const supabase = getSupabaseServerClient() as SupabaseClient | null;

    if (supabase) {
      const { data, error } = await supabase.rpc('search_chat_history', {
        search_query: query,
        filter_user_id: session.userId || null,
        filter_project_id: projectId,
        match_count: limit,
      });

      if (!error && data && Array.isArray(data)) {
        return NextResponse.json({
          results: data.map((r: { session_id: string; session_title: string; message_id: string; role: string; content_snippet: string; is_pinned: boolean | null; updated_at: string; rank: number }) => ({
            sessionId: r.session_id,
            sessionTitle: r.session_title,
            messageId: r.message_id,
            role: r.role,
            snippet: r.content_snippet,
            isPinned: r.is_pinned,
            updatedAt: r.updated_at,
            rank: r.rank,
          })),
        });
      }
    }

    return NextResponse.json({ results: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

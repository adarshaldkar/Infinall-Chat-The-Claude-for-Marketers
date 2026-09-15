// ============================================================
// /api/knowledge/documents — List & Manage Indexed Knowledge Documents
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { extractSessionFromRequest } from '@/lib/security/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ documents: data });
      }
    } catch (_) {}
  }

  // Fallback to local storage
  const localDocPath = path.resolve(process.cwd(), '.data', 'knowledge', 'documents.json');
  if (fs.existsSync(localDocPath)) {
    try {
      const docs = JSON.parse(fs.readFileSync(localDocPath, 'utf8'))
        .filter((doc: { userId?: string }) => doc.userId === session.userId);
      return NextResponse.json({ documents: docs });
    } catch (_) {}
  }

  return NextResponse.json({ documents: [] });
}

// ============================================================
// /api/knowledge/memories — List & Inspect Consolidated Brand Memories
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
        .from('brand_memories')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return NextResponse.json({ memories: data });
      }
    } catch (_) {}
  }

  // Fallback to local storage
  const localMemPath = path.resolve(process.cwd(), '.data', 'memories', 'brand_memories.json');
  if (fs.existsSync(localMemPath)) {
    try {
      const memories = JSON.parse(fs.readFileSync(localMemPath, 'utf8'))
        .filter((memory: { userId?: string }) => memory.userId === session.userId);
      return NextResponse.json({ memories });
    } catch (_) {}
  }

  return NextResponse.json({ memories: [] });
}

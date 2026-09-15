// ============================================================
// /api/research/start — Start Autonomous Background Research Job
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { ResearchJobQueue } from '@/lib/jobs/research-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { query, projectId } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Research query is required' }, { status: 400 });
    }

    const job = ResearchJobQueue.createJob(session.userId, query.trim(), projectId);

    return NextResponse.json({ success: true, job }, { status: 202 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

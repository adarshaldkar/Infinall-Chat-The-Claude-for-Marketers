// ============================================================
// /api/research/[id]/results — Final Research Output & Citations
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { ResearchJobQueue } from '@/lib/jobs/research-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await extractSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }

  const { id } = await params;
  const job = ResearchJobQueue.getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Research job not found' }, { status: 404 });
  }

  if (job.status !== 'completed') {
    return NextResponse.json(
      { error: 'Research job is not completed yet', status: job.status, progress: job.progressPercent },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: job.id,
    query: job.query,
    results: job.results,
    completedAt: job.updatedAt,
  });
}

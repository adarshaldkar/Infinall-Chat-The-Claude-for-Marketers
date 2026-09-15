// ============================================================
// /api/research/[id]/status — Research Job Status & Progress
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

  return NextResponse.json({
    id: job.id,
    status: job.status,
    progressPercent: job.progressPercent,
    currentStep: job.currentStep,
    eventCount: job.events.length,
    updatedAt: job.updatedAt,
    error: job.error,
  });
}

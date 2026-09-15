import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { extractSessionFromRequest } from '@/lib/security/auth';
import { enqueueJob, getLocalJob } from '@/lib/jobs/queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JobSchema = z.object({ kind: z.enum(['research', 'document_ingestion']), payload: z.unknown() });

export async function POST(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  const parsed = JobSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const job = await enqueueJob(parsed.data.kind, user.userId, parsed.data.payload);
  return NextResponse.json({ job, queue: process.env.REDIS_URL ? 'redis' : 'local_fallback' }, { status: 202 });
}

export async function GET(req: NextRequest) {
  const user = await extractSessionFromRequest(req);
  if (!user) return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Job id is required' }, { status: 400 });
  const job = getLocalJob(id);
  if (!job || job.userId !== user.userId) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}

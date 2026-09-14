// ============================================================
// /api/chat/approval/reject — Mutation Rejection & Replanning
// Records user rejection reason and feeds it back to the agent
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rejectApproval } from '@/lib/tools/approval/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RejectSchema = z.object({
  executionId: z.string().uuid(),
  sessionId: z.string(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { executionId, sessionId, reason } = parsed.data;

  const result = rejectApproval(executionId, sessionId, reason);

  if (!result.ok) {
    return NextResponse.json({ error: 'APPROVAL_NOT_FOUND_OR_EXPIRED' }, { status: 404 });
  }

  return NextResponse.json({
    status: 'rejected',
    executionId,
    reason: reason ?? 'User rejected mutation proposal without comment',
    replanned: true,
  });
}

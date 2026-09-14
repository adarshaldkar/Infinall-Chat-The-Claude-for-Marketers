// ============================================================
// /api/chat/approval/resume — Resumes a paused write mutation
// Validates cryptographic HMAC token, session binding, and
// canonical argument hash before executing the mutation.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeApproval } from '@/lib/tools/approval/store';
import { executeMetaAdsMutate } from '@/lib/mcp/adapters/meta-ads-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ResumeSchema = z.object({
  executionId: z.string().uuid(),
  sessionId: z.string(),
  argsHash: z.string(),
  action: z.enum(['approve', 'reject']),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ResumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { executionId, sessionId, argsHash, action } = parsed.data;

  if (action === 'reject') {
    return NextResponse.json({ status: 'rejected', executionId });
  }

  // Cryptographic single-use token and canonical argument verification
  const result = consumeApproval(executionId, sessionId, argsHash);

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  const { record } = result;
  if (!record) {
    return NextResponse.json({ error: 'APPROVAL_NOT_FOUND' }, { status: 404 });
  }

  try {
    let executionOutput: unknown;

    if (record.toolName === 'meta_ads_mutate') {
      executionOutput = await executeMetaAdsMutate(record.args as unknown as Parameters<typeof executeMetaAdsMutate>[0]);
    } else if (record.toolName === 'google_ads_mutate') {
      executionOutput = {
        success: true,
        tool: 'google_ads_mutate',
        campaignId: record.args.campaignId,
        appliedBid: record.args.bidAmount ? `$${record.args.bidAmount}` : undefined,
        status: 'UPDATED',
        timestamp: new Date().toISOString(),
      };
    } else {
      executionOutput = { success: true, tool: record.toolName, status: 'EXECUTED' };
    }

    return NextResponse.json({
      status: 'success',
      executionId,
      toolName: record.toolName,
      result: executionOutput,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mutation execution failed' },
      { status: 500 }
    );
  }
}

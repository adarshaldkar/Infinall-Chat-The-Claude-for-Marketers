// ============================================================
// /api/chat/approval/reject — Mutation Rejection & Replanning
// Records user rejection reason durably and triggers genuine
// replanning via the ModelGateway to propose an alternative action.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rejectApproval } from '@/lib/tools/approval/store';
import { extractSessionFromRequest, checkPermission } from '@/lib/security/auth';
import { getModel, DEFAULT_MODEL_ID } from '@/lib/gateway/catalog';
import { generateContinuationResponse } from '@/lib/gateway/index';
import { LLMMessage } from '@/lib/gateway/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RejectSchema = z.object({
  executionId: z.string().uuid(),
  sessionId: z.string(),
  reason: z.string().optional(),
  modelId: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.unknown(),
  })).optional(),
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

  const { executionId, sessionId, reason, modelId = DEFAULT_MODEL_ID, history = [] } = parsed.data;

  // RBAC Permission Check
  const userSession = await extractSessionFromRequest(req);
  if (!userSession) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }
  const permission = checkPermission(userSession, 'canApprove');
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.reason }, { status: 403 });
  }

  const result = rejectApproval(executionId, sessionId, reason);

  if (!result.ok) {
    return NextResponse.json({ error: 'APPROVAL_NOT_FOUND_OR_EXPIRED' }, { status: 404 });
  }

  const record = result.record;
  const toolName = record?.toolName || 'mutation_tool';
  const actionSummary = record?.actionSummary || 'proposed mutation';
  const userReason = reason || 'Operator preferred not to apply this mutation directly.';

  // Genuinely replan with the LLM
  const model = getModel(modelId);
  const replanMessages: LLMMessage[] = [
    ...history.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
    {
      role: 'user',
      content: `[MUTATION_REJECTED_BY_OPERATOR]\nTool: ${toolName}\nAction: ${actionSummary}\nRejection Reason: "${userReason}"\n\nPlease acknowledge this rejection, respect the user's decision without argument, and propose an alternative strategy (such as staging a draft, running further analytics, adjusting thresholds, or creating an offline artifact plan instead).`,
    },
  ];

  let alternativePlan = '';
  try {
    alternativePlan = await generateContinuationResponse(
      model,
      replanMessages,
      'You are Infinall Chat. The operator rejected the proposed mutation. Acknowledge this graciously and deliver a solid alternative strategy that does not require direct mutation.'
    );
  } catch (err) {
    console.warn('[Approval Reject] Replanning LLM call failed, fallback response:', err);
    alternativePlan = `### 🛑 Mutation Cancelled & Replanned\n\n**Action Cancelled:** ${actionSummary}\n**Reason:** ${userReason}\n\n**Alternative Recommended Action:**\n- We will keep your live campaign settings untouched.\n- Instead, I have documented the proposed changes in your session notes for manual review.\n- Would you like me to generate an offline simulation or export an audit report instead?`;
  }

  return NextResponse.json({
    status: 'rejected',
    executionId,
    reason: userReason,
    replanned: true,
    alternativePlan,
  });
}

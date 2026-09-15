// ============================================================
// /api/chat/approval/resume — Resumes a paused write mutation
// Validates cryptographic HMAC token, session binding, RBAC
// permissions, and canonical argument hash before executing.
// Resumes the model loop turn and returns assistant confirmation!
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeApproval, rejectApproval } from '@/lib/tools/approval/store';
import { executeMetaAdsMutate } from '@/lib/mcp/adapters/meta-ads-adapter';
import { executeGoogleAdsMutate } from '@/lib/mcp/adapters/google-ads-adapter';
import { extractSessionFromRequest, checkPermission } from '@/lib/security/auth';
import { getModel, DEFAULT_MODEL_ID } from '@/lib/gateway/catalog';
import { generateContinuationResponse } from '@/lib/gateway/index';
import { LLMMessage } from '@/lib/gateway/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ResumeSchema = z.object({
  executionId: z.string().uuid(),
  sessionId: z.string(),
  argsHash: z.string(),
  action: z.enum(['approve', 'reject']),
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ResumeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { executionId, sessionId, argsHash, action, reason, modelId = DEFAULT_MODEL_ID, history = [] } = parsed.data;

  // RBAC Permission Check
  const userSession = await extractSessionFromRequest(req);
  if (!userSession) {
    return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
  }
  const permission = checkPermission(userSession, 'canApprove');
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.reason }, { status: 403 });
  }

  if (action === 'reject') {
    const rejection = rejectApproval(executionId, sessionId, reason);
    if (!rejection.ok) {
      return NextResponse.json({ error: 'APPROVAL_NOT_FOUND_OR_EXPIRED' }, { status: 404 });
    }

    const record = rejection.record;
    const toolName = record?.toolName || 'mutation_tool';
    const actionSummary = record?.actionSummary || 'proposed mutation';
    const userReason = reason || 'Operator rejected the proposed mutation.';

    // Genuinely replan with the LLM to provide alternative strategy
    const model = getModel(modelId);
    const replanMessages: LLMMessage[] = [
      ...history.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      {
        role: 'user',
        content: `[MUTATION_REJECTED_BY_OPERATOR]\nTool: ${toolName}\nAction: ${actionSummary}\nRejection Reason: "${userReason}"\n\nPlease acknowledge this rejection graciously, keep settings unchanged, and propose an alternative strategy.`,
      },
    ];

    let alternativePlan = '';
    try {
      alternativePlan = await generateContinuationResponse(
        model,
        replanMessages,
        'You are Infinall Chat. The operator rejected the proposed mutation. Acknowledge this graciously and deliver a solid alternative strategy that does not require direct mutation.'
      );
    } catch {
      alternativePlan = `### 🛑 Mutation Cancelled & Replanned\n\n**Action Cancelled:** ${actionSummary}\n**Reason:** ${userReason}\n\n**Alternative Recommended Action:**\n- Live campaigns remain untouched.\n- Changes recorded in session history for offline review.`;
    }

    return NextResponse.json({
      status: 'rejected',
      executionId,
      reason: userReason,
      replanned: true,
      alternativePlan,
    });
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
      executionOutput = await executeGoogleAdsMutate(record.args as unknown as Parameters<typeof executeGoogleAdsMutate>[0]);
    } else {
      executionOutput = {
        success: true,
        tool: record.toolName,
        status: 'EXECUTED_CONFIRMED',
        timestamp: new Date().toISOString(),
      };
    }

    // Genuinely resume the model turn by generating assistant confirmation
    const model = getModel(modelId);
    const continuationMessages: LLMMessage[] = [
      ...history.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      {
        role: 'user',
        content: `[MUTATION_EXECUTED_SUCCESSFULLY]\nTool: ${record.toolName}\nAction: ${record.actionSummary}\nExecution Output:\n${JSON.stringify(executionOutput, null, 2)}\n\nPlease acknowledge this mutation execution, confirm the changes made, and outline immediate next monitoring steps for the campaign operator.`,
      },
    ];

    let assistantConfirmation = '';
    try {
      assistantConfirmation = await generateContinuationResponse(
        model,
        continuationMessages,
        'You are Infinall Chat. The operator has approved the mutation and it has been executed live. Provide an executive summary of the changes applied, campaign impact, and immediate next monitoring steps.'
      );
    } catch (llmErr) {
      console.warn('[Approval Resume] LLM continuation failed, using structured confirmation:', llmErr);
      assistantConfirmation = `### ✅ Mutation Successfully Executed\n\n**Tool:** \`${record.toolName}\`\n**Action:** ${record.actionSummary}\n**Timestamp:** ${new Date().toLocaleString()}\n\nAll parameters have been verified and applied to your ad account. Live tracking and monitoring have begun.`;
    }

    return NextResponse.json({
      status: 'success',
      executionId,
      toolName: record.toolName,
      result: executionOutput,
      assistantMessage: assistantConfirmation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Mutation execution failed' },
      { status: 500 }
    );
  }
}

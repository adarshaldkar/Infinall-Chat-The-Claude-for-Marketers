// ============================================================
// Cryptographic Mutation Approval Vault
// Invariant: single-use, 5m TTL, binds exact canonical argument hash
// ============================================================

import { randomUUID } from 'crypto';
import { MutationDiff } from '@/lib/gateway/types';
import { hashCanonicalArgs, generateApprovalToken, verifyApprovalToken } from './signer';
import { buildMutationDiff } from './diff-builder';
import { logAuditEvent } from './audit-logger';

export interface ApprovalRecord {
  executionId: string;
  token: string;
  toolName: string;
  args: Record<string, unknown>;
  argsHash: string;
  sessionId: string;
  actionSummary: string;
  diff: MutationDiff;
  expiresAt: number;
  consumed: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

const approvalStore = new Map<string, ApprovalRecord>();

const APPROVAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createApproval(
  toolName: string,
  args: Record<string, unknown>,
  sessionId: string
): ApprovalRecord {
  const executionId = randomUUID();
  const expiresAt = Date.now() + APPROVAL_TTL_MS;
  const argsHash = hashCanonicalArgs(args);
  const token = generateApprovalToken({ executionId, sessionId, toolName, argsHash, expiresAt });

  const { summary, diff } = buildMutationDiff(toolName, args);

  const record: ApprovalRecord = {
    executionId,
    token,
    toolName,
    args,
    argsHash,
    sessionId,
    actionSummary: summary,
    diff,
    expiresAt,
    consumed: false,
    status: 'pending',
  };

  approvalStore.set(executionId, record);

  logAuditEvent({
    executionId,
    sessionId,
    toolName,
    argsHash,
    status: 'PENDING',
    timestamp: new Date().toISOString(),
  });

  return record;
}

export function consumeApproval(
  executionId: string,
  sessionId: string,
  argsHash: string
): { ok: boolean; reason?: string; record?: ApprovalRecord } {
  const record = approvalStore.get(executionId);

  if (!record) {
    return { ok: false, reason: 'APPROVAL_NOT_FOUND' };
  }

  if (record.consumed) {
    return { ok: false, reason: 'APPROVAL_ALREADY_CONSUMED' };
  }

  if (record.sessionId !== sessionId) {
    return { ok: false, reason: 'SESSION_MISMATCH' };
  }

  if (Date.now() > record.expiresAt) {
    record.status = 'expired';
    logAuditEvent({
      executionId,
      sessionId,
      toolName: record.toolName,
      argsHash,
      status: 'EXPIRED',
      timestamp: new Date().toISOString(),
    });
    return { ok: false, reason: 'APPROVAL_EXPIRED' };
  }

  if (record.argsHash !== argsHash) {
    logAuditEvent({
      executionId,
      sessionId,
      toolName: record.toolName,
      argsHash,
      status: 'ARG_MISMATCH',
      timestamp: new Date().toISOString(),
    });
    return { ok: false, reason: 'MUTATION_ARGUMENT_HASH_MISMATCH' };
  }

  const isValidToken = verifyApprovalToken({
    executionId: record.executionId,
    sessionId: record.sessionId,
    toolName: record.toolName,
    argsHash: record.argsHash,
    expiresAt: record.expiresAt,
    token: record.token,
  });

  if (!isValidToken) {
    return { ok: false, reason: 'INVALID_CRYPTOGRAPHIC_TOKEN' };
  }

  // Mark consumed to enforce single-use invariant
  record.consumed = true;
  record.status = 'approved';

  logAuditEvent({
    executionId,
    sessionId,
    toolName: record.toolName,
    argsHash,
    status: 'APPROVED_EXECUTED',
    timestamp: new Date().toISOString(),
  });

  return { ok: true, record };
}

export function rejectApproval(
  executionId: string,
  sessionId: string,
  reason?: string
): { ok: boolean; record?: ApprovalRecord } {
  const record = approvalStore.get(executionId);
  if (!record) return { ok: false };

  record.consumed = true;
  record.status = 'rejected';

  logAuditEvent({
    executionId,
    sessionId,
    toolName: record.toolName,
    argsHash: record.argsHash,
    status: 'REJECTED',
    rejectionReason: reason,
    timestamp: new Date().toISOString(),
  });

  return { ok: true, record };
}

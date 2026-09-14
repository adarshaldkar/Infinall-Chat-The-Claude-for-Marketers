// ============================================================
// Cryptographic Mutation Approval Vault
// Invariant: single-use, 5m TTL, binds exact canonical argument hash
// Persisted durably to disk so restarts do not lose pending approvals
// ============================================================

import { randomUUID } from 'crypto';
import { MutationDiff } from '@/lib/gateway/types';
import { hashCanonicalArgs, generateApprovalToken, verifyApprovalToken } from './signer';
import { buildMutationDiff } from './diff-builder';
import { logAuditEvent } from './audit-logger';
import { db, ApprovalRecordItem } from '@/lib/storage/db';

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

const APPROVAL_TTL_MS = 5 * 60 * 1000; // 5 minutes

function toRecord(item: ApprovalRecordItem): ApprovalRecord {
  return {
    executionId: item.id,
    token: (item.args as Record<string, unknown>)?.__token as string || '',
    toolName: item.toolName,
    args: item.args,
    argsHash: item.expectedHash,
    sessionId: item.sessionId || '',
    actionSummary: item.diffSummary,
    diff: {
      account: 'Infinall Marketing',
      campaignName: item.toolName,
      budgetChange: item.diffSummary,
      rawParams: item.args,
    },
    expiresAt: item.expiresAt ? new Date(item.expiresAt).getTime() : Date.now() + APPROVAL_TTL_MS,
    consumed: item.status !== 'pending',
    status: item.status,
  };
}

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

  // Persist durably to storage
  db.approvals.set(executionId, {
    id: executionId,
    toolCallId: executionId,
    toolName,
    args: { ...args, __token: token },
    expectedHash: argsHash,
    diffSummary: summary,
    riskLevel: 'HIGH',
    status: 'pending',
    sessionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  });

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
  const item = db.approvals.get(executionId);

  if (!item) {
    return { ok: false, reason: 'APPROVAL_NOT_FOUND' };
  }

  const record = toRecord(item);

  if (record.consumed || item.status !== 'pending') {
    return { ok: false, reason: 'APPROVAL_ALREADY_CONSUMED' };
  }

  if (record.sessionId !== sessionId) {
    return { ok: false, reason: 'SESSION_MISMATCH' };
  }

  if (Date.now() > record.expiresAt) {
    item.status = 'expired';
    item.updatedAt = new Date().toISOString();
    db.approvals.set(executionId, item);
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
  item.status = 'approved';
  item.updatedAt = new Date().toISOString();
  db.approvals.set(executionId, item);

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
  const item = db.approvals.get(executionId);
  if (!item) return { ok: false };

  item.status = 'rejected';
  item.rejectionReason = reason;
  item.updatedAt = new Date().toISOString();
  db.approvals.set(executionId, item);

  const record = toRecord(item);
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

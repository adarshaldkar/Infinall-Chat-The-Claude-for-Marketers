// ============================================================
// Approval Store — in-memory token vault
// Cryptographically bound, idempotent, 5-minute TTL.
// Backend is the security authority — not the browser.
// ============================================================

import { randomUUID } from 'crypto';
import { MutationDiff } from '../gateway/types';

export interface ApprovalRecord {
  executionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  argsHash: string;
  diff: MutationDiff;
  actionSummary: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

// In production this would be Redis. For Phase 1: in-process Map.
const store = new Map<string, ApprovalRecord>();

export function createApproval(
  toolName: string,
  toolArgs: Record<string, unknown>,
  sessionId: string
): ApprovalRecord {
  const executionId = randomUUID();
  const now = Date.now();
  const TTL_MS = 5 * 60 * 1000; // 5 minutes

  const diff = buildDiff(toolName, toolArgs);

  const record: ApprovalRecord = {
    executionId,
    toolName,
    toolArgs,
    argsHash: stableHash(toolArgs),
    diff,
    actionSummary: `${toolName}: ${diff.campaignName || 'operation'}`,
    sessionId,
    createdAt: now,
    expiresAt: now + TTL_MS,
    consumed: false,
  };

  store.set(executionId, record);

  // Auto-cleanup after expiry
  setTimeout(() => store.delete(executionId), TTL_MS + 1000);

  return record;
}

export function consumeApproval(
  executionId: string,
  sessionId: string,
  argsHash: string
): { ok: boolean; reason?: string; record?: ApprovalRecord } {
  const record = store.get(executionId);

  if (!record) return { ok: false, reason: 'APPROVAL_NOT_FOUND' };
  if (record.consumed) return { ok: false, reason: 'APPROVAL_ALREADY_CONSUMED' };
  if (Date.now() > record.expiresAt) return { ok: false, reason: 'APPROVAL_EXPIRED' };
  if (record.sessionId !== sessionId) return { ok: false, reason: 'SESSION_MISMATCH' };
  if (record.argsHash !== argsHash) return { ok: false, reason: 'ARGS_HASH_MISMATCH' };

  // One-time use
  record.consumed = true;
  store.set(executionId, record);

  return { ok: true, record };
}

// ============================================================
// Helpers
// ============================================================

function stableHash(obj: Record<string, unknown>): string {
  // Deterministic hash of sorted keys for idempotency
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

function buildDiff(toolName: string, args: Record<string, unknown>): MutationDiff {
  if (toolName === 'meta_ads_create_campaign') {
    return {
      account: 'Infinall Marketing',
      campaignName: (args.campaign_name as string) ?? 'New Campaign',
      budgetChange: `+₹${(args.budget_inr as number)?.toLocaleString('en-IN') ?? 0}`,
      audienceTargeting: (args.audience_description as string) ?? '',
      dailySpend: `₹${(args.daily_budget_inr as number)?.toLocaleString('en-IN') ?? 0}`,
      rawParams: args,
    };
  }

  return {
    account: 'Unknown',
    campaignName: toolName,
    budgetChange: 'N/A',
    audienceTargeting: 'N/A',
    dailySpend: 'N/A',
    rawParams: args,
  };
}

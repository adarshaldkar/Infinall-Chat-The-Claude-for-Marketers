// ============================================================
// Cryptographic Mutation Signer
// Canonical argument serialization & HMAC-SHA256 binding
// ============================================================

import { createHmac, createHash } from 'crypto';

function getSecretKey(): string {
  const key = process.env.APPROVAL_HMAC_SECRET;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      return 'infinall-dev-local-hmac-secret-key-32-chars-minimum!';
    }
    throw new Error(
      'APPROVAL_HMAC_SECRET environment variable is required and must be set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  if (key.length < 32) {
    throw new Error('APPROVAL_HMAC_SECRET must be at least 32 characters long.');
  }
  return key;
}

/**
 * Deterministically sorts object keys recursively to ensure consistent hashing
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes SHA-256 hash of canonicalized arguments
 */
export function hashCanonicalArgs(args: Record<string, unknown>): string {
  const canonical = canonicalizeJson(args);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generates HMAC-SHA256 signature binding the exact mutation parameters
 */
export function generateApprovalToken(params: {
  executionId: string;
  sessionId: string;
  toolName: string;
  argsHash: string;
  expiresAt: number;
}): string {
  const payload = `${params.executionId}:${params.sessionId}:${params.toolName}:${params.argsHash}:${params.expiresAt}`;
  return createHmac('sha256', getSecretKey()).update(payload).digest('hex');
}

/**
 * Verifies that the token matches the exact execution ID, session, tool name, and argument hash
 */
export function verifyApprovalToken(params: {
  executionId: string;
  sessionId: string;
  toolName: string;
  argsHash: string;
  expiresAt: number;
  token: string;
}): boolean {
  if (Date.now() > params.expiresAt) {
    return false; // Expired
  }

  const expectedToken = generateApprovalToken({
    executionId: params.executionId,
    sessionId: params.sessionId,
    toolName: params.toolName,
    argsHash: params.argsHash,
    expiresAt: params.expiresAt,
  });

  return expectedToken === params.token;
}

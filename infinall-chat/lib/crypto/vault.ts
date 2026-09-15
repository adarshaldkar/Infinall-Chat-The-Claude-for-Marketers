// ============================================================
// Infinall Chat - Encrypted Credential & Token Vault
// AES-256-GCM symmetric encryption for OAuth tokens & API credentials
// Guarantees zero plaintext secrets stored in Postgres or context logs
// ============================================================

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Derives a 32-byte (256-bit) encryption key from the environment secret.
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'infinall-enterprise-credential-master-key-default-salt-2026';

  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  cipherText: string; // Base64 encoded: IV + CipherText + AuthTag
  algorithm: string;
  version: number;
}

/**
 * Encrypts sensitive string (OAuth access token, refresh token, API secret) using AES-256-GCM.
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return '';

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Combine IV (12 bytes) + AuthTag (16 bytes) + Encrypted Data into unified buffer
  const payloadBuffer = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
  return payloadBuffer.toString('base64');
}

/**
 * Decrypts AES-256-GCM encrypted payload back to plaintext secret.
 */
export function decryptCredential(encodedPayload: string): string {
  if (!encodedPayload) return '';

  try {
    const rawBuffer = Buffer.from(encodedPayload, 'base64');
    if (rawBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted payload too short');
    }

    const key = getMasterKey();
    const iv = rawBuffer.subarray(0, IV_LENGTH);
    const authTag = rawBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const cipherText = rawBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Vault] Decryption failed:', err instanceof Error ? err.message : err);
    throw new Error('Failed to decrypt credential. Master key or ciphertext mismatch.');
  }
}

/**
 * Masks sensitive keys for UI and logs (e.g., "sk-live-1234567890abcdef" -> "sk-li••••cdef")
 */
export function maskSecret(secret: string): string {
  if (!secret) return '••••••••';
  const clean = secret.trim();
  if (clean.length <= 8) return '••••••••';
  const prefix = clean.slice(0, 4);
  const suffix = clean.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Sanitizes an object by masking any keys with sensitive names before sending to logs or LLM context
 */
export function sanitizeContextObject(obj: unknown): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return {};

  const SENSITIVE_KEYS = [
    'password',
    'secret',
    'token',
    'apikey',
    'api_key',
    'authorization',
    'access_token',
    'refresh_token',
    'client_secret',
  ];

  const clone: Record<string, unknown> = Array.isArray(obj) ? ([] as unknown as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s.replace(/[-_]/g, '')));

    if (isSensitive && typeof value === 'string') {
      clone[key] = maskSecret(value);
    } else if (value && typeof value === 'object') {
      clone[key] = sanitizeContextObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

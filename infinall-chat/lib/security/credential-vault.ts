import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

function key() {
  const configured = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('CONNECTOR_ENCRYPTION_KEY is required in production');
  }
  return createHash('sha256').update(configured || 'infinall-local-connector-key').digest();
}

export function encryptCredential(value: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptCredential(payload: string): Record<string, unknown> {
  const [ivText, tagText, ciphertextText] = payload.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted credential payload');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8')) as Record<string, unknown>;
}

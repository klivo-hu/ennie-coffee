import 'server-only';
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';

/** 256-bit random token, base64url — used for refresh tokens and recovery codes. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Refresh tokens and recovery codes are high-entropy random values, so a fast hash is the right
 * tool: it makes a leak of the stored values useless without making lookups expensive.
 * (Passwords, which are low-entropy, use Argon2id instead — see password.ts.)
 */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

const KEY_INFO = 'ennie-coffee/mfa-secret/v1';

function encryptionKey(): Buffer {
  const material = process.env.APP_ENCRYPTION_KEY;
  if (!material || material.length < 32) {
    throw new Error('APP_ENCRYPTION_KEY must be set (at least 32 characters) to use MFA.');
  }
  // HKDF separates this purpose's key from any other use of the same secret.
  return Buffer.from(hkdfSync('sha256', material, 'ennie-coffee', KEY_INFO, 32));
}

/** AES-256-GCM. Output: base64url(iv).base64url(tag).base64url(ciphertext). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptSecret(payload: string): string {
  const [iv, tag, ciphertext] = payload.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !ciphertext) throw new Error('Malformed encrypted secret.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

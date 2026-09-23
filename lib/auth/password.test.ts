import { describe, expect, it } from 'vitest';
import { hashPassword, passwordProblem, verifyPassword } from './password';

describe('password hashing', () => {
  it('stores an Argon2id hash, never the password', async () => {
    const encoded = await hashPassword('egy hosszú, könnyen megjegyezhető mondat');
    expect(encoded.startsWith('$argon2id$')).toBe(true);
    expect(encoded).not.toContain('mondat');
    expect(await verifyPassword(encoded, 'egy hosszú, könnyen megjegyezhető mondat')).toBe(true);
    expect(await verifyPassword(encoded, 'egy hosszú, könnyen megjegyezhető mondat!')).toBe(false);
  });

  it('treats a malformed hash as a failed verification, not an error', async () => {
    expect(await verifyPassword('not-a-hash', 'whatever-password')).toBe(false);
  });
});

describe('passwordProblem', () => {
  it('enforces length, not composition', () => {
    expect(passwordProblem('rövid')).not.toBeNull();
    expect(passwordProblem('csak kisbetűs, de hosszú jelszó')).toBeNull();
  });

  it('refuses common and contextual passwords', () => {
    expect(passwordProblem('password1234')).not.toBeNull();
    expect(passwordProblem('Enniecoffee2026!')).not.toBeNull();
    expect(passwordProblem('marta.kovacs1', { username: 'marta.kovacs' })).not.toBeNull();
  });
});

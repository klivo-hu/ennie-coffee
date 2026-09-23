import { SignJWT, UnsecuredJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signAccessToken, signMfaChallenge, verifyAccessToken, verifyMfaChallenge } from './tokens';

const config = {
  secret: 'a-test-secret-that-is-at-least-32-characters',
  issuer: 'ennie-coffee',
  audience: 'ennie-coffee-admin',
};
const claims = { sub: 'user-1', sid: 'session-1', role: 'owner' as const, mfa: true };

describe('access tokens', () => {
  it('round-trips valid claims', async () => {
    const token = await signAccessToken(claims, config);
    expect(await verifyAccessToken(token, config)).toEqual({ ok: true, claims });
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signAccessToken(claims, {
      ...config,
      secret: 'another-secret-that-is-at-least-32-chars!',
    });
    expect(await verifyAccessToken(token, config)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects the wrong audience or issuer', async () => {
    const token = await signAccessToken(claims, { ...config, audience: 'someone-else' });
    expect((await verifyAccessToken(token, config)).ok).toBe(false);
  });

  it('reports expiry separately so the client knows to refresh', async () => {
    const key = new TextEncoder().encode(config.secret);
    const expired = await new SignJWT({ sid: 's', role: 'owner', mfa: true, typ: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(key);
    expect(await verifyAccessToken(expired, config)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects unsigned (alg: none) tokens', async () => {
    const unsigned = new UnsecuredJWT({ sid: 's', role: 'owner', mfa: true, typ: 'access' })
      .setSubject('user-1')
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setIssuedAt()
      .setExpirationTime('10m')
      .encode();
    expect(await verifyAccessToken(unsigned, config)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('does not accept an MFA challenge as an access token, or the reverse', async () => {
    const challenge = await signMfaChallenge('user-1', config);
    expect((await verifyAccessToken(challenge, config)).ok).toBe(false);
    const access = await signAccessToken(claims, config);
    expect(await verifyMfaChallenge(access, config)).toBeNull();
    expect(await verifyMfaChallenge(challenge, config)).toBe('user-1');
  });
});

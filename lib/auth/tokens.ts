import { errors, jwtVerify, SignJWT, type JWTPayload } from 'jose';

/**
 * Short-lived access tokens (HS256, 10 minutes). The token proves who is calling and which
 * session it belongs to; every protected handler additionally checks that session in the
 * database, so logout and revocation take effect immediately rather than when the token expires.
 *
 * Verification pins the algorithm, issuer, and audience, and requires `exp` — `alg: none` and
 * algorithm-confusion tokens are rejected by construction.
 */

export const ACCESS_TOKEN_TTL_SECONDS = 10 * 60;
export const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
const ALGORITHM = 'HS256';

export interface AccessClaims {
  readonly sub: string;
  readonly sid: string;
  readonly role: 'owner' | 'editor';
  /** True when the session passed the second factor (or MFA is not required). */
  readonly mfa: boolean;
}

export interface TokenConfig {
  readonly secret: string;
  readonly issuer: string;
  readonly audience: string;
}

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(claims: AccessClaims, config: TokenConfig): Promise<string> {
  return new SignJWT({ sid: claims.sid, role: claims.role, mfa: claims.mfa, typ: 'access' })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(key(config.secret));
}

export type VerifyResult =
  | { readonly ok: true; readonly claims: AccessClaims }
  | { readonly ok: false; readonly reason: 'expired' | 'invalid' };

async function verify(token: string, config: TokenConfig, typ: string) {
  const { payload } = await jwtVerify(token, key(config.secret), {
    algorithms: [ALGORITHM],
    issuer: config.issuer,
    audience: config.audience,
    requiredClaims: ['exp', 'iat', 'sub'],
  });
  if (payload['typ'] !== typ) throw new errors.JWTClaimValidationFailed('typ', payload, 'typ');
  return payload;
}

export async function verifyAccessToken(token: string, config: TokenConfig): Promise<VerifyResult> {
  try {
    const payload: JWTPayload = await verify(token, config, 'access');
    const role = payload['role'];
    const sid = payload['sid'];
    if (typeof payload.sub !== 'string' || typeof sid !== 'string')
      return { ok: false, reason: 'invalid' };
    if (role !== 'owner' && role !== 'editor') return { ok: false, reason: 'invalid' };
    return {
      ok: true,
      claims: { sub: payload.sub, sid, role, mfa: payload['mfa'] === true },
    };
  } catch (error) {
    if (error instanceof errors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}

/** A pending second-factor challenge after a correct password. Bound to one user, 5 minutes. */
export async function signMfaChallenge(userId: string, config: TokenConfig): Promise<string> {
  return new SignJWT({ typ: 'mfa-challenge' })
    .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${MFA_CHALLENGE_TTL_SECONDS}s`)
    .sign(key(config.secret));
}

export async function verifyMfaChallenge(
  token: string,
  config: TokenConfig,
): Promise<string | null> {
  try {
    const payload = await verify(token, config, 'mfa-challenge');
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

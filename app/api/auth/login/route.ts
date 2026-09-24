import { NextResponse } from 'next/server';
import { ApiError, rateLimitedResponse, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { setAccessCookie, setMfaCookie, setRefreshCookie } from '@/lib/auth/cookies';
import { verifyAgainstDummy, verifyPassword } from '@/lib/auth/password';
import { createSession, tokenConfig } from '@/lib/auth/session';
import { signMfaChallenge } from '@/lib/auth/tokens';
import { serverEnv } from '@/lib/config/env';
import { checkRateLimit, resetRateLimit } from '@/lib/security/rate-limit';
import { findAdminByUsername, updateAdmin } from '@/lib/store/admins';
import { now } from '@/lib/store/json-store';
import { loginSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

const GENERIC_FAILURE = 'Hibás felhasználónév vagy jelszó.';
const LOCK_AFTER_FAILURES = 5;
const MAX_LOCK_MINUTES = 60;

/** 5 failures → 1 min, then 2, 4, 8 … capped at an hour. Resets on success. */
function lockMinutes(failures: number): number {
  return Math.min(MAX_LOCK_MINUTES, 2 ** (failures - LOCK_AFTER_FAILURES));
}

export const POST = route(
  { rateLimit: { tier: 'auth', scope: 'login' } },
  async ({ request, client }) => {
    const { username, password } = await readJson(request, loginSchema);

    // Per-identity limit on the name being tried, whether or not it exists.
    const byIdentity = checkRateLimit('auth', 'login', { identity: username });
    if (!byIdentity.allowed) return rateLimitedResponse(byIdentity);

    const user = await findAdminByUsername(username);

    if (!user || !user.isActive) {
      await verifyAgainstDummy(password);
      await audit({
        actorId: null,
        action: 'auth.login_failed',
        ip: client.ip,
        detail: { reason: 'unknown-user' },
      });
      throw new ApiError(401, 'invalid_credentials', GENERIC_FAILURE);
    }

    if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now()) {
      await verifyAgainstDummy(password);
      const minutes = Math.ceil((Date.parse(user.lockedUntil) - Date.now()) / 60_000);
      throw new ApiError(
        429,
        'locked',
        `Túl sok sikertelen próbálkozás. Próbáld újra ${minutes} perc múlva.`,
      );
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      const failures = user.failedLoginCount + 1;
      await updateAdmin(user.id, {
        failedLoginCount: failures,
        failedSinceLastLogin: user.failedSinceLastLogin + 1,
        lockedUntil:
          failures >= LOCK_AFTER_FAILURES
            ? new Date(Date.now() + lockMinutes(failures) * 60_000).toISOString()
            : null,
      });
      await audit({
        actorId: user.id,
        action: 'auth.login_failed',
        ip: client.ip,
        detail: { reason: 'bad-password', failures },
      });
      throw new ApiError(401, 'invalid_credentials', GENERIC_FAILURE);
    }

    resetRateLimit('auth', 'login', username);

    if (user.mfaEnabled && user.mfaSecretEncrypted) {
      // Password proven; the session is only issued after the second factor.
      const challenge = await signMfaChallenge(user.id, tokenConfig());
      const response = NextResponse.json(
        { data: { next: 'mfa' } },
        { headers: { 'Cache-Control': 'no-store' } },
      );
      setMfaCookie(response, challenge);
      return response;
    }

    const updated = await updateAdmin(user.id, {
      failedLoginCount: 0,
      lockedUntil: null,
      previousFailedAttempts: user.failedSinceLastLogin,
      failedSinceLastLogin: 0,
      lastLoginAt: now(),
    });
    const session = await createSession(updated ?? user, false, client);
    await audit({ actorId: user.id, action: 'auth.login', ip: client.ip, detail: { mfa: false } });

    const next = serverEnv().ADMIN_MFA_REQUIRED ? 'enroll-mfa' : 'done';
    const response = NextResponse.json(
      { data: { next } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    setAccessCookie(response, session.accessToken);
    setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
    return response;
  },
);

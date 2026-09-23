import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { ApiError, rateLimitedResponse, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { clearMfaCookie, cookieNames, setAccessCookie, setRefreshCookie } from '@/lib/auth/cookies';
import { decryptSecret, sha256 } from '@/lib/auth/crypto';
import { createSession, tokenConfig } from '@/lib/auth/session';
import { verifyMfaChallenge } from '@/lib/auth/tokens';
import { normalizeRecoveryCode, verifyTotp } from '@/lib/auth/totp';
import { connection } from '@/lib/db/client';
import { adminUsers } from '@/lib/db/schema';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { mfaVerifySchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

/** Second login step: a TOTP code or a single-use recovery code for the pending challenge. */
export const POST = route(
  { rateLimit: { tier: 'auth', scope: 'mfa' } },
  async ({ request, client }) => {
    const challenge = request.cookies.get(cookieNames().mfa)?.value;
    const userId = challenge ? await verifyMfaChallenge(challenge, tokenConfig()) : null;
    if (!userId) {
      throw new ApiError(401, 'challenge_expired', 'A belépés lejárt. Add meg újra a jelszavad.');
    }

    const byIdentity = await checkRateLimit('auth', 'mfa', { identity: userId });
    if (!byIdentity.allowed) return rateLimitedResponse(byIdentity);

    const input = await readJson(request, mfaVerifySchema);
    const { db } = connection();
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId)).limit(1);
    if (!user || !user.isActive || !user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ApiError(401, 'challenge_expired', 'A belépés lejárt. Add meg újra a jelszavad.');
    }

    let accepted = false;
    let method: 'totp' | 'recovery' = 'totp';
    const updates: Partial<typeof adminUsers.$inferInsert> = {};

    if ('code' in input) {
      const step = verifyTotp(decryptSecret(user.mfaSecretEncrypted), input.code, user.mfaLastStep);
      if (step !== null) {
        accepted = true;
        updates.mfaLastStep = step;
      }
    } else {
      method = 'recovery';
      const hashed = sha256(normalizeRecoveryCode(input.recoveryCode));
      if (user.mfaRecoveryCodes.includes(hashed)) {
        accepted = true;
        updates.mfaRecoveryCodes = user.mfaRecoveryCodes.filter((code) => code !== hashed);
      }
    }

    if (!accepted) {
      await db
        .update(adminUsers)
        .set({ failedSinceLastLogin: user.failedSinceLastLogin + 1 })
        .where(eq(adminUsers.id, user.id));
      await audit({
        actorId: user.id,
        action: 'auth.mfa_failed',
        ip: client.ip,
        detail: { method },
      });
      throw new ApiError(401, 'invalid_code', 'A kód nem megfelelő vagy már felhasználták.');
    }

    const [updated] = await db
      .update(adminUsers)
      .set({
        ...updates,
        failedLoginCount: 0,
        lockedUntil: null,
        previousFailedAttempts: user.failedSinceLastLogin,
        failedSinceLastLogin: 0,
        lastLoginAt: new Date(),
      })
      .where(eq(adminUsers.id, user.id))
      .returning();

    const session = await createSession(updated ?? user, true, client);
    await audit({ actorId: user.id, action: 'auth.login', ip: client.ip, detail: { mfa: method } });

    const remaining = (updated ?? user).mfaRecoveryCodes.length;
    const response = NextResponse.json(
      { data: { next: 'done', recoveryCodesRemaining: remaining } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    clearMfaCookie(response);
    setAccessCookie(response, session.accessToken);
    setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
    return response;
  },
);

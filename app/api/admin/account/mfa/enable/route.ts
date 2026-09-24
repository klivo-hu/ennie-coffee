import { NextResponse } from 'next/server';
import { ApiError, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { setAccessCookie } from '@/lib/auth/cookies';
import { decryptSecret } from '@/lib/auth/crypto';
import { markSessionMfaVerified, revokeAllForUser, tokenConfig } from '@/lib/auth/session';
import { signAccessToken } from '@/lib/auth/tokens';
import { generateRecoveryCodes, verifyTotp } from '@/lib/auth/totp';
import { updateAdmin } from '@/lib/store/admins';
import { mfaCodeSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

/**
 * Confirms enrollment with a code from the app, activates the factor, returns the recovery codes
 * exactly once, upgrades the current session, and ends every other session.
 */
export const POST = route(
  {
    rateLimit: { tier: 'auth', scope: 'mfa-enable' },
    permission: 'account:self',
    allowIncompleteMfa: true,
  },
  async ({ request, principal, client }) => {
    const user = principal!.user;
    if (user.mfaEnabled) {
      throw new ApiError(
        409,
        'mfa_already_enabled',
        'A kétlépcsős azonosítás már be van kapcsolva.',
      );
    }
    if (!user.mfaSecretEncrypted) {
      throw new ApiError(409, 'mfa_not_started', 'Előbb kérj új QR-kódot.');
    }
    const { code } = await readJson(request, mfaCodeSchema);
    const step = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code, user.mfaLastStep);
    if (step === null) {
      throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
        code: 'A kód nem megfelelő. Ellenőrizd a telefon óráját, és próbáld újra.',
      });
    }

    const recovery = generateRecoveryCodes();
    await updateAdmin(user.id, {
      mfaEnabled: true,
      mfaLastStep: step,
      mfaRecoveryCodes: recovery.hashed,
    });
    await markSessionMfaVerified(principal!.sessionId);
    await revokeAllForUser(user.id, 'mfa-enabled', principal!.sessionId);
    await audit({ actorId: user.id, action: 'account.mfa_enabled', ip: client.ip });

    const accessToken = await signAccessToken(
      { sub: user.id, sid: principal!.sessionId, role: user.role, mfa: true },
      tokenConfig(),
    );
    const response = NextResponse.json(
      { data: { recoveryCodes: recovery.plain } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    setAccessCookie(response, accessToken);
    return response;
  },
);

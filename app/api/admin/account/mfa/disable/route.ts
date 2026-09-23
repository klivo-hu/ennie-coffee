import { eq, sql } from 'drizzle-orm';
import { ApiError, ok, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { decryptSecret } from '@/lib/auth/crypto';
import { verifyPassword } from '@/lib/auth/password';
import { revokeAllForUser } from '@/lib/auth/session';
import { verifyTotp } from '@/lib/auth/totp';
import { serverEnv } from '@/lib/config/env';
import { connection } from '@/lib/db/client';
import { adminUsers } from '@/lib/db/schema';
import { mfaDisableSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

/** Turning the factor off needs the password and a current code; refused when MFA is mandatory. */
export const POST = route(
  { rateLimit: { tier: 'auth', scope: 'mfa-disable' }, permission: 'account:self' },
  async ({ request, principal, client }) => {
    if (serverEnv().ADMIN_MFA_REQUIRED) {
      throw new ApiError(409, 'mfa_required', 'Ezen a szerveren a kétlépcsős azonosítás kötelező.');
    }
    const user = principal!.user;
    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ApiError(409, 'mfa_not_enabled', 'A kétlépcsős azonosítás nincs bekapcsolva.');
    }
    const { password, code } = await readJson(request, mfaDisableSchema);
    const passwordOk = await verifyPassword(user.passwordHash, password);
    const step = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code, user.mfaLastStep);
    if (!passwordOk || step === null) {
      throw new ApiError(422, 'validation', 'A jelszó vagy a kód nem megfelelő.');
    }
    await connection()
      .db.update(adminUsers)
      .set({
        mfaEnabled: false,
        mfaSecretEncrypted: null,
        mfaLastStep: null,
        mfaRecoveryCodes: sql`'{}'::text[]`,
      })
      .where(eq(adminUsers.id, user.id));
    await revokeAllForUser(user.id, 'mfa-disabled', principal!.sessionId);
    await audit({ actorId: user.id, action: 'account.mfa_disabled', ip: client.ip });
    return ok({ ok: true });
  },
);

import { eq } from 'drizzle-orm';
import { ApiError, ok, readJson, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { decryptSecret } from '@/lib/auth/crypto';
import { generateRecoveryCodes, verifyTotp } from '@/lib/auth/totp';
import { connection } from '@/lib/db/client';
import { adminUsers } from '@/lib/db/schema';
import { mfaCodeSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

/** Replaces all recovery codes (the old set stops working) after proving possession of the app. */
export const POST = route(
  { rateLimit: { tier: 'auth', scope: 'mfa-recovery' }, permission: 'account:self' },
  async ({ request, principal, client }) => {
    const user = principal!.user;
    if (!user.mfaEnabled || !user.mfaSecretEncrypted) {
      throw new ApiError(409, 'mfa_not_enabled', 'A kétlépcsős azonosítás nincs bekapcsolva.');
    }
    const { code } = await readJson(request, mfaCodeSchema);
    const step = verifyTotp(decryptSecret(user.mfaSecretEncrypted), code, user.mfaLastStep);
    if (step === null) {
      throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
        code: 'A kód nem megfelelő.',
      });
    }
    const recovery = generateRecoveryCodes();
    await connection()
      .db.update(adminUsers)
      .set({ mfaRecoveryCodes: recovery.hashed, mfaLastStep: step })
      .where(eq(adminUsers.id, user.id));
    await audit({ actorId: user.id, action: 'account.recovery_codes_regenerated', ip: client.ip });
    return ok({ recoveryCodes: recovery.plain });
  },
);

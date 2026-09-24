import { ApiError, ok, route } from '@/lib/api/route';
import { encryptSecret } from '@/lib/auth/crypto';
import { enrollmentQr, generateTotpSecret } from '@/lib/auth/totp';
import { updateAdmin } from '@/lib/store/admins';

export const dynamic = 'force-dynamic';

/**
 * Starts enrollment: a fresh secret is stored (encrypted, not yet active) and returned once as a
 * QR code and as text for manual entry. It becomes active only after a correct code (enable).
 */
export const POST = route(
  {
    rateLimit: { tier: 'expensive', scope: 'mfa-setup' },
    permission: 'account:self',
    allowIncompleteMfa: true,
  },
  async ({ principal }) => {
    const user = principal!.user;
    if (user.mfaEnabled) {
      throw new ApiError(
        409,
        'mfa_already_enabled',
        'A kétlépcsős azonosítás már be van kapcsolva.',
      );
    }
    const secret = generateTotpSecret();
    await updateAdmin(user.id, {
      mfaSecretEncrypted: encryptSecret(secret),
      mfaLastStep: null,
    });
    const { svg } = await enrollmentQr(secret, user.username);
    return ok({ qrSvg: svg, secret: secret.replace(/(.{4})/g, '$1 ').trim() });
  },
);

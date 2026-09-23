import { ok, route } from '@/lib/api/route';
import { serverEnv } from '@/lib/config/env';
import { missingLegalFields } from '@/lib/config/legal';

export const dynamic = 'force-dynamic';

/** The signed-in admin's own profile. Never includes the password hash or MFA secret. */
export const GET = route(
  {
    rateLimit: { tier: 'admin', scope: 'account' },
    permission: 'account:self',
    allowIncompleteMfa: true,
  },
  async ({ principal }) => {
    const user = principal!.user;
    return ok({
      username: user.username,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      mfaRequired: serverEnv().ADMIN_MFA_REQUIRED,
      mfaComplete: principal!.mfaComplete,
      recoveryCodesRemaining: user.mfaRecoveryCodes.length,
      lastLoginAt: user.lastLoginAt,
      previousFailedAttempts: user.previousFailedAttempts,
      passwordChangedAt: user.passwordChangedAt,
      missingLegalFields: missingLegalFields().map((field) => ({
        key: field.key,
        label: field.label,
      })),
    });
  },
);

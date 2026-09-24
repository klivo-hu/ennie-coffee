import type { Metadata } from 'next';
import { AccountPanel } from '@/components/admin/account-panel';
import { guardAdminPage } from '@/lib/auth/page-guard';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { serverEnv } from '@/lib/config/env';

export const metadata: Metadata = { title: 'Fiók és biztonság' };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await guardAdminPage();
  if (guard.state !== 'ok') return null;
  const { user, mfaComplete } = guard.principal;
  const params = await searchParams;

  return (
    <AccountPanel
      enrollPrompt={params.mfa === '1' || !mfaComplete}
      account={{
        username: user.username,
        roleLabel: ROLE_LABEL[user.role],
        mfaEnabled: user.mfaEnabled,
        mfaRequired: serverEnv().ADMIN_MFA_REQUIRED,
        mfaComplete,
        recoveryCodesRemaining: user.mfaRecoveryCodes.length,
        // Already ISO-8601 strings in the store, so they pass straight through.
        lastLoginAt: user.lastLoginAt,
        passwordChangedAt: user.passwordChangedAt,
      }}
    />
  );
}

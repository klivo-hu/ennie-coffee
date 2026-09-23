'use client';

import { useConsent } from '@/components/consent/consent-provider';
import { CONSENT_COPY } from '@/lib/consent/config';

/**
 * Reopens the consent window. Withdrawing must be as easy as granting was, so this control lives
 * in the footer of every page and never disappears after a decision.
 */
export function ConsentSettingsButton({ className }: { className?: string }) {
  const { openWindow } = useConsent();
  return (
    <button type="button" data-consent-reopen onClick={openWindow} className={className}>
      {CONSENT_COPY.reopen}
    </button>
  );
}

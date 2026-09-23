'use client';

import { useConsent } from '@/components/consent/consent-provider';

/**
 * Renders its children only once the named purpose is allowed.
 *
 * Wrap every non-essential script, embed, pixel, and iframe in this. Loading first and cleaning up
 * after a refusal is not consent — the request has already happened.
 */
export function ConsentGate({
  category,
  children,
}: {
  category: string;
  children: React.ReactNode;
}) {
  const { allows } = useConsent();
  return allows(category) ? <>{children}</> : null;
}

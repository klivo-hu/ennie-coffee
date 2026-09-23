import 'server-only';
import { headers } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { currentAdmin, type AdminPrincipal } from './guard';
import { safeAdminPath } from './redirect';

export type PageGuardResult =
  { readonly state: 'ok'; readonly principal: AdminPrincipal } | { readonly state: 'disabled' };

/**
 * Server-side guard for every admin page. An expired or missing access token goes through the
 * refresh endpoint (which rotates the session and returns here, or ends at the sign-in page); a
 * session that still owes its second factor may only open the account page, where it enrolls.
 */
async function guard(): Promise<PageGuardResult> {
  const path = safeAdminPath((await headers()).get('x-pathname'));
  const outcome = await currentAdmin();

  if (!outcome.ok) {
    if (outcome.reason === 'disabled') return { state: 'disabled' };
    redirect(`/api/auth/refresh?next=${encodeURIComponent(path)}`);
  }

  if (!outcome.principal.mfaComplete && !path.startsWith('/admin/fiok')) {
    redirect('/admin/fiok?mfa=1');
  }
  return { state: 'ok', principal: outcome.principal };
}

/** One verification per request, shared by the layout and the page (they render in parallel). */
export const guardAdminPage = cache(guard);

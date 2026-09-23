import { NextResponse } from 'next/server';
import { route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { authenticateToken } from '@/lib/auth/guard';
import { ACCESS_COOKIE_CANDIDATES, clearAuthCookies, cookieNames } from '@/lib/auth/cookies';
import { revokeByRefreshToken, revokeSessionFamily } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Ends the session on the server — the refresh family is revoked, so neither cookie is usable
 * afterwards even if it was copied — and clears the cookies in the browser.
 */
export const POST = route(
  { rateLimit: { tier: 'admin', scope: 'logout' } },
  async ({ request, client }) => {
    const accessToken = ACCESS_COOKIE_CANDIDATES.map(
      (name) => request.cookies.get(name)?.value,
    ).find(Boolean);
    const outcome = await authenticateToken(accessToken);
    if (outcome.ok) {
      await revokeSessionFamily(outcome.principal.sessionId, 'logout');
      await audit({ actorId: outcome.principal.user.id, action: 'auth.logout', ip: client.ip });
    }
    const refreshToken = request.cookies.get(cookieNames().refresh)?.value;
    if (refreshToken) await revokeByRefreshToken(refreshToken, 'logout');

    const response = NextResponse.json(
      { data: { ok: true } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    clearAuthCookies(response);
    return response;
  },
);

import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, errorResponse, rateLimitedResponse } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import {
  clearAuthCookies,
  cookieNames,
  setAccessCookie,
  setRefreshCookie,
} from '@/lib/auth/cookies';
import { safeAdminPath } from '@/lib/auth/redirect';
import { rotateSession } from '@/lib/auth/session';
import { adminEnabled } from '@/lib/config/env';
import { redirectToPath } from '@/lib/http/redirect';
import { logger } from '@/lib/log';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { isSameOriginRequest, requestContext } from '@/lib/security/request';

export const dynamic = 'force-dynamic';

const REASON_PARAM: Record<string, string> = {
  idle: 'inaktiv',
  expired: 'lejart',
  reused: 'biztonsag',
};

async function refresh(request: NextRequest) {
  const client = requestContext(request);
  if (!adminEnabled()) return { outcome: 'disabled' as const };
  const decision = checkRateLimit('admin', 'refresh', { source: client.ip });
  if (!decision.allowed) return { outcome: 'limited' as const, decision };

  const token = request.cookies.get(cookieNames().refresh)?.value;
  if (!token) return { outcome: 'failed' as const, reason: 'missing' };
  const result = await rotateSession(token, client);
  if (!result.ok) {
    if (result.reason === 'reused') {
      await audit({ actorId: null, action: 'auth.refresh_reuse', ip: client.ip });
    }
    return { outcome: 'failed' as const, reason: result.reason };
  }
  return { outcome: 'ok' as const, session: result.session };
}

/**
 * Page flow: an admin page whose access token has expired redirects here; with a valid refresh
 * token the pair is rotated and the browser continues to the page it asked for.
 */
export async function GET(request: NextRequest) {
  const next = safeAdminPath(request.nextUrl.searchParams.get('next'));
  try {
    const result = await refresh(request);
    if (result.outcome === 'ok') {
      const response = redirectToPath(next);
      setAccessCookie(response, result.session.accessToken);
      setRefreshCookie(response, result.session.refreshToken, result.session.refreshExpiresAt);
      return response;
    }
    const query = new URLSearchParams({ next });
    if (result.outcome === 'failed' && REASON_PARAM[result.reason]) {
      query.set('ok', REASON_PARAM[result.reason] as string);
    }
    const response = redirectToPath(`/admin/belepes?${query.toString()}`);
    if (result.outcome === 'failed') clearAuthCookies(response);
    return response;
  } catch (error) {
    logger.error('auth.refresh_failed', { error: String(error) });
    return redirectToPath('/admin/belepes');
  }
}

/** XHR flow: the admin client calls this on a 401 `token_expired` and retries once. */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return errorResponse(
        new ApiError(403, 'cross_origin', 'A kérés nem ebből az oldalból érkezett.'),
      );
    }
    const result = await refresh(request);
    if (result.outcome === 'disabled') {
      return errorResponse(
        new ApiError(503, 'admin_disabled', 'Az adminisztráció nincs beállítva.'),
      );
    }
    if (result.outcome === 'limited') return rateLimitedResponse(result.decision);
    if (result.outcome === 'failed') {
      const response = errorResponse(
        new ApiError(401, 'session_ended', 'A munkamenet lejárt. Jelentkezz be újra.'),
      );
      clearAuthCookies(response);
      return response;
    }
    const response = NextResponse.json(
      { data: { ok: true } },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    setAccessCookie(response, result.session.accessToken);
    setRefreshCookie(response, result.session.refreshToken, result.session.refreshExpiresAt);
    return response;
  } catch (error) {
    logger.error('auth.refresh_failed', { error: String(error) });
    return errorResponse(new ApiError(500, 'internal', 'Váratlan hiba történt.'));
  }
}

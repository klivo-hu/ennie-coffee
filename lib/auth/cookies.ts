import 'server-only';
import type { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/config/env';
import { ACCESS_TOKEN_TTL_SECONDS, MFA_CHALLENGE_TTL_SECONDS } from './tokens';

/**
 * Auth cookies. All are HttpOnly (unreadable by script, so an XSS cannot exfiltrate them),
 * SameSite=Strict (never sent on a cross-site request, which closes CSRF for the admin), and
 * Secure outside plain-HTTP local development. The refresh and challenge cookies are scoped to
 * /api/auth — the only place they are needed — so ordinary admin requests never carry them.
 *
 * With Secure on, the `__Host-` / `__Secure-` prefixes make the browser itself refuse a cookie
 * set over HTTP or by a sibling subdomain.
 */

const AUTH_PATH = '/api/auth';
export const SESSION_ABSOLUTE_HOURS = 12;
export const SESSION_IDLE_MINUTES = 15;

export interface CookieNames {
  readonly access: string;
  readonly refresh: string;
  readonly mfa: string;
}

export function cookieNames(secure = serverEnv().AUTH_COOKIE_SECURE): CookieNames {
  return secure
    ? { access: '__Host-ennie_at', refresh: '__Secure-ennie_rt', mfa: '__Secure-ennie_mfa' }
    : { access: 'ennie_at', refresh: 'ennie_rt', mfa: 'ennie_mfa' };
}

/** Both spellings, for code that must recognize a cookie regardless of the current setting. */
export const ACCESS_COOKIE_CANDIDATES = ['__Host-ennie_at', 'ennie_at'] as const;

function base() {
  const secure = serverEnv().AUTH_COOKIE_SECURE;
  return { httpOnly: true, secure, sameSite: 'strict' as const };
}

export function setAccessCookie(response: NextResponse, token: string) {
  response.cookies.set(cookieNames().access, token, {
    ...base(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function setRefreshCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(cookieNames().refresh, token, {
    ...base(),
    path: AUTH_PATH,
    expires: expiresAt,
  });
}

export function setMfaCookie(response: NextResponse, token: string) {
  response.cookies.set(cookieNames().mfa, token, {
    ...base(),
    path: AUTH_PATH,
    maxAge: MFA_CHALLENGE_TTL_SECONDS,
  });
}

export function clearMfaCookie(response: NextResponse) {
  response.cookies.set(cookieNames().mfa, '', { ...base(), path: AUTH_PATH, maxAge: 0 });
}

export function clearAuthCookies(response: NextResponse) {
  const names = cookieNames();
  response.cookies.set(names.access, '', { ...base(), path: '/', maxAge: 0 });
  response.cookies.set(names.refresh, '', { ...base(), path: AUTH_PATH, maxAge: 0 });
  response.cookies.set(names.mfa, '', { ...base(), path: AUTH_PATH, maxAge: 0 });
}

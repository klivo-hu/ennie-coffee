import 'server-only';
import type { NextRequest } from 'next/server';
import { siteUrl } from '@/lib/site-url';
import { serverEnv } from '@/lib/config/env';
import { clientIpFromForwarded } from './client-ip';

export interface RequestContext {
  /** Client address behind the trusted proxies, or "unknown" when none can be derived. */
  readonly ip: string;
  readonly userAgent: string | null;
}

export function requestContext(request: NextRequest | Request): RequestContext {
  const hops = serverEnv().TRUSTED_PROXY_HOPS;
  const ip = clientIpFromForwarded(request.headers.get('x-forwarded-for'), hops) ?? 'unknown';
  const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null;
  return { ip, userAgent };
}

/**
 * Defense in depth against cross-site requests on state-changing endpoints: the browser's Origin
 * (or, failing that, Sec-Fetch-Site) must name this site. SameSite=Strict cookies already stop
 * the credentials from travelling; this rejects the request itself.
 */
export function isSameOriginRequest(request: NextRequest | Request): boolean {
  const origin = request.headers.get('origin');
  if (origin) {
    const allowed = new Set([new URL(siteUrl).origin, new URL(request.url).origin]);
    const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const forwardedProto =
      request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
    if (forwardedHost) allowed.add(`${forwardedProto}://${forwardedHost}`);
    return allowed.has(origin);
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  return fetchSite === 'same-origin';
}

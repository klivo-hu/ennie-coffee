import { NextResponse, type NextRequest } from 'next/server';
import { redirectToPath } from '@/lib/http/redirect';

/**
 * Per-request Content-Security-Policy with a fresh nonce: only scripts carrying the nonce (Next's
 * own runtime and our one inline boot script) execute, and `strict-dynamic` lets those load their
 * chunks. An injected <script> has no nonce and does not run.
 *
 * For /admin it also sends a browser with no access cookie through the refresh endpoint before
 * rendering anything. That is a convenience redirect, not an authorization decision — every admin
 * page and API handler verifies the token and its session on the server.
 */

const ACCESS_COOKIES = ['__Host-ennie_at', 'ennie_at'];

function contentSecurityPolicy(nonce: string, https: boolean): string {
  const development = process.env.NODE_ENV !== 'production';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    // The owner-supplied Google Maps embed is the only third-party frame.
    'frame-src https://www.google.com https://maps.google.com',
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];
  if (https) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/belepes')) {
    const hasAccess = ACCESS_COOKIES.some((name) => request.cookies.has(name));
    if (!hasAccess) {
      // Relative, like every other redirect in the app: behind the platform's proxy an absolute
      // URL built from the request resolves to the container's own bind address, not the host the
      // visitor typed. See lib/http/redirect.ts.
      const query = new URLSearchParams({ next: `${pathname}${search}` });
      return redirectToPath(`/api/auth/refresh?${query.toString()}`);
    }
  }

  const nonce = btoa(crypto.randomUUID());
  const https =
    request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:';
  const csp = contentSecurityPolicy(nonce, https);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  // Lets the admin layout send an expired session back to the page it came from.
  requestHeaders.set('x-pathname', `${pathname}${search}`);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  if (pathname.startsWith('/admin')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'no-store');
  }
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api/|_next/static|_next/image|media/|favicon.ico|icon|apple-icon|opengraph-image|robots.txt|sitemap.xml|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

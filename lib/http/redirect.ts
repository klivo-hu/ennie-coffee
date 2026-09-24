import { NextResponse } from 'next/server';

/**
 * A redirect whose `Location` is a site-relative path.
 *
 * Why not `NextResponse.redirect(new URL(path, request.url))`, which is the obvious spelling:
 * behind a reverse proxy it produces the wrong origin. In Next's standalone server a Route
 * Handler's `request.url` is built from the address the process is *bound* to, not from the
 * `Host` header the visitor sent — so with `HOSTNAME=0.0.0.0` and `PORT=3000` the redirect comes
 * out as `https://0.0.0.0:3000/...` and the browser fails with ERR_ADDRESS_INVALID. Middleware
 * happens to resolve the host correctly today, which is exactly what makes the bug easy to miss:
 * it appears only on the hop that leaves a route handler.
 *
 * A relative `Location` is valid HTTP (RFC 7231 §7.1.2) and every browser resolves it against the
 * URL it actually requested. That makes the redirect correct on any hostname the hosting panel
 * assigns, with no `SITE_URL` to keep in sync, no `X-Forwarded-Host` to decide whether to trust,
 * and no way for a proxy misconfiguration to send a visitor somewhere else.
 *
 * `path` must be a path this application produced — `safeAdminPath()` for anything derived from a
 * query string. A relative Location beginning `//` is protocol-relative and would be an open
 * redirect; that is one of the shapes `safeAdminPath()` exists to reject.
 */
export function redirectToPath(path: string, status: 303 | 307 = 303): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { Location: path, 'Cache-Control': 'no-store' },
  });
}

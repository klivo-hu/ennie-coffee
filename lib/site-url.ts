/**
 * The site's public origin, used for canonical URLs, the sitemap, Open Graph, structured data, and
 * the same-origin check on API writes. SITE_URL is read on the server at runtime (it is not a
 * NEXT_PUBLIC_ variable, so it is never baked into a build): one image serves any domain the
 * hosting panel assigns. The fallback is only for local development.
 */
function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  if (!raw) return 'http://localhost:3000';
  try {
    return new URL(raw).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export const siteUrl = resolveSiteUrl();

/** Builds an absolute URL for a site-relative path. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, siteUrl).toString();
}

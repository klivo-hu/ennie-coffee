import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-url';

/** Rendered per request so the URLs follow the runtime SITE_URL, not the build environment. */
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}

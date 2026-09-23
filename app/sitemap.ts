import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-url';

/** Rendered per request so the URLs follow the runtime SITE_URL, not the build environment. */
export const dynamic = 'force-dynamic';

/** The four public pages, then the legal documents. The admin area is never listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: {
    path: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
  }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/arlista', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/rolunk', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/kapcsolat', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/impresszum', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/adatkezelesi-tajekoztato', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/cookie-tajekoztato', priority: 0.2, changeFrequency: 'yearly' },
  ];
  return pages.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

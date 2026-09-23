import { SiteChrome } from '@/components/site/site-chrome';

/** Public pages render per request: menu and social links come from the live content store. */
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}

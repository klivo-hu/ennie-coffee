import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { displayFont, sansFont } from './fonts';
import { siteUrl } from '@/lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Ennie Coffee – kávéház Hatvanban, a Kossuth téren',
    template: '%s | Ennie Coffee',
  },
  description:
    'Prémium arabica kávé világos pörköléssel, matcha és chai, turmixok és limonádék. Nyugodt, barátságos kávéház Hatvan szívében, 2015 óta.',
  applicationName: 'Ennie Coffee',
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    siteName: 'Ennie Coffee',
    locale: 'hu_HU',
    url: siteUrl,
  },
  twitter: { card: 'summary_large_image' },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#fbf9f4',
  colorScheme: 'light',
};

/**
 * Runs before first paint. It opts the page into the hero entrance only when scripts run and
 * the reader has not asked for reduced motion, and it withdraws that opt-in after a short grace
 * period, so a hero whose animation never starts is still shown. See globals.css.
 */
const HERO_GATE = `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-reduced-motion: no-preference)').matches){d.classList.add('hero-motion');window.setTimeout(function(){d.classList.remove('hero-motion')},2400)}}catch(e){}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    // The gate script adds a class to <html> before hydration; that one attribute is expected to differ.
    <html
      lang="hu"
      className={`${displayFont.variable} ${sansFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Browsers hide nonce values from the DOM after parsing, so this attribute never matches on hydration. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: HERO_GATE }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

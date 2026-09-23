import { ConsentProvider } from '@/components/consent/consent-provider';
import { ConsentWindow } from '@/components/consent/consent-window';
import { JsonLd } from '@/components/seo/json-ld';
import { hoursRows } from '@/lib/business/opening-hours';
import { business, formattedAddress, phoneHref } from '@/lib/config/business';
import { getSiteContent } from '@/lib/content/cache';
import { cafeJsonLd } from '@/lib/seo/jsonld';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/**
 * Everything around a public page: consent, header, footer, and the business's structured data.
 * Shared by the public layout and the site-wide 404, so every public URL looks like the site.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const info = business();
  const { social, ordering } = await getSiteContent();

  return (
    <ConsentProvider>
      <a
        href="#tartalom"
        className="sr-only z-[60] rounded-control bg-sage-800 px-4 py-3 text-control font-medium text-ivory focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Ugrás a tartalomra
      </a>
      <SiteHeader
        phone={info.phone}
        phoneHref={info.phone ? phoneHref(info.phone) : null}
        address={formattedAddress(info)}
        hours={hoursRows(info.openingHours)}
        social={social.map((link) => ({ id: link.id, platform: link.platform, url: link.url }))}
      />
      <main id="tartalom" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter social={social} ordering={ordering} />
      <ConsentWindow />
      <JsonLd data={cafeJsonLd(info, [...social, ...ordering])} />
    </ConsentProvider>
  );
}

import type { Metadata } from 'next';
import kavek from '@/assets/menu/kavek.jpg';
import { MenuShowcase, toneAfterMenu } from '@/components/menu/menu-showcase';
import { OrderCta } from '@/components/sections/order-cta';
import { PageHero } from '@/components/sections/page-hero';
import { JsonLd } from '@/components/seo/json-ld';
import { StatusMessage } from '@/components/site/status-message';
import { ButtonLink } from '@/components/ui/button';
import { business, phoneHref } from '@/lib/config/business';
import { getSiteContent } from '@/lib/content/cache';
import { breadcrumbJsonLd, menuJsonLd } from '@/lib/seo/jsonld';

export const metadata: Metadata = {
  title: 'Árlista',
  description:
    'Az Ennie Coffee árlistája: kávék, matcha és chai latte, tejturmixok, gyümölcsturmixok, limonádék és forró csokoládék, forintárakkal.',
  alternates: { canonical: '/arlista' },
  openGraph: { url: '/arlista', title: 'Árlista | Ennie Coffee' },
};

export default async function PriceListPage() {
  const info = business();
  const { menu, ordering, seasonal } = await getSiteContent();
  const hasMenu = menu.length > 0 || seasonal !== null;

  return (
    <>
      <PageHero
        title="Árlista"
        lead="Kávék, matcha és chai, tejturmixok, gyümölcsturmixok, limonádék és forró csokoládék."
        image={kavek}
        imageAlt="Flat white és cortado egy tölgyfa tálcán"
      >
        <p className="max-w-lg text-small text-ink-soft">
          Az árak forintban értendők. A „-tól” jelölésű italok ára a választott kiszereléstől és
          tejtől függ.
        </p>
      </PageHero>

      {hasMenu ? (
        <MenuShowcase menu={menu} seasonal={seasonal} />
      ) : (
        <StatusMessage
          title="Az árlista épp frissül."
          actions={
            info.phone ? (
              <ButtonLink href={phoneHref(info.phone)} arrow>
                Hívj minket: {info.phone}
              </ButtonLink>
            ) : null
          }
        >
          <p>Néhány perc múlva újra itt lesz. Addig telefonon szívesen elmondjuk, mivel várunk.</p>
        </StatusMessage>
      )}

      <OrderCta
        ordering={ordering}
        tone={hasMenu ? toneAfterMenu(menu.length, seasonal !== null) : 'paper'}
        wave={{ variant: 'flowing' }}
      />

      {hasMenu ? <JsonLd data={menuJsonLd(info, menu, seasonal)} /> : null}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Főoldal', path: '/' },
          { name: 'Árlista', path: '/arlista' },
        ])}
      />
    </>
  );
}

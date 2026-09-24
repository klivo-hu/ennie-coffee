import { Link } from '@/components/ui/link';
import { ConsentSettingsButton } from '@/components/consent/consent-settings-button';
import { Container } from '@/components/ui/container';
import { ExternalIcon, SocialIcon } from '@/components/ui/icons';
import { WaveDivider } from '@/components/ui/wave-divider';
import { hoursRows } from '@/lib/business/opening-hours';
import { business, formattedAddress, phoneHref } from '@/lib/config/business';
import type { SocialLink } from '@/lib/menu/types';
import { LEGAL_NAV, PRIMARY_NAV } from '@/lib/navigation';
import { orderCta } from '@/lib/social/order';
import { PLATFORM_LABEL, isSocialPlatform } from '@/lib/social/platforms';
import { Wordmark } from './wordmark';

const linkClass =
  'rounded-inline text-sage-100 underline-offset-4 transition-colors duration-base hover:text-ivory hover:underline focus-visible:outline-ivory';

/**
 * The footer, on deep forest green — distinct from every section surface above it, so the page
 * visibly ends. Compact: identity, pages, visit details, social, legal, and the consent control.
 */
export function SiteFooter({
  social,
  ordering,
}: {
  social: readonly SocialLink[];
  ordering: readonly SocialLink[];
}) {
  const info = business();
  const year = new Date().getFullYear();
  const order = orderCta(ordering);

  return (
    <footer className="relative bg-sage-900 pb-8 pt-14 text-ivory md:pt-20">
      <WaveDivider tone="forest" variant="soft" flip />
      <Container className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark tone="light" />
          <p className="mt-4 max-w-xs text-small text-sage-200">
            Nem csak kávé, szeretettel. Kávéház Hatvan belvárosában
            {info.foundedYear ? `, ${info.foundedYear} óta.` : '.'}
          </p>
          {social.length > 0 ? (
            <ul className="mt-6 flex gap-2" aria-label="Közösségi oldalak">
              {social.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-control border border-ivory/20 text-ivory transition-colors duration-base hover:border-ivory/40 hover:bg-ivory/10 focus-visible:outline-ivory"
                  >
                    <SocialIcon platform={link.platform} className="size-5" />
                    <span className="sr-only">
                      {isSocialPlatform(link.platform)
                        ? PLATFORM_LABEL[link.platform]
                        : link.platform}{' '}
                      (új lapon)
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Lábléc navigáció" className="md:col-span-2">
          <h2 className="font-sans text-caption font-semibold text-ivory">Oldalak</h2>
          <ul className="mt-4 grid gap-2.5 text-small">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
            {order ? (
              <li>
                <a
                  href={order.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-1`}
                >
                  {order.label}
                  <ExternalIcon className="size-3.5" />
                  <span className="sr-only"> (új lapon)</span>
                </a>
              </li>
            ) : null}
          </ul>
        </nav>

        <div className="md:col-span-5 md:pl-8">
          <h2 className="font-sans text-caption font-semibold text-ivory">Látogass meg</h2>
          <address className="mt-4 grid gap-2.5 text-small not-italic text-sage-100">
            <span className="text-ivory">{formattedAddress(info)}</span>
            {info.phone ? (
              <a href={phoneHref(info.phone)} className={linkClass}>
                {info.phone}
              </a>
            ) : null}
            {info.email ? (
              <a href={`mailto:${info.email}`} className={linkClass}>
                {info.email}
              </a>
            ) : null}
          </address>
          <dl className="mt-5 grid max-w-xs gap-1 text-small text-sage-200">
            {hoursRows(info.openingHours).map((row) => (
              <div key={row.days} className="flex justify-between gap-4">
                <dt>{row.days}</dt>
                <dd className="tabular text-ivory">{row.time}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>

      <Container className="mt-14 text-caption text-sage-200">
        <div className="flex w-full flex-col gap-4 border-t border-ivory/15 pt-6 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {info.name}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <ConsentSettingsButton className={linkClass} />
            </li>
            <li>
              {/*
                The build credit. `noopener` without `noreferrer`, unlike the other outbound links
                here: the security half is what matters, and dropping the referrer would hide this
                site from klivo.hu's own analytics — which is most of what a credit link is for.
              */}
              <a
                href="https://klivo.hu"
                target="_blank"
                rel="noopener"
                className={`${linkClass} inline-flex items-center gap-1`}
              >
                Készítette: klivo.hu
                <ExternalIcon className="size-3.5" />
                <span className="sr-only"> (új lapon)</span>
              </a>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}

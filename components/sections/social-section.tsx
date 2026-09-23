import Image from 'next/image';
import tableTop from '@/assets/images/table-top.jpg';
import windowSeat from '@/assets/images/window-seat.jpg';
import { Reveal } from '@/components/motion';
import { Container } from '@/components/ui/container';
import { ExternalIcon, SocialIcon } from '@/components/ui/icons';
import { Patch } from '@/components/ui/patch';
import { Section } from '@/components/ui/section';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import type { SocialLink } from '@/lib/menu/types';
import { PLATFORM_LABEL, isSocialPlatform } from '@/lib/social/platforms';

const DESCRIPTION: Partial<Record<string, string>> = {
  instagram: 'Friss képek a pultról és az új ízekről',
  facebook: 'Hírek és újdonságok',
  tiktok: 'Rövid videók a kávézóból',
  youtube: 'Videók a kávézóból',
  google: 'Értékelések és útvonal',
  tripadvisor: 'Vendégértékelések',
  website: 'Weboldal',
};

/**
 * Where to follow the café: each social channel is a line in a list — no platform widgets, no
 * embedded feeds (they would load third-party scripts before consent). Ordering platforms such as
 * foodora are not social media and are left to the ordering call to action. Links come from the
 * admin-managed link table; with none configured the section is not rendered at all.
 */
export function SocialSection({
  links,
  tone = 'canvas',
  wave = { variant: 'flowing' },
}: {
  links: readonly SocialLink[];
  tone?: SurfaceTone;
  wave?: { variant?: WaveVariant; flip?: boolean };
}) {
  if (links.length === 0) return null;
  const instagram = links.find((link) => link.platform === 'instagram');

  return (
    <Section tone={tone} wave={wave} aria-labelledby="social-title">
      {/* grid-cols-1 (minmax(0, 1fr)) keeps the truncated handle line from widening the column. */}
      <Container className="grid grid-cols-1 items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-6">
          <h2 id="social-title" className="font-display text-display-lg text-ink">
            Kövess minket
          </h2>
          <p className="mt-5 max-w-lg text-lead text-muted">
            Szezonális szirupok, új ízek és a kávézó mindennapjai
            {instagram?.handle ? `, Instagramon ${instagram.handle} néven` : ''}. Nézz be hozzánk
            egy kávéra.
          </p>

          <Reveal as="ul" mode="item" className="mt-10 border-t border-line">
            {links.map((link) => {
              const label = isSocialPlatform(link.platform)
                ? PLATFORM_LABEL[link.platform]
                : link.platform;
              return (
                <li key={link.id} className="border-b border-line">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 py-4"
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-50 text-sage-800 transition-colors duration-base group-hover:bg-sage-100">
                      <SocialIcon platform={link.platform} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{label}</span>
                      <span className="block truncate text-small text-ink-soft">
                        {link.handle ? `${link.handle} · ` : ''}
                        {DESCRIPTION[link.platform] ?? ''}
                      </span>
                    </span>
                    <ExternalIcon className="size-5 shrink-0 text-sage-700 transition-transform duration-base ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    <span className="sr-only">(új lapon nyílik meg)</span>
                  </a>
                </li>
              );
            })}
          </Reveal>
        </div>

        <div className="relative isolate lg:col-span-5 lg:col-start-8" aria-hidden="true">
          <Patch
            surface={tone}
            shape="leaf"
            className="-right-[8%] top-[4%] w-[88%] rotate-[24deg]"
          />
          <div className="grid grid-cols-5 items-start gap-4">
            {/* The radius sits on the image frame itself, so no grid stretching can square a corner. */}
            <div className="relative col-span-3 mt-12 aspect-[3/4] overflow-hidden rounded-panel">
              <Image
                src={windowSeat}
                alt=""
                fill
                placeholder="blur"
                sizes="(min-width: 1344px) 17rem, (min-width: 1024px) 21vw, 55vw"
                className="object-cover"
              />
            </div>
            <div className="relative col-span-2 aspect-[3/5] overflow-hidden rounded-panel">
              <Image
                src={tableTop}
                alt=""
                fill
                placeholder="blur"
                sizes="(min-width: 1344px) 11rem, (min-width: 1024px) 14vw, 36vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

import { MenuPicture } from '@/components/media/menu-picture';
import { Parallax, Reveal } from '@/components/motion';
import { Container } from '@/components/ui/container';
import { Patch } from '@/components/ui/patch';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import { cn } from '@/lib/cn';
import { formatForint, formatPrice, spokenPrice } from '@/lib/menu/format';
import type { SeasonalItem, SeasonalSection } from '@/lib/menu/types';
import type { SeasonalStyle } from '@/lib/seasonal/styles';

/**
 * The seasonal showcase: what is on the counter right now, given the room a price-list line
 * cannot give it. Each drink is a band of its own — photograph on one side, name, description,
 * ingredients and price on the other — and the sides alternate, so a section of three or four
 * reads as a walk past the counter rather than as a grid of cards.
 *
 * The same component renders both places it appears. The home page gets the organic patches
 * behind the photographs; the price list does not (its only decoration is its hero), and there
 * the section is a chapter like any other, carrying the anchor and the focus target the category
 * strip jumps to. The owner picks the layout for each page independently.
 */

interface StyleSpec {
  /** Aspect and shape of the photograph's frame. */
  readonly frame: string;
  readonly mediaSpan: string;
  readonly textSpan: string;
  /** Where each column starts, with the photograph on the left and on the right. */
  readonly mediaStart: readonly [string, string];
  readonly textStart: readonly [string, string];
}

const STYLES: Record<Exclude<SeasonalStyle, 'panel'>, StyleSpec> = {
  editorial: {
    frame: 'aspect-[4/3]',
    mediaSpan: 'lg:col-span-6',
    textSpan: 'lg:col-span-5',
    mediaStart: ['lg:col-start-1', 'lg:col-start-7'],
    textStart: ['lg:col-start-8', 'lg:col-start-1'],
  },
  arch: {
    // Landscape while the column is the full width, portrait under the arch once it is a column.
    frame: 'aspect-[16/11] sm:aspect-[16/9] lg:arch lg:aspect-[4/5]',
    mediaSpan: 'lg:col-span-5',
    textSpan: 'lg:col-span-6',
    mediaStart: ['lg:col-start-1', 'lg:col-start-8'],
    textStart: ['lg:col-start-7', 'lg:col-start-1'],
  },
};

/** The patch shapes cycle, so no two neighbours carry the same silhouette. */
const PATCH_SHAPES = ['pebble', 'leaf', 'drift'] as const;

const IMAGE_SIZES = '(min-width: 1344px) 38rem, (min-width: 1024px) 48vw, 92vw';

export function SeasonalShowcase({
  section,
  variant,
  tone,
  wave,
}: {
  section: SeasonalSection;
  /** `home` decorates the section; `list` makes it the price list's first chapter. */
  variant: 'home' | 'list';
  tone: SurfaceTone;
  wave?: { variant?: WaveVariant; flip?: boolean };
}) {
  const style = variant === 'home' ? section.homeStyle : section.listStyle;
  const onList = variant === 'list';
  const headingId = 'szezonalis-cim';

  return (
    <Section
      tone={tone}
      wave={wave}
      aria-labelledby={headingId}
      {...(onList
        ? { id: section.slug, tabIndex: -1, className: 'scroll-mt-40 outline-none' }
        : {})}
    >
      <Container>
        <SectionHeading id={headingId} title={section.title} lead={section.lead} />
      </Container>

      <ul className="mt-14 grid gap-stack lg:mt-16">
        {section.items.map((item, index) => (
          <li key={item.id}>
            <SeasonalBand item={item} style={style} tone={tone} index={index} patches={!onList} />
          </li>
        ))}
      </ul>

      {section.note ? (
        <Container>
          <p className="mt-12 text-small italic text-muted">{section.note}</p>
        </Container>
      ) : null}
    </Section>
  );
}

/** One drink. The photograph leads on even bands and follows on odd ones. */
function SeasonalBand({
  item,
  style,
  tone,
  index,
  patches,
}: {
  item: SeasonalItem;
  style: SeasonalStyle;
  tone: SurfaceTone;
  index: number;
  patches: boolean;
}) {
  const imageRight = index % 2 === 1;

  if (style === 'panel') {
    return (
      <Container>
        <article className="overflow-hidden rounded-panel bg-white shadow-soft">
          <div className="grid lg:grid-cols-2">
            <div
              className={cn(
                'relative min-h-64 bg-sage-100 lg:min-h-[28rem]',
                imageRight && 'lg:order-2',
              )}
            >
              {item.image ? (
                <Parallax>
                  <MenuPicture image={item.image} alt="" sizes="(min-width: 1024px) 50vw, 92vw" />
                </Parallax>
              ) : null}
            </div>
            <Reveal className="p-8 sm:p-10 lg:self-center lg:p-14">
              <SeasonalCopy item={item} />
            </Reveal>
          </div>
        </article>
      </Container>
    );
  }

  const spec = STYLES[style];
  const side = imageRight ? 1 : 0;

  return (
    <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Both columns are placed by hand, so the photograph can swap sides without the copy
          leaving the reading order it has on a phone. */}
      <div className={cn('relative isolate lg:row-start-1', spec.mediaSpan, spec.mediaStart[side])}>
        {patches ? (
          <Patch
            surface={tone}
            shape={PATCH_SHAPES[index % PATCH_SHAPES.length]}
            className={cn(
              'w-[58%]',
              imageRight
                ? '-bottom-[12%] -right-[8%] rotate-[14deg]'
                : '-left-[9%] -top-[12%] -rotate-12',
            )}
          />
        ) : null}
        <div className={cn('relative overflow-hidden rounded-media bg-sage-100', spec.frame)}>
          {item.image ? (
            <Parallax>
              <MenuPicture image={item.image} alt="" sizes={IMAGE_SIZES} />
            </Parallax>
          ) : null}
        </div>
      </div>

      <Reveal className={cn('lg:row-start-1', spec.textSpan, spec.textStart[side])}>
        <SeasonalCopy item={item} />
      </Reveal>
    </Container>
  );
}

/** Name, description, ingredients, price — the same copy in every layout. */
function SeasonalCopy({ item }: { item: SeasonalItem }) {
  const single = item.prices.length === 1 ? item.prices[0] : undefined;
  const headingId = `szezonalis-${item.id}`;
  const ingredientsId = `osszetevok-${item.id}`;

  return (
    <article aria-labelledby={headingId}>
      <h3 id={headingId} className="font-display text-display-md text-ink">
        {item.name}
      </h3>

      {item.description ? (
        <p className="mt-4 max-w-md text-lead text-muted">{item.description}</p>
      ) : null}

      {item.ingredients.length > 0 ? (
        <div className="mt-7">
          <p id={ingredientsId} className="text-caption text-ink-soft">
            Összetevők
          </p>
          <ul aria-labelledby={ingredientsId} className="mt-2.5 flex flex-wrap gap-2">
            {item.ingredients.map((ingredient) => (
              <li
                key={ingredient}
                className="rounded-full border border-line bg-white/60 px-3.5 py-1.5 text-small text-ink-soft"
              >
                {ingredient}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 border-t border-line pt-5">
        {single ? (
          <p className="tabular font-display text-title text-ink">
            <span aria-hidden="true">{formatPrice(single, item.qualifier)}</span>
            <span className="sr-only">{spokenPrice(single, item.qualifier)}</span>
          </p>
        ) : (
          <ul aria-label="Kiszerelések és árak" className="flex flex-wrap gap-x-8 gap-y-2">
            {item.prices.map((price) => (
              <li key={`${price.label}-${price.amountHuf}`} className="flex items-baseline gap-2">
                <span className="text-small text-ink-soft">{price.label}</span>
                <span className="tabular font-display text-title text-ink">
                  {formatForint(price.amountHuf)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

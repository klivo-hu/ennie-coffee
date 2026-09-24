import { SeasonalShowcase } from '@/components/sections/seasonal-showcase';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import type { MenuCategory, SeasonalSection } from '@/lib/menu/types';
import { CategoryNav } from './category-nav';
import { MenuCategorySection } from './menu-category';

/**
 * The surfaces and waves the chapters cycle through. Consecutive chapters never share a tone,
 * so every chapter opens with the wave — the menu reads as one continuous, poured page.
 */
const RHYTHM: readonly { tone: SurfaceTone; wave: { variant: WaveVariant; flip?: boolean } }[] = [
  { tone: 'canvas', wave: { variant: 'gentle' } },
  { tone: 'sage', wave: { variant: 'flowing', flip: true } },
  { tone: 'canvas', wave: { variant: 'soft' } },
  { tone: 'paper', wave: { variant: 'gentle', flip: true } },
];

/**
 * The whole price list: the chapter strip, then each category as its own chapter.
 *
 * The seasonal showcase, when the owner has it on, is the first chapter — listed in the strip
 * and taking the first position in the rhythm, so the categories after it keep alternating
 * surfaces exactly as they do without it.
 */
export function MenuShowcase({
  menu,
  seasonal,
}: {
  menu: readonly MenuCategory[];
  seasonal: SeasonalSection | null;
}) {
  const offset = seasonal ? 1 : 0;
  const chapters = [
    ...(seasonal ? [{ slug: seasonal.slug, name: seasonal.title }] : []),
    ...menu.map((category) => ({ slug: category.slug, name: category.name })),
  ];

  return (
    <>
      <CategoryNav items={chapters} />
      {seasonal ? (
        // The first chapter sits directly under the strip on the page canvas; no wave there.
        <SeasonalShowcase section={seasonal} variant="list" tone={RHYTHM[0]!.tone} />
      ) : null}
      {menu.map((category, index) => {
        const position = index + offset;
        const rhythm = RHYTHM[position % RHYTHM.length] ?? RHYTHM[0]!;
        return (
          <MenuCategorySection
            key={category.id}
            category={category}
            index={index}
            tone={rhythm.tone}
            wave={position === 0 ? undefined : rhythm.wave}
          />
        );
      })}
    </>
  );
}

/**
 * The surface the region after the price list should take. The chapters end on whatever tone the
 * rhythm reached, and a section that repeats it would meet it with an invisible wave — so the
 * caller asks here instead of assuming. Turning the seasonal chapter on shifts every chapter by
 * one, which is exactly the case this exists for.
 */
export function toneAfterMenu(categoryCount: number, hasSeasonal: boolean): SurfaceTone {
  const chapters = categoryCount + (hasSeasonal ? 1 : 0);
  if (chapters === 0) return 'paper';
  const last = RHYTHM[(chapters - 1) % RHYTHM.length]!.tone;
  return last === 'paper' ? 'canvas' : 'paper';
}

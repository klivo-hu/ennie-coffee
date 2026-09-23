import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import type { MenuCategory } from '@/lib/menu/types';
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

/** The whole price list: the chapter strip, then each category as its own chapter. */
export function MenuShowcase({ menu }: { menu: readonly MenuCategory[] }) {
  return (
    <>
      <CategoryNav items={menu.map((category) => ({ slug: category.slug, name: category.name }))} />
      {menu.map((category, index) => {
        const rhythm = RHYTHM[index % RHYTHM.length] ?? RHYTHM[0]!;
        return (
          <MenuCategorySection
            key={category.id}
            category={category}
            index={index}
            tone={rhythm.tone}
            // The first chapter sits directly under the strip on the page canvas; no wave there.
            wave={index === 0 ? undefined : rhythm.wave}
          />
        );
      })}
    </>
  );
}

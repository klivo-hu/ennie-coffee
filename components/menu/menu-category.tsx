import { MenuPicture } from '@/components/media/menu-picture';
import { Parallax } from '@/components/motion';
import { Container } from '@/components/ui/container';
import { Section } from '@/components/ui/section';
import type { SurfaceTone } from '@/components/ui/surface';
import type { WaveVariant } from '@/components/ui/wave-divider';
import { cn } from '@/lib/cn';
import type { MenuCategory as Category } from '@/lib/menu/types';
import { MenuItem } from './menu-item';

/**
 * One chapter of the menu. With a photograph, the image and the category's introduction hold
 * still in one column (a plain CSS sticky — the page scrolls normally) while the products run
 * beside it; chapters alternate sides so the page reads as a sequence, not a repeated template.
 * Without a photograph, the chapter is set as a compact, two-column typographic list.
 */
export function MenuCategorySection({
  category,
  index,
  tone,
  wave,
}: {
  category: Category;
  index: number;
  tone: SurfaceTone;
  wave?: { variant?: WaveVariant; flip?: boolean };
}) {
  const headingId = `kategoria-${category.slug}`;
  const imageRight = index % 2 === 1;

  if (!category.image) {
    return (
      <Section
        tone={tone}
        wave={wave}
        spacing="tight"
        id={category.slug}
        aria-labelledby={headingId}
        tabIndex={-1}
        className="scroll-mt-40 outline-none"
      >
        <Container>
          <div className="grid gap-8 md:grid-cols-12 lg:gap-12">
            <div className="md:col-span-4 lg:col-span-5">
              <h2 id={headingId} className="font-display text-display-md text-ink">
                {category.name}
              </h2>
              {category.description ? (
                <p className="mt-3 text-body text-muted">{category.description}</p>
              ) : null}
            </div>
            <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-10 md:col-span-8 lg:col-span-6 lg:col-start-7">
              {category.products.map((product) => (
                <MenuItem key={product.id} product={product} compact />
              ))}
            </ul>
          </div>
          {category.note ? (
            <p className="mt-6 text-small italic text-muted">{category.note}</p>
          ) : null}
        </Container>
      </Section>
    );
  }

  return (
    <Section
      tone={tone}
      wave={wave}
      id={category.slug}
      aria-labelledby={headingId}
      tabIndex={-1}
      className="scroll-mt-40 outline-none"
    >
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <header className={cn('lg:col-span-5', imageRight && 'lg:order-2 lg:col-start-8')}>
          <div className="lg:sticky lg:top-44">
            <div className="relative aspect-[16/11] overflow-hidden rounded-media bg-sage-100 sm:aspect-[16/9] lg:arch lg:aspect-[4/5]">
              <Parallax>
                <MenuPicture
                  image={category.image}
                  alt=""
                  sizes="(min-width: 1344px) 29rem, (min-width: 1024px) 36vw, 92vw"
                  priority={index === 0}
                />
              </Parallax>
            </div>
            <h2 id={headingId} className="mt-8 font-display text-display-lg text-ink">
              {category.name}
            </h2>
            {category.description ? (
              <p className="mt-4 max-w-md text-lead text-muted">{category.description}</p>
            ) : null}
          </div>
        </header>

        <div
          className={cn(
            'lg:col-span-7 lg:pt-4',
            imageRight ? 'lg:order-1' : 'lg:col-start-7 lg:col-span-6',
          )}
        >
          <ul className="border-t border-line">
            {category.products.map((product) => (
              <MenuItem key={product.id} product={product} />
            ))}
          </ul>
          {category.note ? (
            <p className="mt-6 text-small italic text-muted">{category.note}</p>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}

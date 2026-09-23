import { Link } from '@/components/ui/link';
import { MenuPicture } from '@/components/media/menu-picture';
import { Reveal } from '@/components/motion';
import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ArrowIcon, ExternalIcon } from '@/components/ui/icons';
import { Section } from '@/components/ui/section';
import { SectionHeading } from '@/components/ui/section-heading';
import type { MenuCategory } from '@/lib/menu/types';

/**
 * The menu as a table of contents — each category a line in an index, not a tile. The whole row
 * is the link; the thumbnail is the category's own photograph from the price list.
 */
export function MenuIndex({
  categories,
  order,
}: {
  categories: readonly MenuCategory[];
  order: { url: string; label: string } | null;
}) {
  const listed = categories.filter((category) => category.image !== null).slice(0, 6);
  if (listed.length === 0) return null;

  return (
    <Section tone="paper" wave={{ variant: 'soft' }} aria-labelledby="menu-index-title">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-32">
            <SectionHeading
              id="menu-index-title"
              title="Kávétól a limonádéig"
              lead="Klasszikus és ízesített kávék, matcha és chai, turmixok, limonádék és forró csokoládék."
            />
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href="/arlista" arrow>
                A teljes árlista
              </ButtonLink>
              {order ? (
                <ButtonLink href={order.url} external variant="quiet">
                  {order.label}
                  <ExternalIcon className="size-4" />
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>

        <Reveal as="ul" mode="item" className="border-t border-line lg:col-span-7 lg:col-start-6">
          {listed.map((category) => (
            <li key={category.id} className="border-b border-line">
              <Link
                href={`/arlista#${category.slug}`}
                className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-5 py-5 sm:grid-cols-[5.5rem_1fr_auto] sm:gap-7 sm:py-6"
              >
                <span className="relative block aspect-square overflow-hidden rounded-full bg-sage-100">
                  {category.image ? (
                    <MenuPicture
                      image={category.image}
                      alt=""
                      sizes="(min-width: 640px) 88px, 72px"
                    />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-display-md text-ink transition-transform duration-slow ease-out group-hover:translate-x-1">
                    {category.name}
                  </span>
                  {category.description ? (
                    <span className="mt-1 line-clamp-1 text-small text-ink-soft">
                      {category.description}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 text-small text-ink-soft">
                  <span className="tabular hidden sm:inline">{category.products.length} tétel</span>
                  <ArrowIcon className="size-5 text-sage-700 transition-transform duration-base ease-out group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </Reveal>
      </Container>
    </Section>
  );
}

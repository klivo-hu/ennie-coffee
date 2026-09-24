import type { StaticImageData } from 'next/image';
import forroCsokolade from '@/assets/menu/forro-csokolade.jpg';
import gyumolcsTurmix from '@/assets/menu/gyumolcs-turmix.jpg';
import kavek from '@/assets/menu/kavek.jpg';
import limonade from '@/assets/menu/limonade.jpg';
import teak from '@/assets/menu/teak.jpg';
import tejturmix from '@/assets/menu/tejturmix.jpg';
import { SEED_MENU, SEED_SOCIAL } from '@/lib/menu/seed-data';
import type { MenuCategory, SiteContent } from '@/lib/menu/types';
import { isOrderingPlatform } from '@/lib/social/platforms';
import { slugify } from '@/lib/text/slug';

const STATIC_IMAGES: Record<string, StaticImageData> = {
  'kavek.jpg': kavek,
  'teak.jpg': teak,
  'tejturmix.jpg': tejturmix,
  'gyumolcs-turmix.jpg': gyumolcsTurmix,
  'limonade.jpg': limonade,
  'forro-csokolade.jpg': forroCsokolade,
};

/**
 * The published menu rendered straight from the seed data. Used while the data directory is
 * still being seeded, and whenever it cannot be read, so the price list degrades to the café's
 * published menu instead of an error page. Hidden seed items stay hidden here too.
 */
export function fallbackContent(): SiteContent {
  const menu: MenuCategory[] = SEED_MENU.map((category) => {
    const image = category.image ? STATIC_IMAGES[category.image] : undefined;
    return {
      id: category.slug,
      slug: category.slug,
      name: category.name,
      description: category.description,
      note: category.note,
      image: image ? { kind: 'static' as const, image } : null,
      products: category.products
        .filter((product) => product.visible)
        .map((product) => ({
          id: `${category.slug}-${slugify(product.name)}`,
          slug: slugify(product.name),
          name: product.name,
          description: product.description,
          qualifier: product.qualifier,
          prices: product.prices,
          image: null,
        })),
    };
  }).filter((category) => category.products.length > 0);

  const links = SEED_SOCIAL.map((link) => ({
    id: link.platform,
    platform: link.platform,
    url: link.url,
    handle: link.handle,
  }));
  return {
    menu,
    social: links.filter((link) => !isOrderingPlatform(link.platform)),
    ordering: links.filter((link) => isOrderingPlatform(link.platform)),
    // The showcase is the owner's own editing, never seeded: with no store there is nothing to show.
    seasonal: null,
    source: 'fallback',
  };
}

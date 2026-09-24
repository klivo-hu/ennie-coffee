import 'server-only';
import { loadMenuImages } from '@/lib/media/store';
import type {
  MenuCategory,
  MenuImage,
  SeasonalSection,
  SiteContent,
  SocialLink,
} from '@/lib/menu/types';
import { readSeasonalSection } from '@/lib/seasonal/record';
import { SEASONAL_SLUG } from '@/lib/seasonal/styles';
import { isOrderingPlatform } from '@/lib/social/platforms';
import { categoriesStore, productsStore, socialStore } from '@/lib/store/collections';
import type {
  CategoryRecord,
  ProductRecord,
  SeasonalItemRecord,
  SeasonalSectionRecord,
} from '@/lib/store/types';

type Positioned = CategoryRecord | ProductRecord;

/** Manual order first, then the Hungarian collation of the name so ties are stable. */
function byPosition(a: Positioned, b: Positioned): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'hu');
}

/**
 * The showcase's anchor on the price list. The owner names categories freely, so the constant is
 * checked against the slugs actually rendered and stepped until it is free — two chapters sharing
 * an id would send the table of contents to the wrong one.
 */
function seasonalAnchor(taken: ReadonlySet<string>): string {
  if (!taken.has(SEASONAL_SLUG)) return SEASONAL_SLUG;
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const candidate = `${SEASONAL_SLUG}-${attempt}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${SEASONAL_SLUG}-szekcio`;
}

/** Reads the public menu: visible categories, visible non-archived products, ordered. */
export async function loadContentFromStore(): Promise<SiteContent> {
  const [categoryRecords, productRecords, socialRecords, seasonalRecord] = await Promise.all([
    categoriesStore.read(),
    productsStore.read(),
    socialStore.read(),
    readSeasonalSection(),
  ]);

  const visibleCategories = categoryRecords
    .filter((category) => category.isVisible)
    .sort(byPosition);
  const visibleProducts = productRecords
    .filter((product) => product.isVisible && !product.isArchived && product.prices.length > 0)
    .sort(byPosition);
  const seasonalItems = seasonalRecord.isEnabled
    ? seasonalRecord.items.filter((item) => item.isVisible && item.prices.length > 0)
    : [];

  const imageIds = [
    ...visibleCategories.map((category) => category.imageId),
    ...visibleProducts.map((product) => product.imageId),
    ...seasonalItems.map((item) => item.imageId),
  ].filter((id): id is string => id !== null);
  const images = await loadMenuImages(imageIds);

  const menu: MenuCategory[] = visibleCategories
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      note: category.note,
      image: category.imageId ? (images.get(category.imageId) ?? null) : null,
      products: visibleProducts
        .filter((product) => product.categoryId === category.id)
        .map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          qualifier: product.priceQualifier,
          image: product.imageId ? (images.get(product.imageId) ?? null) : null,
          prices: product.prices.map((price) => ({
            label: price.label,
            amountHuf: price.amountHuf,
          })),
        })),
    }))
    // A category with nothing to price cannot be listed on a price list.
    .filter((category) => category.products.length > 0);

  const links: SocialLink[] = socialRecords
    .filter((link) => link.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((link) => ({
      id: link.id,
      platform: link.platform,
      url: link.url,
      handle: link.handle,
    }));

  return {
    menu,
    social: links.filter((link) => !isOrderingPlatform(link.platform)),
    ordering: links.filter((link) => isOrderingPlatform(link.platform)),
    seasonal: buildSeasonal(seasonalRecord, seasonalItems, menu, images),
    source: 'store',
  };
}

/** The showcase as the site consumes it, or null when there is nothing to show. */
function buildSeasonal(
  record: SeasonalSectionRecord,
  items: readonly SeasonalItemRecord[],
  menu: readonly MenuCategory[],
  images: ReadonlyMap<string, MenuImage>,
): SeasonalSection | null {
  if (items.length === 0) return null;
  return {
    slug: seasonalAnchor(new Set(menu.map((category) => category.slug))),
    title: record.title,
    lead: record.lead,
    note: record.note,
    homeStyle: record.homeStyle,
    listStyle: record.listStyle,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ingredients: item.ingredients,
      qualifier: item.priceQualifier,
      image: item.imageId ? (images.get(item.imageId) ?? null) : null,
      prices: item.prices.map((price) => ({
        label: price.label,
        amountHuf: price.amountHuf,
      })),
    })),
  };
}

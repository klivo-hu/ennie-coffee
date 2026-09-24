import 'server-only';
import { loadMenuImages } from '@/lib/media/store';
import type { MenuCategory, SiteContent, SocialLink } from '@/lib/menu/types';
import { isOrderingPlatform } from '@/lib/social/platforms';
import { categoriesStore, productsStore, socialStore } from '@/lib/store/collections';
import type { CategoryRecord, ProductRecord } from '@/lib/store/types';

type Positioned = CategoryRecord | ProductRecord;

/** Manual order first, then the Hungarian collation of the name so ties are stable. */
function byPosition(a: Positioned, b: Positioned): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'hu');
}

/** Reads the public menu: visible categories, visible non-archived products, ordered. */
export async function loadContentFromStore(): Promise<SiteContent> {
  const [categoryRecords, productRecords, socialRecords] = await Promise.all([
    categoriesStore.read(),
    productsStore.read(),
    socialStore.read(),
  ]);

  const visibleCategories = categoryRecords
    .filter((category) => category.isVisible)
    .sort(byPosition);
  const visibleProducts = productRecords
    .filter((product) => product.isVisible && !product.isArchived && product.prices.length > 0)
    .sort(byPosition);

  const imageIds = [
    ...visibleCategories.map((category) => category.imageId),
    ...visibleProducts.map((product) => product.imageId),
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
    source: 'store',
  };
}

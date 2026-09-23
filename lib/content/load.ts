import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { categories, productPrices, products, socialLinks } from '@/lib/db/schema';
import { loadMenuImages } from '@/lib/media/store';
import type { MenuCategory, SiteContent, SocialLink } from '@/lib/menu/types';
import { isOrderingPlatform } from '@/lib/social/platforms';

/** Reads the public menu: visible categories, visible non-archived products, ordered. */
export async function loadContentFromDatabase(database: Database): Promise<SiteContent> {
  const categoryRows = await database
    .select()
    .from(categories)
    .where(eq(categories.isVisible, true))
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  const categoryIds = categoryRows.map((row) => row.id);
  const productRows =
    categoryIds.length === 0
      ? []
      : await database
          .select()
          .from(products)
          .where(
            and(
              inArray(products.categoryId, categoryIds),
              eq(products.isVisible, true),
              eq(products.isArchived, false),
            ),
          )
          .orderBy(asc(products.sortOrder), asc(products.name));

  const productIds = productRows.map((row) => row.id);
  const priceRows =
    productIds.length === 0
      ? []
      : await database
          .select()
          .from(productPrices)
          .where(inArray(productPrices.productId, productIds))
          .orderBy(asc(productPrices.sortOrder), asc(productPrices.amountHuf));

  const imageIds = [
    ...categoryRows.map((row) => row.imageId),
    ...productRows.map((row) => row.imageId),
  ].filter((id): id is string => id !== null);
  const images = await loadMenuImages(database, imageIds);

  const menu: MenuCategory[] = categoryRows
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      note: category.note,
      image: category.imageId ? (images.get(category.imageId) ?? null) : null,
      products: productRows
        .filter((product) => product.categoryId === category.id)
        .map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          qualifier: product.priceQualifier,
          image: product.imageId ? (images.get(product.imageId) ?? null) : null,
          prices: priceRows
            .filter((price) => price.productId === product.id)
            .map((price) => ({ label: price.label, amountHuf: price.amountHuf })),
        }))
        // A product without a price cannot be listed on a price list.
        .filter((product) => product.prices.length > 0),
    }))
    .filter((category) => category.products.length > 0);

  const socialRows = await database
    .select()
    .from(socialLinks)
    .where(eq(socialLinks.isVisible, true))
    .orderBy(asc(socialLinks.sortOrder));

  const links: SocialLink[] = socialRows.map((row) => ({
    id: row.id,
    platform: row.platform,
    url: row.url,
    handle: row.handle,
  }));

  return {
    menu,
    social: links.filter((link) => !isOrderingPlatform(link.platform)),
    ordering: links.filter((link) => isOrderingPlatform(link.platform)),
    source: 'database',
  };
}

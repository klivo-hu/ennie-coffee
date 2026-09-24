import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '@/lib/log';
import { processImage } from '@/lib/media/process';
import { saveProcessedImage } from '@/lib/media/store';
import { SEED_MENU, SEED_SOCIAL } from '@/lib/menu/seed-data';
import { slugify } from '@/lib/text/slug';
import { categoriesStore, productsStore, socialStore } from './collections';
import { createId, now } from './json-store';
import type { CategoryRecord, ProductRecord, SocialLinkRecord } from './types';

const SEED_IMAGE_DIR = path.join(process.cwd(), 'assets', 'menu');

async function seedImage(file: string): Promise<string | null> {
  try {
    const processed = await processImage(await readFile(path.join(SEED_IMAGE_DIR, file)));
    return await saveProcessedImage(processed, file, null);
  } catch (error) {
    // A missing seed image leaves the category imageless — the layout has a typographic variant
    // for exactly that — rather than failing the whole boot.
    logger.warn('seed.image_skipped', { file, error: String(error) });
    return null;
  }
}

/**
 * Writes the published menu and the café's links into an empty data directory, and encodes the
 * category photographs in `assets/menu/` into the media store.
 *
 * Runs on every start and does nothing unless the menu is completely empty, so it never
 * overwrites what the owner has edited — but it does make a first deployment render a finished
 * site, with real prices and real photographs, without anyone having to fill anything in.
 */
export async function seedIfEmpty(): Promise<boolean> {
  const [existingCategories, existingProducts] = await Promise.all([
    categoriesStore.read(),
    productsStore.read(),
  ]);
  // Both, not just categories: an owner who has deleted every category still has an empty menu on
  // purpose, and a restart must not undo that decision by refilling it.
  if (existingCategories.length > 0 || existingProducts.length > 0) return false;

  logger.info('seed.start', { categories: SEED_MENU.length });
  const timestamp = now();
  const categories: CategoryRecord[] = [];
  const products: ProductRecord[] = [];
  const usedSlugs = new Set<string>();

  for (const [categoryIndex, category] of SEED_MENU.entries()) {
    const imageId = category.image ? await seedImage(category.image) : null;
    const categoryId = createId();
    categories.push({
      id: categoryId,
      slug: category.slug,
      name: category.name,
      description: category.description,
      note: category.note,
      imageId,
      sortOrder: categoryIndex,
      isVisible: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    for (const [productIndex, product] of category.products.entries()) {
      let slug = slugify(product.name);
      while (usedSlugs.has(slug)) slug = `${slug}-${usedSlugs.size}`;
      usedSlugs.add(slug);
      products.push({
        id: createId(),
        categoryId,
        slug,
        name: product.name,
        description: product.description,
        priceQualifier: product.qualifier,
        prices: product.prices.map((price) => ({
          label: price.label,
          amountHuf: price.amountHuf,
        })),
        imageId: null,
        sortOrder: productIndex,
        isVisible: product.visible,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  const links: SocialLinkRecord[] = SEED_SOCIAL.map((link, index) => ({
    id: createId(),
    platform: link.platform,
    url: link.url,
    handle: link.handle,
    isVisible: true,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  // Each write re-checks emptiness inside its own lock, so a second start racing this one adds
  // nothing twice. Products go first: a crash in between leaves products no page reads (the menu
  // is built from the categories), whereas the reverse order would show empty categories.
  await productsStore.mutate((items) => ({
    items: items.length > 0 ? [...items] : products,
    result: undefined,
  }));
  await socialStore.mutate((items) => ({
    items: items.length > 0 ? [...items] : links,
    result: undefined,
  }));
  await categoriesStore.mutate((items) => ({
    items: items.length > 0 ? [...items] : categories,
    result: undefined,
  }));

  logger.info('seed.done', { categories: categories.length, products: products.length });
  return true;
}

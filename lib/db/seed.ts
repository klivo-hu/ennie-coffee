import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { categories, productPrices, products, socialLinks } from '@/lib/db/schema';
import { processImage } from '@/lib/media/process';
import { saveProcessedImage } from '@/lib/media/store';
import { SEED_MENU, SEED_SOCIAL } from '@/lib/menu/seed-data';
import { slugify } from '@/lib/text/slug';
import { logger } from '@/lib/log';

const SEED_IMAGE_DIR = path.join(process.cwd(), 'assets', 'menu');

async function seedImage(database: Database, file: string): Promise<string | null> {
  try {
    const buffer = await readFile(path.join(SEED_IMAGE_DIR, file));
    const processed = await processImage(buffer);
    return await saveProcessedImage(database, processed, file, null);
  } catch (error) {
    // A missing seed image leaves the category imageless — the layout has a typographic
    // variant for exactly that — rather than failing the whole boot.
    logger.warn('seed.image_skipped', { file, error: String(error) });
    return null;
  }
}

/**
 * Seeds the menu and social links into an empty database. Runs only when the categories table is
 * empty, so it never overwrites anything the owner has edited.
 */
export async function seedIfEmpty(database: Database): Promise<boolean> {
  const [{ count } = { count: 0 }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);
  if (count > 0) return false;

  logger.info('seed.start', { categories: SEED_MENU.length });
  const usedSlugs = new Set<string>();

  for (const [categoryIndex, category] of SEED_MENU.entries()) {
    const imageId = category.image ? await seedImage(database, category.image) : null;
    await database.transaction(async (tx) => {
      const [row] = await tx
        .insert(categories)
        .values({
          slug: category.slug,
          name: category.name,
          description: category.description,
          note: category.note,
          imageId,
          sortOrder: categoryIndex,
          isVisible: true,
        })
        .returning({ id: categories.id });
      if (!row) throw new Error(`Category insert failed: ${category.slug}`);

      for (const [productIndex, product] of category.products.entries()) {
        let slug = slugify(product.name);
        while (usedSlugs.has(slug)) slug = `${slug}-${usedSlugs.size}`;
        usedSlugs.add(slug);
        const [productRow] = await tx
          .insert(products)
          .values({
            categoryId: row.id,
            slug,
            name: product.name,
            description: product.description,
            priceQualifier: product.qualifier,
            sortOrder: productIndex,
            isVisible: product.visible,
          })
          .returning({ id: products.id });
        if (!productRow) throw new Error(`Product insert failed: ${product.name}`);
        await tx.insert(productPrices).values(
          product.prices.map((price, priceIndex) => ({
            productId: productRow.id,
            label: price.label,
            amountHuf: price.amountHuf,
            sortOrder: priceIndex,
          })),
        );
      }
    });
  }

  await database.insert(socialLinks).values(
    SEED_SOCIAL.map((link, index) => ({
      platform: link.platform,
      url: link.url,
      handle: link.handle,
      sortOrder: index,
      isVisible: true,
    })),
  );

  logger.info('seed.done');
  return true;
}

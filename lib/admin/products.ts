import 'server-only';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import type { Database } from '@/lib/db/client';
import { categories, productPrices, products } from '@/lib/db/schema';
import { slugify } from '@/lib/text/slug';
import type { productCreateSchema, productUpdateSchema } from '@/lib/validation/admin';
import { adminImages, deleteIfOrphaned, mediaExists } from './media';
import type { AdminProduct } from './types';

type CreateInput = z.output<typeof productCreateSchema>;
type UpdateInput = z.output<typeof productUpdateSchema>;

export async function listProducts(
  database: Database,
  includeArchived: boolean,
): Promise<AdminProduct[]> {
  const rows = await database
    .select()
    .from(products)
    .where(includeArchived ? undefined : eq(products.isArchived, false))
    .orderBy(asc(products.sortOrder), asc(products.name));
  const ids = rows.map((row) => row.id);
  const prices =
    ids.length === 0
      ? []
      : await database
          .select()
          .from(productPrices)
          .where(inArray(productPrices.productId, ids))
          .orderBy(asc(productPrices.sortOrder));
  const images = await adminImages(
    database,
    rows.map((row) => row.imageId).filter((id): id is string => id !== null),
  );
  return rows.map((row) => ({
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    qualifier: row.priceQualifier,
    prices: prices
      .filter((price) => price.productId === row.id)
      .map((price) => ({ label: price.label, amountHuf: price.amountHuf })),
    isVisible: row.isVisible,
    isArchived: row.isArchived,
    sortOrder: row.sortOrder,
    image: row.imageId ? (images.get(row.imageId) ?? null) : null,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

async function uniqueSlug(database: Database, base: string, excludeId?: string): Promise<string> {
  const root = base || 'termek';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const [clash] = await database
      .select({ id: products.id })
      .from(products)
      .where(
        excludeId
          ? and(eq(products.slug, candidate), ne(products.id, excludeId))
          : eq(products.slug, candidate),
      )
      .limit(1);
    if (!clash) return candidate;
  }
  throw new ApiError(409, 'slug_taken', 'Nem sikerült egyedi azonosítót képezni.');
}

async function assertCategory(database: Database, categoryId: string) {
  const [row] = await database
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!row) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      categoryId: 'A kategória nem létezik.',
    });
  }
}

async function assertImage(database: Database, imageId: string | null | undefined) {
  if (imageId && !(await mediaExists(database, imageId))) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      imageId: 'A kép nem található.',
    });
  }
}

export async function createProduct(database: Database, input: CreateInput): Promise<string> {
  await assertCategory(database, input.categoryId);
  await assertImage(database, input.imageId);
  const slug = await uniqueSlug(database, input.slug ?? slugify(input.name));
  return database.transaction(async (tx) => {
    const [{ next } = { next: 0 }] = await tx
      .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)::int` })
      .from(products)
      .where(eq(products.categoryId, input.categoryId));
    const [row] = await tx
      .insert(products)
      .values({
        categoryId: input.categoryId,
        name: input.name,
        slug,
        description: input.description,
        priceQualifier: input.qualifier,
        imageId: input.imageId ?? null,
        isVisible: input.isVisible,
        sortOrder: next,
      })
      .returning({ id: products.id });
    if (!row) throw new Error('Product insert returned no row.');
    await tx.insert(productPrices).values(
      input.prices.map((price, index) => ({
        productId: row.id,
        label: price.label,
        amountHuf: price.amountHuf,
        sortOrder: index,
      })),
    );
    return row.id;
  });
}

export async function updateProduct(
  database: Database,
  id: string,
  input: UpdateInput,
): Promise<void> {
  const [current] = await database.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) throw new ApiError(404, 'not_found', 'A termék nem található.');
  if (input.categoryId) await assertCategory(database, input.categoryId);
  await assertImage(database, input.imageId);
  const slug = input.slug !== undefined ? await uniqueSlug(database, input.slug, id) : undefined;

  await database.transaction(async (tx) => {
    const movedCategory = input.categoryId !== undefined && input.categoryId !== current.categoryId;
    let sortOrder: number | undefined;
    if (movedCategory) {
      const [{ next } = { next: 0 }] = await tx
        .select({ next: sql<number>`coalesce(max(${products.sortOrder}) + 1, 0)::int` })
        .from(products)
        .where(eq(products.categoryId, input.categoryId as string));
      sortOrder = next;
    }
    await tx
      .update(products)
      .set({
        categoryId: input.categoryId,
        name: input.name,
        slug,
        description: input.description,
        priceQualifier: input.qualifier,
        imageId: input.imageId,
        isVisible: input.isVisible,
        isArchived: input.isArchived,
        sortOrder,
      })
      .where(eq(products.id, id));
    if (input.prices) {
      await tx.delete(productPrices).where(eq(productPrices.productId, id));
      await tx.insert(productPrices).values(
        input.prices.map((price, index) => ({
          productId: id,
          label: price.label,
          amountHuf: price.amountHuf,
          sortOrder: index,
        })),
      );
    }
  });

  if (input.imageId !== undefined && input.imageId !== current.imageId) {
    await deleteIfOrphaned(database, current.imageId);
  }
}

/** Permanent deletion is only offered for archived products — archiving is the normal path. */
export async function deleteProduct(database: Database, id: string): Promise<void> {
  const [current] = await database.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) throw new ApiError(404, 'not_found', 'A termék nem található.');
  if (!current.isArchived) {
    throw new ApiError(409, 'not_archived', 'Törlés előtt archiváld a terméket.');
  }
  await database.delete(products).where(eq(products.id, id));
  await deleteIfOrphaned(database, current.imageId);
}

/** Applies a new order to the given products; every id must belong to the category. */
export async function reorderProducts(
  database: Database,
  categoryId: string,
  ids: readonly string[],
) {
  const rows = await database
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), inArray(products.id, [...ids])));
  if (rows.length !== new Set(ids).size) {
    throw new ApiError(
      422,
      'validation',
      'A sorrend olyan terméket tartalmaz, amely nem ebbe a kategóriába tartozik.',
    );
  }
  await database.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(products).set({ sortOrder: index }).where(eq(products.id, id));
    }
  });
}

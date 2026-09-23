import 'server-only';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import type { Database } from '@/lib/db/client';
import { categories, products } from '@/lib/db/schema';
import { slugify } from '@/lib/text/slug';
import type { categoryCreateSchema, categoryUpdateSchema } from '@/lib/validation/admin';
import { adminImages, deleteIfOrphaned, mediaExists } from './media';
import type { AdminCategory } from './types';

type CreateInput = z.output<typeof categoryCreateSchema>;
type UpdateInput = z.output<typeof categoryUpdateSchema>;

export async function listCategories(database: Database): Promise<AdminCategory[]> {
  const rows = await database
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const counts = await database
    .select({ categoryId: products.categoryId, count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.isArchived, false))
    .groupBy(products.categoryId);
  const images = await adminImages(
    database,
    rows.map((row) => row.imageId).filter((id): id is string => id !== null),
  );
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    note: row.note,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
    image: row.imageId ? (images.get(row.imageId) ?? null) : null,
    productCount: counts.find((count) => count.categoryId === row.id)?.count ?? 0,
  }));
}

async function uniqueSlug(database: Database, base: string, excludeId?: string): Promise<string> {
  const root = base || 'kategoria';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const [clash] = await database
      .select({ id: categories.id })
      .from(categories)
      .where(
        excludeId
          ? and(eq(categories.slug, candidate), ne(categories.id, excludeId))
          : eq(categories.slug, candidate),
      )
      .limit(1);
    if (!clash) return candidate;
  }
  throw new ApiError(409, 'slug_taken', 'Nem sikerült egyedi azonosítót képezni.');
}

async function assertImage(database: Database, imageId: string | null | undefined) {
  if (imageId && !(await mediaExists(database, imageId))) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      imageId: 'A kép nem található.',
    });
  }
}

export async function createCategory(database: Database, input: CreateInput): Promise<string> {
  await assertImage(database, input.imageId);
  const slug = await uniqueSlug(database, input.slug ?? slugify(input.name));
  const [{ next } = { next: 0 }] = await database
    .select({ next: sql<number>`coalesce(max(${categories.sortOrder}) + 1, 0)::int` })
    .from(categories);
  const [row] = await database
    .insert(categories)
    .values({
      name: input.name,
      slug,
      description: input.description,
      note: input.note,
      imageId: input.imageId ?? null,
      isVisible: input.isVisible,
      sortOrder: next,
    })
    .returning({ id: categories.id });
  if (!row) throw new Error('Category insert returned no row.');
  return row.id;
}

export async function updateCategory(
  database: Database,
  id: string,
  input: UpdateInput,
): Promise<void> {
  const [current] = await database.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!current) throw new ApiError(404, 'not_found', 'A kategória nem található.');
  await assertImage(database, input.imageId);
  const slug = input.slug !== undefined ? await uniqueSlug(database, input.slug, id) : undefined;
  await database
    .update(categories)
    .set({
      name: input.name,
      slug,
      description: input.description,
      note: input.note,
      imageId: input.imageId,
      isVisible: input.isVisible,
    })
    .where(eq(categories.id, id));
  if (input.imageId !== undefined && input.imageId !== current.imageId) {
    await deleteIfOrphaned(database, current.imageId);
  }
}

/** A category that still holds products (archived included) cannot be deleted. */
export async function deleteCategory(database: Database, id: string): Promise<void> {
  const [current] = await database.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!current) throw new ApiError(404, 'not_found', 'A kategória nem található.');
  const [{ count } = { count: 0 }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.categoryId, id));
  if (count > 0) {
    throw new ApiError(
      409,
      'category_not_empty',
      'A kategóriában még vannak termékek (archiváltak is). Előbb helyezd át vagy töröld őket.',
    );
  }
  await database.delete(categories).where(eq(categories.id, id));
  await deleteIfOrphaned(database, current.imageId);
}

export async function reorderCategories(database: Database, ids: readonly string[]) {
  const rows = await database
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, [...ids]));
  if (rows.length !== new Set(ids).size) {
    throw new ApiError(422, 'validation', 'Ismeretlen kategória a sorrendben.');
  }
  await database.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(categories).set({ sortOrder: index }).where(eq(categories.id, id));
    }
  });
}

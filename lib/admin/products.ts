import 'server-only';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import { categoriesStore, productsStore } from '@/lib/store/collections';
import { createId, now } from '@/lib/store/json-store';
import type { ProductRecord } from '@/lib/store/types';
import { slugify } from '@/lib/text/slug';
import type { productCreateSchema, productUpdateSchema } from '@/lib/validation/admin';
import { adminImages, deleteIfOrphaned, mediaExists } from './media';
import type { AdminProduct } from './types';

type CreateInput = z.output<typeof productCreateSchema>;
type UpdateInput = z.output<typeof productUpdateSchema>;

function sortProducts(a: ProductRecord, b: ProductRecord): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'hu');
}

export async function listProducts(includeArchived: boolean): Promise<AdminProduct[]> {
  const records = (await productsStore.read())
    .filter((product) => includeArchived || !product.isArchived)
    .sort(sortProducts);
  const images = await adminImages(
    records.map((record) => record.imageId).filter((id): id is string => id !== null),
  );
  return records.map((record) => ({
    id: record.id,
    categoryId: record.categoryId,
    name: record.name,
    slug: record.slug,
    description: record.description,
    qualifier: record.priceQualifier,
    prices: record.prices.map((price) => ({ label: price.label, amountHuf: price.amountHuf })),
    isVisible: record.isVisible,
    isArchived: record.isArchived,
    sortOrder: record.sortOrder,
    image: record.imageId ? (images.get(record.imageId) ?? null) : null,
    updatedAt: record.updatedAt,
  }));
}

/**
 * A slug unique among products. Resolved inside the caller's mutation, against the same snapshot
 * the write is applied to, so two products created back to back cannot land on the same slug.
 */
function uniqueSlug(items: readonly ProductRecord[], base: string, excludeId?: string): string {
  const root = base || 'termek';
  const taken = new Set(
    items.filter((item) => item.id !== excludeId).map((item) => item.slug),
  );
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new ApiError(409, 'slug_taken', 'Nem sikerült egyedi azonosítót képezni.');
}

async function assertCategory(categoryId: string): Promise<void> {
  const exists = (await categoriesStore.read()).some((category) => category.id === categoryId);
  if (!exists) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      categoryId: 'A kategória nem létezik.',
    });
  }
}

async function assertImage(imageId: string | null | undefined): Promise<void> {
  if (imageId && !(await mediaExists(imageId))) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      imageId: 'A kép nem található.',
    });
  }
}

export async function createProduct(input: CreateInput): Promise<string> {
  await assertCategory(input.categoryId);
  await assertImage(input.imageId);
  const timestamp = now();

  return productsStore.mutate((items) => {
    const nextOrder = items
      .filter((item) => item.categoryId === input.categoryId)
      .reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
    const record: ProductRecord = {
      id: createId(),
      categoryId: input.categoryId,
      slug: uniqueSlug(items, input.slug ?? slugify(input.name)),
      name: input.name,
      description: input.description,
      priceQualifier: input.qualifier,
      prices: input.prices.map((price) => ({
        label: price.label,
        amountHuf: price.amountHuf,
      })),
      imageId: input.imageId ?? null,
      sortOrder: nextOrder,
      isVisible: input.isVisible,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { items: [...items, record], result: record.id };
  });
}

export async function updateProduct(id: string, input: UpdateInput): Promise<void> {
  const current = (await productsStore.read()).find((product) => product.id === id);
  if (!current) throw new ApiError(404, 'not_found', 'A termék nem található.');
  if (input.categoryId !== undefined) await assertCategory(input.categoryId);
  await assertImage(input.imageId);
  const timestamp = now();

  await productsStore.mutate((items) => {
    const record = items.find((product) => product.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A termék nem található.');
    const movedCategory =
      input.categoryId !== undefined && input.categoryId !== record.categoryId;
    const categoryId = input.categoryId ?? record.categoryId;
    const next: ProductRecord = {
      ...record,
      categoryId,
      name: input.name ?? record.name,
      slug:
        input.slug !== undefined ? uniqueSlug(items, input.slug, record.id) : record.slug,
      description: input.description !== undefined ? input.description : record.description,
      priceQualifier: input.qualifier ?? record.priceQualifier,
      prices: input.prices
        ? input.prices.map((price) => ({ label: price.label, amountHuf: price.amountHuf }))
        : record.prices,
      imageId: input.imageId !== undefined ? input.imageId : record.imageId,
      isVisible: input.isVisible ?? record.isVisible,
      isArchived: input.isArchived ?? record.isArchived,
      // Moving to another category puts the product at the end of its new one, where the owner
      // can see it, instead of at whatever position it happened to hold in the old one.
      sortOrder: movedCategory
        ? items
            .filter((item) => item.categoryId === categoryId)
            .reduce((max, item) => Math.max(max, item.sortOrder + 1), 0)
        : record.sortOrder,
      updatedAt: timestamp,
    };
    return {
      items: items.map((product) => (product.id === id ? next : product)),
      result: undefined,
    };
  });

  if (input.imageId !== undefined && input.imageId !== current.imageId) {
    await deleteIfOrphaned(current.imageId);
  }
}

/** Permanent deletion is only offered for archived products — archiving is the normal path. */
export async function deleteProduct(id: string): Promise<void> {
  const removed = await productsStore.mutate((items) => {
    const record = items.find((product) => product.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A termék nem található.');
    if (!record.isArchived) {
      throw new ApiError(409, 'not_archived', 'Törlés előtt archiváld a terméket.');
    }
    return {
      items: items.filter((product) => product.id !== id),
      result: record,
    };
  });
  await deleteIfOrphaned(removed.imageId);
}

/** Applies a new order to the given products; every id must belong to the category. */
export async function reorderProducts(
  categoryId: string,
  ids: readonly string[],
): Promise<void> {
  const timestamp = now();
  await productsStore.mutate((items) => {
    const position = new Map<string, number>(ids.map((id, index) => [id, index]));
    const belong = items.filter(
      (product) => product.categoryId === categoryId && position.has(product.id),
    );
    if (belong.length !== new Set(ids).size) {
      throw new ApiError(
        422,
        'validation',
        'A sorrend olyan terméket tartalmaz, amely nem ebbe a kategóriába tartozik.',
      );
    }
    return {
      items: items.map((product) => {
        const index = product.categoryId === categoryId ? position.get(product.id) : undefined;
        return index === undefined
          ? product
          : { ...product, sortOrder: index, updatedAt: timestamp };
      }),
      result: undefined,
    };
  });
}

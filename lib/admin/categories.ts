import 'server-only';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import { categoriesStore, productsStore } from '@/lib/store/collections';
import { createId, now } from '@/lib/store/json-store';
import type { CategoryRecord } from '@/lib/store/types';
import { slugify } from '@/lib/text/slug';
import type { categoryCreateSchema, categoryUpdateSchema } from '@/lib/validation/admin';
import { adminImages, deleteIfOrphaned, mediaExists } from './media';
import type { AdminCategory } from './types';

type CreateInput = z.output<typeof categoryCreateSchema>;
type UpdateInput = z.output<typeof categoryUpdateSchema>;

export async function listCategories(): Promise<AdminCategory[]> {
  const [records, products] = await Promise.all([
    categoriesStore.read(),
    productsStore.read(),
  ]);
  const ordered = [...records].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'hu'),
  );
  const images = await adminImages(
    ordered.map((record) => record.imageId).filter((id): id is string => id !== null),
  );
  return ordered.map((record) => ({
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    note: record.note,
    isVisible: record.isVisible,
    sortOrder: record.sortOrder,
    image: record.imageId ? (images.get(record.imageId) ?? null) : null,
    productCount: products.filter(
      (product) => product.categoryId === record.id && !product.isArchived,
    ).length,
  }));
}

/** A slug unique among categories, resolved against the snapshot the write is applied to. */
function uniqueSlug(items: readonly CategoryRecord[], base: string, excludeId?: string): string {
  const root = base || 'kategoria';
  const taken = new Set(items.filter((item) => item.id !== excludeId).map((item) => item.slug));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new ApiError(409, 'slug_taken', 'Nem sikerült egyedi azonosítót képezni.');
}

async function assertImage(imageId: string | null | undefined): Promise<void> {
  if (imageId && !(await mediaExists(imageId))) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      imageId: 'A kép nem található.',
    });
  }
}

export async function createCategory(input: CreateInput): Promise<string> {
  await assertImage(input.imageId);
  const timestamp = now();
  return categoriesStore.mutate((items) => {
    const record: CategoryRecord = {
      id: createId(),
      slug: uniqueSlug(items, input.slug ?? slugify(input.name)),
      name: input.name,
      description: input.description,
      note: input.note,
      imageId: input.imageId ?? null,
      sortOrder: items.reduce((max, item) => Math.max(max, item.sortOrder + 1), 0),
      isVisible: input.isVisible,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return { items: [...items, record], result: record.id };
  });
}

export async function updateCategory(id: string, input: UpdateInput): Promise<void> {
  const current = (await categoriesStore.read()).find((category) => category.id === id);
  if (!current) throw new ApiError(404, 'not_found', 'A kategória nem található.');
  await assertImage(input.imageId);
  const timestamp = now();

  await categoriesStore.mutate((items) => {
    const record = items.find((category) => category.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A kategória nem található.');
    const next: CategoryRecord = {
      ...record,
      slug: input.slug !== undefined ? uniqueSlug(items, input.slug, record.id) : record.slug,
      name: input.name ?? record.name,
      description: input.description !== undefined ? input.description : record.description,
      note: input.note !== undefined ? input.note : record.note,
      imageId: input.imageId !== undefined ? input.imageId : record.imageId,
      isVisible: input.isVisible ?? record.isVisible,
      updatedAt: timestamp,
    };
    return {
      items: items.map((category) => (category.id === id ? next : category)),
      result: undefined,
    };
  });

  if (input.imageId !== undefined && input.imageId !== current.imageId) {
    await deleteIfOrphaned(current.imageId);
  }
}

/** A category that still holds products (archived included) cannot be deleted. */
export async function deleteCategory(id: string): Promise<void> {
  const products = await productsStore.read();
  if (products.some((product) => product.categoryId === id)) {
    throw new ApiError(
      409,
      'category_not_empty',
      'A kategóriában még vannak termékek (archiváltak is). Előbb helyezd át vagy töröld őket.',
    );
  }
  const removed = await categoriesStore.mutate((items) => {
    const record = items.find((category) => category.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A kategória nem található.');
    return { items: items.filter((category) => category.id !== id), result: record };
  });
  await deleteIfOrphaned(removed.imageId);
}

export async function reorderCategories(ids: readonly string[]): Promise<void> {
  const timestamp = now();
  await categoriesStore.mutate((items) => {
    const position = new Map<string, number>(ids.map((id, index) => [id, index]));
    const known = items.filter((category) => position.has(category.id));
    if (known.length !== new Set(ids).size) {
      throw new ApiError(422, 'validation', 'Ismeretlen kategória a sorrendben.');
    }
    return {
      items: items.map((category) => {
        const index = position.get(category.id);
        return index === undefined
          ? category
          : { ...category, sortOrder: index, updatedAt: timestamp };
      }),
      result: undefined,
    };
  });
}

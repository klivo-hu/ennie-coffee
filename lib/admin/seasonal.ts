import 'server-only';
import type { z } from 'zod';
import { ApiError } from '@/lib/api/route';
import { mutateSeasonalSection, readSeasonalSection } from '@/lib/seasonal/record';
import { MAX_SEASONAL_ITEMS } from '@/lib/seasonal/styles';
import { createId, now } from '@/lib/store/json-store';
import type { SeasonalItemRecord } from '@/lib/store/types';
import type {
  seasonalItemCreateSchema,
  seasonalItemUpdateSchema,
  seasonalSectionUpdateSchema,
} from '@/lib/validation/admin';
import { adminImages, deleteIfOrphaned, mediaExists } from './media';
import type { AdminSeasonalSection } from './types';

/**
 * The seasonal showcase as the admin edits it: the section's own settings, and its items.
 *
 * Items live inside the section record, so every write here goes through one mutation of that
 * record — add, edit, remove and reorder are each a single atomic save, and an item can never
 * exist without its section.
 */

type SectionInput = z.output<typeof seasonalSectionUpdateSchema>;
type ItemCreateInput = z.output<typeof seasonalItemCreateSchema>;
type ItemUpdateInput = z.output<typeof seasonalItemUpdateSchema>;

export async function getSeasonalSection(): Promise<AdminSeasonalSection> {
  const record = await readSeasonalSection();
  const images = await adminImages(
    record.items.map((item) => item.imageId).filter((id): id is string => id !== null),
  );
  return {
    isEnabled: record.isEnabled,
    title: record.title,
    lead: record.lead,
    note: record.note,
    homeStyle: record.homeStyle,
    listStyle: record.listStyle,
    items: record.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ingredients: item.ingredients,
      qualifier: item.priceQualifier,
      prices: item.prices.map((price) => ({ label: price.label, amountHuf: price.amountHuf })),
      isVisible: item.isVisible,
      image: item.imageId ? (images.get(item.imageId) ?? null) : null,
    })),
  };
}

async function assertImage(imageId: string | null | undefined): Promise<void> {
  if (imageId && !(await mediaExists(imageId))) {
    throw new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', {
      imageId: 'A kép nem található.',
    });
  }
}

export async function updateSeasonalSection(input: SectionInput): Promise<void> {
  const timestamp = now();
  await mutateSeasonalSection((current) => ({
    section: {
      ...current,
      isEnabled: input.isEnabled ?? current.isEnabled,
      title: input.title ?? current.title,
      lead: input.lead !== undefined ? input.lead : current.lead,
      note: input.note !== undefined ? input.note : current.note,
      homeStyle: input.homeStyle ?? current.homeStyle,
      listStyle: input.listStyle ?? current.listStyle,
      updatedAt: timestamp,
    },
    result: undefined,
  }));
}

export async function createSeasonalItem(input: ItemCreateInput): Promise<string> {
  await assertImage(input.imageId);
  const timestamp = now();
  return mutateSeasonalSection((current) => {
    if (current.items.length >= MAX_SEASONAL_ITEMS) {
      throw new ApiError(
        409,
        'seasonal_full',
        `A szezonális szakaszban legfeljebb ${MAX_SEASONAL_ITEMS} tétel lehet. Törölj vagy rejts el egyet, mielőtt újat veszel fel.`,
      );
    }
    const record: SeasonalItemRecord = {
      id: createId(),
      name: input.name,
      description: input.description,
      ingredients: input.ingredients,
      priceQualifier: input.qualifier,
      prices: input.prices.map((price) => ({
        label: price.label,
        amountHuf: price.amountHuf,
      })),
      imageId: input.imageId ?? null,
      isVisible: input.isVisible,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    return {
      section: { ...current, items: [...current.items, record], updatedAt: timestamp },
      result: record.id,
    };
  });
}

export async function updateSeasonalItem(id: string, input: ItemUpdateInput): Promise<void> {
  await assertImage(input.imageId);
  const timestamp = now();
  const previousImageId = await mutateSeasonalSection((current) => {
    const record = current.items.find((item) => item.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A tétel nem található.');
    const next: SeasonalItemRecord = {
      ...record,
      name: input.name ?? record.name,
      description: input.description !== undefined ? input.description : record.description,
      ingredients: input.ingredients ?? record.ingredients,
      priceQualifier: input.qualifier ?? record.priceQualifier,
      prices: input.prices
        ? input.prices.map((price) => ({ label: price.label, amountHuf: price.amountHuf }))
        : record.prices,
      imageId: input.imageId !== undefined ? input.imageId : record.imageId,
      isVisible: input.isVisible ?? record.isVisible,
      updatedAt: timestamp,
    };
    return {
      section: {
        ...current,
        items: current.items.map((item) => (item.id === id ? next : item)),
        updatedAt: timestamp,
      },
      result: record.imageId,
    };
  });

  if (input.imageId !== undefined && input.imageId !== previousImageId) {
    await deleteIfOrphaned(previousImageId);
  }
}

export async function deleteSeasonalItem(id: string): Promise<void> {
  const timestamp = now();
  const removed = await mutateSeasonalSection((current) => {
    const record = current.items.find((item) => item.id === id);
    if (!record) throw new ApiError(404, 'not_found', 'A tétel nem található.');
    return {
      section: {
        ...current,
        items: current.items.filter((item) => item.id !== id),
        updatedAt: timestamp,
      },
      result: record,
    };
  });
  await deleteIfOrphaned(removed.imageId);
}

/** Applies a new order; the ids must be exactly the section's items. */
export async function reorderSeasonalItems(ids: readonly string[]): Promise<void> {
  const timestamp = now();
  await mutateSeasonalSection((current) => {
    const position = new Map<string, number>(ids.map((id, index) => [id, index]));
    const known = current.items.filter((item) => position.has(item.id));
    if (known.length !== new Set(ids).size) {
      throw new ApiError(422, 'validation', 'Ismeretlen tétel a sorrendben.');
    }
    const ordered = [...current.items].sort(
      (a, b) =>
        (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
    return { section: { ...current, items: ordered, updatedAt: timestamp }, result: undefined };
  });
}

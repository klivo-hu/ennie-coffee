import 'server-only';
import { logger } from '@/lib/log';
import { deleteMedia, mediaVariantUrl } from '@/lib/media/store';
import { categoriesStore, mediaStore, productsStore, seasonalStore } from '@/lib/store/collections';
import type { AdminImage } from './types';

/** Preview (smallest WebP) for admin lists. */
export async function adminImages(ids: readonly string[]): Promise<Map<string, AdminImage>> {
  const wanted = new Set(ids);
  const result = new Map<string, AdminImage>();
  if (wanted.size === 0) return result;

  for (const record of await mediaStore.read()) {
    if (!wanted.has(record.id)) continue;
    const smallest = record.variants
      .filter((variant) => variant.format === 'webp')
      .reduce<number | null>(
        (best, variant) => (best === null || variant.width < best ? variant.width : best),
        null,
      );
    if (smallest === null) continue;
    result.set(record.id, {
      id: record.id,
      dominantColor: record.dominantColor,
      previewUrl: mediaVariantUrl(record.id, smallest, 'webp'),
    });
  }
  return result;
}

export async function mediaExists(id: string): Promise<boolean> {
  return (await mediaStore.read()).some((record) => record.id === id);
}

/**
 * Deletes a replaced image once nothing references it any more, so the store does not grow with
 * every re-upload. Images are only ever referenced by categories, products, and the items of the
 * seasonal showcase — every holder must be consulted here, or a shared image would be deleted
 * out from under one of them.
 */
export async function deleteIfOrphaned(id: string | null | undefined): Promise<void> {
  if (!id) return;
  try {
    const [categories, products, seasonal] = await Promise.all([
      categoriesStore.read(),
      productsStore.read(),
      seasonalStore.read(),
    ]);
    const referenced =
      categories.some((category) => category.imageId === id) ||
      products.some((product) => product.imageId === id) ||
      seasonal.some((section) => section.items.some((item) => item.imageId === id));
    if (referenced) return;
    await deleteMedia(id);
  } catch (error) {
    logger.warn('media.orphan_cleanup_failed', { id, error: String(error) });
  }
}

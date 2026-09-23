import 'server-only';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { categories, media, mediaVariants, products } from '@/lib/db/schema';
import { logger } from '@/lib/log';
import { mediaVariantUrl } from '@/lib/media/store';
import type { AdminImage } from './types';

/** Preview (smallest WebP) for admin lists. */
export async function adminImages(
  database: Database,
  ids: readonly string[],
): Promise<Map<string, AdminImage>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, AdminImage>();
  if (unique.length === 0) return result;
  const rows = await database
    .select({
      id: media.id,
      dominantColor: media.dominantColor,
      width: mediaVariants.width,
    })
    .from(media)
    .innerJoin(
      mediaVariants,
      and(eq(mediaVariants.mediaId, media.id), eq(mediaVariants.format, 'webp')),
    )
    .where(inArray(media.id, unique))
    .orderBy(asc(mediaVariants.width));
  for (const row of rows) {
    if (result.has(row.id)) continue;
    result.set(row.id, {
      id: row.id,
      dominantColor: row.dominantColor,
      previewUrl: mediaVariantUrl(row.id, row.width, 'webp'),
    });
  }
  return result;
}

export async function mediaExists(database: Database, id: string): Promise<boolean> {
  const [row] = await database
    .select({ id: media.id })
    .from(media)
    .where(eq(media.id, id))
    .limit(1);
  return Boolean(row);
}

/**
 * Deletes a replaced image once nothing references it any more, so the store does not grow with
 * every re-upload. Images are only ever referenced by categories and products.
 */
export async function deleteIfOrphaned(
  database: Database,
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  try {
    await database.execute(sql`
      delete from ${media}
      where ${media.id} = ${id}
        and not exists (select 1 from ${categories} where ${categories.imageId} = ${id})
        and not exists (select 1 from ${products} where ${products.imageId} = ${id})
    `);
  } catch (error) {
    logger.warn('media.orphan_cleanup_failed', { id, error: String(error) });
  }
}

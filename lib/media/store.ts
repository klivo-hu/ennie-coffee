import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { media, mediaVariants } from '@/lib/db/schema';
import type { MenuImage } from '@/lib/menu/types';
import type { ProcessedImage } from './process';

/** Public URL of one stored variant. Ids are random UUIDs and content never changes in place. */
export function mediaVariantUrl(mediaId: string, width: number, format: 'avif' | 'webp'): string {
  return `/media/${mediaId}/${width}.${format}`;
}

export async function saveProcessedImage(
  database: Pick<Database, 'insert' | 'transaction'>,
  image: ProcessedImage,
  originalName: string,
  createdBy: string | null,
): Promise<string> {
  return database.transaction(async (tx) => {
    const [row] = await tx
      .insert(media)
      .values({
        originalName: originalName.slice(0, 200),
        width: image.width,
        height: image.height,
        blurDataUrl: image.blurDataUrl,
        dominantColor: image.dominantColor,
        createdBy,
      })
      .returning({ id: media.id });
    if (!row) throw new Error('Media insert returned no row.');
    await tx.insert(mediaVariants).values(
      image.variants.map((variant) => ({
        mediaId: row.id,
        format: variant.format,
        width: variant.width,
        height: variant.height,
        byteSize: variant.bytes.byteLength,
        bytes: variant.bytes,
      })),
    );
    return row.id;
  });
}

/** Loads the rendering metadata (never the bytes) for a set of media ids. */
export async function loadMenuImages(
  database: Database,
  ids: readonly string[],
): Promise<Map<string, MenuImage>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, MenuImage>();
  if (unique.length === 0) return result;

  const rows = await database.select().from(media).where(inArray(media.id, unique));
  const variants = await database
    .select({
      mediaId: mediaVariants.mediaId,
      format: mediaVariants.format,
      width: mediaVariants.width,
    })
    .from(mediaVariants)
    .where(inArray(mediaVariants.mediaId, unique));

  for (const row of rows) {
    result.set(row.id, {
      kind: 'media',
      width: row.width,
      height: row.height,
      blurDataUrl: row.blurDataUrl,
      dominantColor: row.dominantColor,
      variants: variants
        .filter((variant) => variant.mediaId === row.id)
        .sort((a, b) => a.width - b.width)
        .map((variant) => ({
          format: variant.format,
          width: variant.width,
          src: mediaVariantUrl(row.id, variant.width, variant.format),
        })),
    });
  }
  return result;
}

export async function readVariant(
  database: Database,
  mediaId: string,
  width: number,
  format: 'avif' | 'webp',
) {
  const [row] = await database
    .select({ bytes: mediaVariants.bytes, byteSize: mediaVariants.byteSize })
    .from(mediaVariants)
    .where(
      and(
        eq(mediaVariants.mediaId, mediaId),
        eq(mediaVariants.width, width),
        eq(mediaVariants.format, format),
      ),
    )
    .limit(1);
  return row ?? null;
}

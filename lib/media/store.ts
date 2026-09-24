import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mediaStore } from '@/lib/store/collections';
import { createId, dataPath, now } from '@/lib/store/json-store';
import type { ImageFormat, MediaRecord, MediaVariantRecord } from '@/lib/store/types';
import { logger } from '@/lib/log';
import type { MenuImage } from '@/lib/menu/types';
import type { ProcessedImage } from './process';

/**
 * Stored imagery: the encoded bytes as files under `DATA_DIR/media/<id>/<width>.<format>`, their
 * rendering metadata in `media.json`.
 *
 * Bytes are kept out of the JSON deliberately. A single 1600 px AVIF is larger than the whole
 * menu, and base64 in a file that is read and rewritten as one unit would make every menu edit
 * rewrite megabytes. On disk, a variant is served with one `readFile` of exactly the bytes asked
 * for, and the metadata file stays small enough to hold in memory.
 *
 * Every path segment is server-chosen: the id is a UUID this module generates, and the file name
 * is derived from the variant's own width and format. Nothing a visitor or an uploader supplies
 * ever reaches the filesystem, and a served variant must additionally appear in the record — a
 * path that is not in `media.json` is a 404 even if the file exists.
 */

const MEDIA_DIR = 'media';

/** Public URL of one stored variant. Ids are random and content never changes in place. */
export function mediaVariantUrl(mediaId: string, width: number, format: ImageFormat): string {
  return `/media/${mediaId}/${width}.${format}`;
}

function variantDir(mediaId: string): string {
  return dataPath(MEDIA_DIR, mediaId);
}

function variantFileName(width: number, format: ImageFormat): string {
  return `${width}.${format}`;
}

/**
 * Writes the encoded variants, then records them. That order matters: a crash in between leaves
 * unreferenced files (harmless, and cleaned up by a later upload of the same image) rather than a
 * record pointing at bytes that were never written.
 */
export async function saveProcessedImage(
  image: ProcessedImage,
  originalName: string,
  createdBy: string | null,
): Promise<string> {
  const id = createId();
  const directory = variantDir(id);
  await mkdir(directory, { recursive: true });

  const variants: MediaVariantRecord[] = [];
  for (const variant of image.variants) {
    const file = variantFileName(variant.width, variant.format);
    await writeFile(path.join(directory, file), variant.bytes, { mode: 0o600 });
    variants.push({
      format: variant.format,
      width: variant.width,
      height: variant.height,
      byteSize: variant.bytes.byteLength,
      file,
    });
  }

  const record: MediaRecord = {
    id,
    originalName: originalName.slice(0, 200),
    width: image.width,
    height: image.height,
    blurDataUrl: image.blurDataUrl,
    dominantColor: image.dominantColor,
    createdBy,
    createdAt: now(),
    variants,
  };
  await mediaStore.mutate((items) => ({ items: [...items, record], result: undefined }));
  return id;
}

/** Removes a stored image and its bytes. A file that is already gone is a success. */
export async function deleteMedia(id: string): Promise<void> {
  const removed = await mediaStore.mutate((items) => {
    const remaining = items.filter((item) => item.id !== id);
    return { items: remaining, result: remaining.length !== items.length };
  });
  if (!removed) return;
  await rm(variantDir(id), { recursive: true, force: true });
}

export async function findMedia(id: string): Promise<MediaRecord | undefined> {
  return (await mediaStore.read()).find((item) => item.id === id);
}

function toMenuImage(record: MediaRecord): MenuImage {
  return {
    kind: 'media',
    width: record.width,
    height: record.height,
    blurDataUrl: record.blurDataUrl,
    dominantColor: record.dominantColor,
    variants: [...record.variants]
      .sort((a, b) => a.width - b.width)
      .map((variant) => ({
        format: variant.format,
        width: variant.width,
        src: mediaVariantUrl(record.id, variant.width, variant.format),
      })),
  };
}

/** Rendering metadata (never the bytes) for a set of media ids. */
export async function loadMenuImages(
  ids: readonly string[],
): Promise<Map<string, MenuImage>> {
  const wanted = new Set(ids);
  const result = new Map<string, MenuImage>();
  if (wanted.size === 0) return result;
  for (const record of await mediaStore.read()) {
    if (wanted.has(record.id)) result.set(record.id, toMenuImage(record));
  }
  return result;
}

export interface StoredVariant {
  readonly bytes: Buffer;
  readonly byteSize: number;
}

/**
 * Reads one variant's bytes, or null when the combination is not a stored variant. The record is
 * consulted first, so only files this module wrote can ever be served.
 */
export async function readVariant(
  mediaId: string,
  width: number,
  format: ImageFormat,
): Promise<StoredVariant | null> {
  const record = await findMedia(mediaId);
  const variant = record?.variants.find(
    (item) => item.width === width && item.format === format,
  );
  if (!record || !variant) return null;
  try {
    const bytes = await readFile(path.join(variantDir(record.id), variant.file));
    return { bytes, byteSize: bytes.byteLength };
  } catch (error) {
    // The record outlived its bytes — a restored volume, or a partial write that never finished.
    logger.warn('media.bytes_missing', { id: mediaId, file: variant.file, error: String(error) });
    return null;
  }
}

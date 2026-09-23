import 'server-only';
import sharp, { type Metadata } from 'sharp';

/**
 * Image pipeline for uploads and seed imagery.
 *
 * The file's real type is decided by decoding it, never by its name or the client's
 * Content-Type. Every output is re-encoded from pixels, which also drops EXIF (including GPS
 * coordinates from phone photos) and anything smuggled in metadata. Variants are produced once, at
 * upload, so serving an image is a single indexed read with no per-request processing.
 */

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_INPUT_PIXELS = 48_000_000;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);
/**
 * Widths chosen for the layouts that show images, so every slot has a close candidate at 1–3×
 * density: menu thumbnails (64–96 px → 160, 320), category images (≈ 30rem or full phone width →
 * 640–1280), and a large size for wide screens (1600).
 */
export const VARIANT_WIDTHS = [160, 320, 640, 960, 1280, 1600] as const;
const MIN_SIDE = 320;

export class ImageRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageRejectedError';
  }
}

export interface ProcessedVariant {
  readonly format: 'avif' | 'webp';
  readonly width: number;
  readonly height: number;
  readonly bytes: Buffer;
}

export interface ProcessedImage {
  readonly width: number;
  readonly height: number;
  readonly blurDataUrl: string;
  readonly dominantColor: string;
  readonly variants: readonly ProcessedVariant[];
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, '0');
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength === 0) throw new ImageRejectedError('Üres fájl.');
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError('A kép legfeljebb 12 MB lehet.');
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageRejectedError('A fájl nem értelmezhető képként.');
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ImageRejectedError('Csak JPEG, PNG, WebP, AVIF vagy HEIC kép tölthető fel.');
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new ImageRejectedError('Animált képek nem tölthetők fel.');
  }

  // Apply EXIF orientation first so width/height describe what a person actually sees.
  const oriented = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .toColorspace('srgb')
    .toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  if (Math.min(width, height) < MIN_SIDE) {
    throw new ImageRejectedError(`A kép legalább ${MIN_SIDE} képpont széles és magas legyen.`);
  }

  const base = oriented.data;
  const variants: ProcessedVariant[] = [];
  const targets = VARIANT_WIDTHS.filter((target) => target < width);
  // Always keep one variant at (or capped to) the source width so small uploads still render.
  const largest = VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1] ?? width;
  const widths = [...targets, Math.min(width, largest)];

  for (const target of [...new Set(widths)]) {
    const resized = sharp(base).resize({ width: target, withoutEnlargement: true });
    const [avif, webp] = await Promise.all([
      resized.clone().avif({ quality: 52, effort: 4 }).toBuffer({ resolveWithObject: true }),
      resized.clone().webp({ quality: 78, effort: 5 }).toBuffer({ resolveWithObject: true }),
    ]);
    variants.push(
      { format: 'avif', width: avif.info.width, height: avif.info.height, bytes: avif.data },
      { format: 'webp', width: webp.info.width, height: webp.info.height, bytes: webp.data },
    );
  }

  const blur = await sharp(base).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  const stats = await sharp(base).stats();
  const [r, g, b] = [stats.dominant.r, stats.dominant.g, stats.dominant.b];

  return {
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    dominantColor: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    variants,
  };
}

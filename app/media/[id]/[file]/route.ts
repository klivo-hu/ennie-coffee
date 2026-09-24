import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/log';
import { readVariant } from '@/lib/media/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = /^(\d{2,4})\.(avif|webp)$/;
const CONTENT_TYPE = { avif: 'image/avif', webp: 'image/webp' } as const;

function notFound() {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}

/**
 * Serves a stored image variant. Media ids are random and a stored variant never changes, so the
 * response is cacheable forever by browsers and any shared cache in front of the site.
 *
 * The id is checked to be a UUID and the file name to be `<width>.<format>` before anything
 * touches the filesystem, and `readVariant` additionally refuses a variant that is not recorded —
 * so no request can name a path the application did not create.
 */
export async function GET(
  _request: NextRequest,
  segment: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await segment.params;
  const match = FILE.exec(file);
  if (!match || !z.uuid().safeParse(id).success) return notFound();
  const [, width, format] = match as unknown as [string, string, 'avif' | 'webp'];

  try {
    const variant = await readVariant(id, Number(width), format);
    if (!variant) return notFound();
    // This copies, and that is deliberate. A zero-copy view over the Buffer's own memory would be
    // `new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)`, but `Buffer.buffer` is
    // typed `ArrayBufferLike` — possibly shared — and `BodyInit` requires a `Uint8Array<ArrayBuffer>`.
    // Narrowing it needs an assertion, and the copy is a cold path: responses here are immutable
    // and cached for a year, so this runs on a visitor's first request for an image and no other.
    return new NextResponse(new Uint8Array(variant.bytes), {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPE[format],
        'Content-Length': String(variant.byteSize),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    });
  } catch (error) {
    logger.error('media.read_failed', { id, error: String(error) });
    return new NextResponse(null, { status: 503, headers: { 'Retry-After': '10' } });
  }
}

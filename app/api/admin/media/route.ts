import { ApiError, ok, route } from '@/lib/api/route';
import { audit } from '@/lib/audit';
import { adminImages } from '@/lib/admin/media';
import { ImageRejectedError, MAX_UPLOAD_BYTES, processImage } from '@/lib/media/process';
import { saveProcessedImage } from '@/lib/media/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Image upload. Authenticated and in the expensive tier (decoding and encoding six variants is
 * real CPU). The size is checked before the body is read, the type is decided by decoding, and
 * only re-encoded pixels are stored — the uploaded file itself is never kept or served.
 */
export const POST = route(
  { rateLimit: { tier: 'expensive', scope: 'media-upload' }, permission: 'media:write' },
  async ({ request, principal, client }) => {
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw new ApiError(413, 'too_large', 'A kép legfeljebb 12 MB lehet.');
    }
    const type = request.headers.get('content-type') ?? '';
    if (!type.startsWith('multipart/form-data')) {
      throw new ApiError(415, 'unsupported_media_type', 'Fájlfeltöltést várunk.');
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(422, 'validation', 'Válassz ki egy képet.');
    if (file.size > MAX_UPLOAD_BYTES)
      throw new ApiError(413, 'too_large', 'A kép legfeljebb 12 MB lehet.');

    let processed;
    try {
      processed = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageRejectedError)
        throw new ApiError(422, 'image_rejected', error.message);
      throw error;
    }

    const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 120) || 'feltoltes';
    const id = await saveProcessedImage(processed, name, principal!.user.id);
    await audit({
      actorId: principal!.user.id,
      action: 'media.uploaded',
      entity: 'media',
      entityId: id,
      ip: client.ip,
      detail: { width: processed.width, height: processed.height },
    });
    const preview = (await adminImages([id])).get(id);
    return ok(
      { id, previewUrl: preview?.previewUrl ?? null, dominantColor: processed.dominantColor },
      201,
    );
  },
);

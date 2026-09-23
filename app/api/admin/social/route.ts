import { ok, readJson, route } from '@/lib/api/route';
import { createSocial, listSocial } from '@/lib/admin/social';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { connection } from '@/lib/db/client';
import { socialCreateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'social' }, permission: 'social:write' },
  async () => ok(await listSocial(connection().db)),
);

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'social' }, permission: 'social:write' },
  async ({ request, principal, client }) => {
    const input = await readJson(request, socialCreateSchema);
    const id = await createSocial(connection().db, input);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'social.created',
      entity: 'social',
      entityId: id,
      ip: client.ip,
      detail: { platform: input.platform },
    });
    return ok({ id }, 201);
  },
);

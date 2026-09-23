import { ok, readJson, route, uuidParam } from '@/lib/api/route';
import { deleteSocial, updateSocial } from '@/lib/admin/social';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { connection } from '@/lib/db/client';
import { socialUpdateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = route<Params>(
  { rateLimit: { tier: 'mutation', scope: 'social' }, permission: 'social:write' },
  async ({ request, params, principal, client }) => {
    const id = uuidParam(params.id);
    const input = await readJson(request, socialUpdateSchema);
    await updateSocial(connection().db, id, input);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'social.updated',
      entity: 'social',
      entityId: id,
      ip: client.ip,
      detail: { fields: Object.keys(input) },
    });
    return ok({ id });
  },
);

export const DELETE = route<Params>(
  { rateLimit: { tier: 'expensive', scope: 'social-delete' }, permission: 'social:write' },
  async ({ params, principal, client }) => {
    const id = uuidParam(params.id);
    await deleteSocial(connection().db, id);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'social.deleted',
      entity: 'social',
      entityId: id,
      ip: client.ip,
    });
    return ok({ id });
  },
);

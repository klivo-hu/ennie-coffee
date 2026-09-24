import { ok, readJson, route, uuidParam } from '@/lib/api/route';
import { deleteSeasonalItem, updateSeasonalItem } from '@/lib/admin/seasonal';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { seasonalItemUpdateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = route<Params>(
  { rateLimit: { tier: 'mutation', scope: 'seasonal-items' }, permission: 'content:write' },
  async ({ request, params, principal, client }) => {
    const id = uuidParam(params.id);
    const input = await readJson(request, seasonalItemUpdateSchema);
    await updateSeasonalItem(id, input);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'seasonal.item_updated',
      entity: 'seasonal',
      entityId: id,
      ip: client.ip,
      detail: { fields: Object.keys(input) },
    });
    return ok({ id });
  },
);

export const DELETE = route<Params>(
  { rateLimit: { tier: 'expensive', scope: 'seasonal-items-delete' }, permission: 'content:write' },
  async ({ params, principal, client }) => {
    const id = uuidParam(params.id);
    await deleteSeasonalItem(id);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'seasonal.item_deleted',
      entity: 'seasonal',
      entityId: id,
      ip: client.ip,
    });
    return ok({ id });
  },
);

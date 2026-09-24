import { ok, readJson, route } from '@/lib/api/route';
import { createSeasonalItem } from '@/lib/admin/seasonal';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { seasonalItemCreateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'seasonal-items' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const input = await readJson(request, seasonalItemCreateSchema);
    const id = await createSeasonalItem(input);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'seasonal.item_created',
      entity: 'seasonal',
      entityId: id,
      ip: client.ip,
      detail: { name: input.name },
    });
    return ok({ id }, 201);
  },
);

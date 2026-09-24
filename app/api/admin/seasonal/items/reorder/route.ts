import { ok, readJson, route } from '@/lib/api/route';
import { reorderSeasonalItems } from '@/lib/admin/seasonal';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { reorderSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const POST = route(
  {
    rateLimit: { tier: 'mutation', scope: 'seasonal-items-reorder' },
    permission: 'content:write',
  },
  async ({ request, principal, client }) => {
    const { ids } = await readJson(request, reorderSchema);
    await reorderSeasonalItems(ids);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'seasonal.item_reordered',
      entity: 'seasonal',
      ip: client.ip,
    });
    return ok({ ok: true });
  },
);

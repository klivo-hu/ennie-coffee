import { ok, readJson, route } from '@/lib/api/route';
import { reorderCategories } from '@/lib/admin/categories';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { reorderSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'categories-reorder' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const { ids } = await readJson(request, reorderSchema);
    await reorderCategories(ids);
    invalidateContent();
    await audit({ actorId: principal!.user.id, action: 'category.reordered', ip: client.ip });
    return ok({ ok: true });
  },
);

import { ok, readJson, route } from '@/lib/api/route';
import { reorderSocial } from '@/lib/admin/social';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { reorderSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'social-reorder' }, permission: 'social:write' },
  async ({ request, principal, client }) => {
    const { ids } = await readJson(request, reorderSchema);
    await reorderSocial(ids);
    invalidateContent();
    await audit({ actorId: principal!.user.id, action: 'social.reordered', ip: client.ip });
    return ok({ ok: true });
  },
);

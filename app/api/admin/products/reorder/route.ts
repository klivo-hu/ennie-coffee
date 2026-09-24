import { z } from 'zod';
import { ok, readJson, route } from '@/lib/api/route';
import { reorderProducts } from '@/lib/admin/products';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { reorderSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

const schema = reorderSchema.extend({ categoryId: z.uuid() });

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'products-reorder' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const { categoryId, ids } = await readJson(request, schema);
    await reorderProducts(categoryId, ids);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'product.reordered',
      entity: 'category',
      entityId: categoryId,
      ip: client.ip,
    });
    return ok({ ok: true });
  },
);

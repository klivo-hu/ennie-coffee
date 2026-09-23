import { ok, readJson, route, uuidParam } from '@/lib/api/route';
import { deleteProduct, updateProduct } from '@/lib/admin/products';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { connection } from '@/lib/db/client';
import { productUpdateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = route<Params>(
  { rateLimit: { tier: 'mutation', scope: 'products' }, permission: 'content:write' },
  async ({ request, params, principal, client }) => {
    const id = uuidParam(params.id);
    const input = await readJson(request, productUpdateSchema);
    await updateProduct(connection().db, id, input);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'product.updated',
      entity: 'product',
      entityId: id,
      ip: client.ip,
      detail: { fields: Object.keys(input) },
    });
    return ok({ id });
  },
);

/** Permanent deletion of an archived product: the destructive tier (RL-21). */
export const DELETE = route<Params>(
  { rateLimit: { tier: 'expensive', scope: 'products-delete' }, permission: 'content:write' },
  async ({ params, principal, client }) => {
    const id = uuidParam(params.id);
    await deleteProduct(connection().db, id);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'product.deleted',
      entity: 'product',
      entityId: id,
      ip: client.ip,
    });
    return ok({ id });
  },
);

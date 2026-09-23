import { ok, readJson, route, uuidParam } from '@/lib/api/route';
import { deleteCategory, updateCategory } from '@/lib/admin/categories';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { connection } from '@/lib/db/client';
import { categoryUpdateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export const PATCH = route<Params>(
  { rateLimit: { tier: 'mutation', scope: 'categories' }, permission: 'content:write' },
  async ({ request, params, principal, client }) => {
    const id = uuidParam(params.id);
    const input = await readJson(request, categoryUpdateSchema);
    await updateCategory(connection().db, id, input);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'category.updated',
      entity: 'category',
      entityId: id,
      ip: client.ip,
      detail: { fields: Object.keys(input) },
    });
    return ok({ id });
  },
);

export const DELETE = route<Params>(
  { rateLimit: { tier: 'expensive', scope: 'categories-delete' }, permission: 'content:write' },
  async ({ params, principal, client }) => {
    const id = uuidParam(params.id);
    await deleteCategory(connection().db, id);
    await invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'category.deleted',
      entity: 'category',
      entityId: id,
      ip: client.ip,
    });
    return ok({ id });
  },
);

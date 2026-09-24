import { ok, readJson, route } from '@/lib/api/route';
import { createCategory, listCategories } from '@/lib/admin/categories';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { categoryCreateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'categories' }, permission: 'content:write' },
  async () => ok(await listCategories()),
);

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'categories' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const input = await readJson(request, categoryCreateSchema);
    const id = await createCategory(input);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'category.created',
      entity: 'category',
      entityId: id,
      ip: client.ip,
      detail: { name: input.name },
    });
    return ok({ id }, 201);
  },
);

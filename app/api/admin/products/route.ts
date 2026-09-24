import { ok, readJson, route } from '@/lib/api/route';
import { createProduct, listProducts } from '@/lib/admin/products';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { productCreateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'products' }, permission: 'content:write' },
  async ({ request }) => {
    const includeArchived = request.nextUrl.searchParams.get('archived') === '1';
    return ok(await listProducts(includeArchived));
  },
);

export const POST = route(
  { rateLimit: { tier: 'mutation', scope: 'products' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const input = await readJson(request, productCreateSchema);
    const id = await createProduct(input);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'product.created',
      entity: 'product',
      entityId: id,
      ip: client.ip,
      detail: { name: input.name },
    });
    return ok({ id }, 201);
  },
);

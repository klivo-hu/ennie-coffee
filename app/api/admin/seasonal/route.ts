import { ok, readJson, route } from '@/lib/api/route';
import { getSeasonalSection, updateSeasonalSection } from '@/lib/admin/seasonal';
import { audit } from '@/lib/audit';
import { invalidateContent } from '@/lib/content/cache';
import { seasonalSectionUpdateSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';

export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'seasonal' }, permission: 'content:write' },
  async () => ok(await getSeasonalSection()),
);

export const PATCH = route(
  { rateLimit: { tier: 'mutation', scope: 'seasonal' }, permission: 'content:write' },
  async ({ request, principal, client }) => {
    const input = await readJson(request, seasonalSectionUpdateSchema);
    await updateSeasonalSection(input);
    invalidateContent();
    await audit({
      actorId: principal!.user.id,
      action: 'seasonal.updated',
      entity: 'seasonal',
      ip: client.ip,
      detail: { fields: Object.keys(input) },
    });
    return ok({ ok: true });
  },
);

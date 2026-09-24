import { ok, route } from '@/lib/api/route';
import { recentAudit } from '@/lib/audit';
import { adminUsernamesById } from '@/lib/store/admins';

export const dynamic = 'force-dynamic';

/** The latest administrative actions. Owner only. */
export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'audit' }, permission: 'audit:read' },
  async () => ok(await recentAudit(100, await adminUsernamesById())),
);

import { desc, eq } from 'drizzle-orm';
import { ok, route } from '@/lib/api/route';
import { connection } from '@/lib/db/client';
import { adminUsers, auditLog } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/** The latest administrative actions. Owner only. */
export const GET = route(
  { rateLimit: { tier: 'admin', scope: 'audit' }, permission: 'audit:read' },
  async () => {
    const rows = await connection()
      .db.select({
        id: auditLog.id,
        at: auditLog.at,
        action: auditLog.action,
        entity: auditLog.entity,
        ip: auditLog.ipAddress,
        actorUsername: adminUsers.username,
      })
      .from(auditLog)
      .leftJoin(adminUsers, eq(adminUsers.id, auditLog.actorId))
      .orderBy(desc(auditLog.at))
      .limit(100);
    return ok(rows.map((row) => ({ ...row, at: row.at.toISOString() })));
  },
);

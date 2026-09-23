import 'server-only';
import { connection } from '@/lib/db/client';
import { auditLog } from '@/lib/db/schema';
import { logger } from '@/lib/log';

/**
 * Append-only record of administrative actions: who changed what, when, from where. Written
 * after the change succeeds; a failure to audit is logged but never undoes the change.
 */
export async function audit(entry: {
  readonly actorId: string | null;
  readonly action: string;
  readonly entity?: string;
  readonly entityId?: string;
  readonly ip?: string;
  readonly detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connection()
      .db.insert(auditLog)
      .values({
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        ipAddress: entry.ip ?? null,
        detail: entry.detail ?? null,
      });
  } catch (error) {
    logger.error('audit.write_failed', { action: entry.action, error: String(error) });
  }
}

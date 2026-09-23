import 'server-only';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/log';
import { connection } from './client';

/**
 * Retention, enforced rather than promised. These periods are the ones stated in the privacy
 * notice (/adatkezelesi-tajekoztato); change both together.
 */
export const RETENTION = {
  rateLimitWindows: '1 day',
  expiredSessions: '30 days',
  auditLog: '365 days',
} as const;

const EVERY_MS = 6 * 60 * 60 * 1000;
const globalForMaintenance = globalThis as unknown as { __ennieMaintenance?: NodeJS.Timeout };

export async function runMaintenance(): Promise<void> {
  const { db } = connection();
  try {
    await db.execute(
      sql`delete from rate_limits where window_start < now() - ${RETENTION.rateLimitWindows}::interval`,
    );
    await db.execute(
      sql`delete from admin_sessions where expires_at < now() - ${RETENTION.expiredSessions}::interval`,
    );
    await db.execute(sql`delete from audit_log where at < now() - ${RETENTION.auditLog}::interval`);
    logger.info('maintenance.done');
  } catch (error) {
    logger.warn('maintenance.failed', { error: String(error) });
  }
}

/** Idempotent: any number of instances may run it; each delete is a no-op the second time. */
export function scheduleMaintenance(): void {
  if (globalForMaintenance.__ennieMaintenance) return;
  void runMaintenance();
  const timer = setInterval(() => void runMaintenance(), EVERY_MS);
  timer.unref();
  globalForMaintenance.__ennieMaintenance = timer;
}

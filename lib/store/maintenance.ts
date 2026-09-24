import 'server-only';
import { logger } from '@/lib/log';
import { auditStore, sessionsStore } from './collections';
import type { Collection } from './json-store';

/**
 * Retention, enforced rather than promised. These periods are the ones stated in the privacy
 * notice (/adatkezelesi-tajekoztato); change both together.
 */
export const RETENTION = {
  expiredSessionDays: 30,
  auditLogDays: 365,
} as const;

const EVERY_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const globalForMaintenance = globalThis as unknown as { __ennieMaintenance?: NodeJS.Timeout };

/** The ISO timestamp `days` in the past — anything stamped before it is past retention. */
function cutoff(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/**
 * Drops everything in one collection whose timestamp is older than `since`.
 *
 * The check comes before the mutation so an ordinary sweep — the common case, where nothing has
 * aged out yet — does not rewrite the file at all. ISO-8601 UTC strings are fixed width, so
 * comparing them as text is comparing them as instants.
 */
async function expire<T>(
  store: Collection<T>,
  stampOf: (item: T) => string,
  since: string,
): Promise<number> {
  const items = await store.read();
  if (!items.some((item) => stampOf(item) <= since)) return 0;
  return store.mutate((current) => {
    const kept = current.filter((item) => stampOf(item) > since);
    return { items: kept, result: current.length - kept.length };
  });
}

/** Drops sessions and audit entries past their retention period. Idempotent. */
export async function runMaintenance(): Promise<void> {
  try {
    const removedSessions = await expire(
      sessionsStore,
      (session) => session.expiresAt,
      cutoff(RETENTION.expiredSessionDays),
    );
    const removedAudit = await expire(
      auditStore,
      (entry) => entry.at,
      cutoff(RETENTION.auditLogDays),
    );
    if (removedSessions > 0 || removedAudit > 0) {
      logger.info('maintenance.done', { removedSessions, removedAudit });
    }
  } catch (error) {
    logger.warn('maintenance.failed', { error: String(error) });
  }
}

/** Starts the sweep once per process; the timer is unref'd so it never holds the process open. */
export function scheduleMaintenance(): void {
  if (globalForMaintenance.__ennieMaintenance) return;
  void runMaintenance();
  const timer = setInterval(() => void runMaintenance(), EVERY_MS);
  timer.unref();
  globalForMaintenance.__ennieMaintenance = timer;
}

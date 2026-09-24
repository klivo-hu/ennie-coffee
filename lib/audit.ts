import 'server-only';
import { logger } from '@/lib/log';
import { auditStore } from '@/lib/store/collections';
import { now } from '@/lib/store/json-store';
import type { AuditRecord } from '@/lib/store/types';

/**
 * Append-only record of administrative actions: who changed what, when, from where. Written
 * after the change succeeds; a failure to audit is logged but never undoes the change.
 *
 * The file is bounded from both ends: entries older than the retention period are swept by
 * `lib/store/maintenance.ts`, and a hard cap here keeps a runaway loop of failed logins from
 * growing the file without limit between sweeps. The cap is far above the 150 entries the admin
 * screen shows and above a year of ordinary use.
 */

const MAX_ENTRIES = 20_000;

export async function audit(entry: {
  readonly actorId: string | null;
  readonly action: string;
  readonly entity?: string;
  readonly entityId?: string;
  readonly ip?: string;
  readonly detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await auditStore.mutate((items) => {
      const record: AuditRecord = {
        id: items.reduce((max, item) => Math.max(max, item.id + 1), 1),
        at: now(),
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        ipAddress: entry.ip ?? null,
        detail: entry.detail ?? null,
      };
      const next = [...items, record];
      return {
        items: next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next,
        result: undefined,
      };
    });
  } catch (error) {
    logger.error('audit.write_failed', { action: entry.action, error: String(error) });
  }
}

export interface AuditView {
  readonly id: number;
  readonly at: string;
  readonly action: string;
  readonly entity: string | null;
  readonly ip: string | null;
  readonly actorUsername: string | null;
}

/** The most recent entries, newest first, with the actor resolved to a username. */
export async function recentAudit(
  limit: number,
  usernames: ReadonlyMap<string, string>,
): Promise<AuditView[]> {
  const entries = await auditStore.read();
  return entries
    .slice(Math.max(0, entries.length - limit))
    .reverse()
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      action: entry.action,
      entity: entry.entity,
      ip: entry.ipAddress,
      actorUsername: entry.actorId ? (usernames.get(entry.actorId) ?? null) : null,
    }));
}

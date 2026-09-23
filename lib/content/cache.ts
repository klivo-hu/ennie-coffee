import 'server-only';
import { hasDatabase } from '@/lib/config/env';
import { connection } from '@/lib/db/client';
import { logger } from '@/lib/log';
import type { SiteContent } from '@/lib/menu/types';
import { fallbackContent } from './fallback';
import { loadContentFromDatabase } from './load';

/**
 * Per-instance snapshot of the public content (menu + social links).
 *
 * Public pages read the snapshot instead of querying on every request. Freshness across
 * instances comes from Postgres LISTEN/NOTIFY: the instance that handles an admin change clears
 * its own snapshot and notifies the channel, and every other instance clears on the notification.
 * The TTL is only a safety net for a missed notification. No state here is authoritative — losing
 * an instance loses a cache, never data.
 */

const CHANNEL = 'ennie_content_changed';
const TTL_MS = 5 * 60_000;
const FALLBACK_TTL_MS = 15_000;

interface CacheState {
  snapshot: SiteContent | null;
  expiresAt: number;
  inflight: Promise<SiteContent> | null;
  listening: boolean;
}

const globalForCache = globalThis as unknown as { __ennieContent?: CacheState };
const state = (globalForCache.__ennieContent ??= {
  snapshot: null,
  expiresAt: 0,
  inflight: null,
  listening: false,
});

function clearLocal() {
  state.snapshot = null;
  state.expiresAt = 0;
}

async function load(): Promise<SiteContent> {
  if (!hasDatabase()) return fallbackContent();
  try {
    const content = await loadContentFromDatabase(connection().db);
    // An empty database (boot still seeding) renders the published menu rather than nothing.
    return content.menu.length > 0
      ? content
      : { ...fallbackContent(), social: content.social, ordering: content.ordering };
  } catch (error) {
    logger.error('content.load_failed', { error: String(error) });
    return fallbackContent();
  }
}

export async function getSiteContent(): Promise<SiteContent> {
  const now = Date.now();
  if (state.snapshot && now < state.expiresAt) return state.snapshot;
  state.inflight ??= load()
    .then((content) => {
      state.snapshot = content;
      state.expiresAt = Date.now() + (content.source === 'database' ? TTL_MS : FALLBACK_TTL_MS);
      return content;
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}

/** Call after every admin mutation that changes public content. */
export async function invalidateContent(): Promise<void> {
  clearLocal();
  if (!hasDatabase()) return;
  try {
    await connection().sql`select pg_notify(${CHANNEL}, ${String(Date.now())})`;
  } catch (error) {
    logger.warn('content.notify_failed', { error: String(error) });
  }
}

export async function startContentListener(): Promise<void> {
  if (state.listening || !hasDatabase()) return;
  state.listening = true;
  try {
    await connection().sql.listen(
      CHANNEL,
      () => clearLocal(),
      () => clearLocal(),
    );
    logger.info('content.listening', { channel: CHANNEL });
  } catch (error) {
    state.listening = false;
    logger.warn('content.listen_failed', { error: String(error) });
  }
}

import 'server-only';
import { logger } from '@/lib/log';
import type { SiteContent } from '@/lib/menu/types';
import { fallbackContent } from './fallback';
import { loadContentFromStore } from './load';

/**
 * Snapshot of the public content (menu + social links).
 *
 * Every public page renders per request, so without this each one would re-derive the whole menu:
 * three collection reads, an image lookup, and the grouping in `load.ts`. The snapshot collapses
 * that to a single object read, and an admin change clears it synchronously in the same process
 * that made the change — one container owns both the writes and the cache, so "immediately" here
 * means immediately, with no invalidation channel to miss. The TTL is a safety net, not a
 * freshness mechanism.
 *
 * Nothing here is authoritative: losing this state loses a cache, never data.
 */

const TTL_MS = 5 * 60_000;
const FALLBACK_TTL_MS = 15_000;

interface CacheState {
  snapshot: SiteContent | null;
  expiresAt: number;
  inflight: Promise<SiteContent> | null;
}

const globalForCache = globalThis as unknown as { __ennieContent?: CacheState };
const state = (globalForCache.__ennieContent ??= {
  snapshot: null,
  expiresAt: 0,
  inflight: null,
});

async function load(): Promise<SiteContent> {
  try {
    const content = await loadContentFromStore();
    // An empty store (boot still seeding) renders the published menu rather than nothing.
    return content.menu.length > 0
      ? content
      : {
          ...fallbackContent(),
          social: content.social,
          ordering: content.ordering,
          seasonal: content.seasonal,
        };
  } catch (error) {
    logger.error('content.load_failed', { error: String(error) });
    return fallbackContent();
  }
}

export async function getSiteContent(): Promise<SiteContent> {
  const nowMs = Date.now();
  if (state.snapshot && nowMs < state.expiresAt) return state.snapshot;
  // Concurrent requests during a miss share one load instead of each starting their own.
  state.inflight ??= load()
    .then((content) => {
      state.snapshot = content;
      state.expiresAt = Date.now() + (content.source === 'store' ? TTL_MS : FALLBACK_TTL_MS);
      return content;
    })
    .finally(() => {
      state.inflight = null;
    });
  return state.inflight;
}

/** Call after every admin mutation that changes public content. */
export function invalidateContent(): void {
  state.snapshot = null;
  state.expiresAt = 0;
}

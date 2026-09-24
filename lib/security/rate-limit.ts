import 'server-only';

/**
 * Server-side rate limiting.
 *
 * The site runs as one container — one process owns every request and every write — so the
 * counters live in that process's memory. This is not a compromise on a shared store: it is the
 * same guarantee, without the round trip. A limit of 5 means 5, counted exactly, because there is
 * no second counter anywhere to disagree with this one, and no store that can be unreachable
 * mid-check. (Were the site ever scaled to several instances, this module is the one place that
 * would have to move to a shared counter; the tiers and the call sites would not change.)
 *
 * Tiers are the CEF security-policy starting points. Each request is counted per source address
 * and, when the caller is identified (a username being tried, an admin id), per identity too.
 *
 * Counters are deliberately not persisted. A restart clears them, which is the safe direction:
 * the attacker gains at most one window's worth of attempts, while the per-account lockout in
 * the login route — which *is* stored — keeps escalating across restarts.
 */

export interface Tier {
  readonly name: string;
  readonly perIdentity: number | null;
  readonly perSource: number;
  readonly windowSeconds: number;
}

export const TIERS = {
  auth: { name: 'auth', perIdentity: 5, perSource: 20, windowSeconds: 15 * 60 },
  admin: { name: 'admin', perIdentity: 60, perSource: 120, windowSeconds: 60 },
  mutation: { name: 'mutation', perIdentity: 60, perSource: 120, windowSeconds: 60 },
  expensive: { name: 'expensive', perIdentity: 10, perSource: 20, windowSeconds: 60 },
} as const satisfies Record<string, Tier>;

export type TierName = keyof typeof TIERS;

export type RateDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

interface CounterWindow {
  startedAt: number;
  count: number;
}

/**
 * Upper bound on tracked keys, so a flood from many addresses cannot grow the map without limit.
 * When it is reached the oldest windows are dropped first — those are the ones closest to
 * expiring anyway, and an entry that is dropped early only ever grants attempts, never denies
 * them, which is the direction a memory guard must fail in.
 */
const MAX_KEYS = 50_000;
const SWEEP_MS = 60_000;

interface LimiterState {
  windows: Map<string, CounterWindow>;
  sweeper: NodeJS.Timeout | null;
}

const globalForLimiter = globalThis as unknown as { __ennieRateLimit?: LimiterState };
const state = (globalForLimiter.__ennieRateLimit ??= { windows: new Map(), sweeper: null });

/** The longest window any tier uses; nothing older than this can still be counting. */
const MAX_WINDOW_MS = Math.max(...Object.values(TIERS).map((tier) => tier.windowSeconds)) * 1000;

function sweep(): void {
  const cutoff = Date.now() - MAX_WINDOW_MS;
  for (const [key, entry] of state.windows) {
    if (entry.startedAt <= cutoff) state.windows.delete(key);
  }
}

function ensureSweeper(): void {
  if (state.sweeper) return;
  const timer = setInterval(sweep, SWEEP_MS);
  timer.unref();
  state.sweeper = timer;
}

function hit(key: string, windowSeconds: number): { count: number; resetIn: number } {
  ensureSweeper();
  const nowMs = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = state.windows.get(key);

  if (!existing || existing.startedAt + windowMs <= nowMs) {
    if (!existing && state.windows.size >= MAX_KEYS) {
      sweep();
      // Still full after a sweep: drop the single oldest entry to make room. Map iteration is
      // insertion-ordered, and a window is inserted when it starts, so the first key is the one
      // that started longest ago.
      if (state.windows.size >= MAX_KEYS) {
        const oldest = state.windows.keys().next();
        if (!oldest.done) state.windows.delete(oldest.value);
      }
    }
    state.windows.set(key, { startedAt: nowMs, count: 1 });
    return { count: 1, resetIn: windowSeconds };
  }

  existing.count += 1;
  const resetIn = Math.ceil((existing.startedAt + windowMs - nowMs) / 1000);
  return { count: existing.count, resetIn: Math.max(1, resetIn) };
}

export function checkRateLimit(
  tierName: TierName,
  scope: string,
  subject: { readonly source?: string | null; readonly identity?: string | null },
): RateDecision {
  const tier: Tier = TIERS[tierName];
  const { source, identity } = subject;

  if (source) {
    const bySource = hit(`${tier.name}:${scope}:ip:${source}`, tier.windowSeconds);
    if (bySource.count > tier.perSource) {
      return { allowed: false, retryAfterSeconds: bySource.resetIn };
    }
  }
  if (identity && tier.perIdentity !== null) {
    const byIdentity = hit(`${tier.name}:${scope}:id:${identity}`, tier.windowSeconds);
    if (byIdentity.count > tier.perIdentity) {
      return { allowed: false, retryAfterSeconds: byIdentity.resetIn };
    }
  }
  return { allowed: true };
}

/** Clears a counter — used after a successful login so a typo does not linger. */
export function resetRateLimit(tierName: TierName, scope: string, identity: string): void {
  state.windows.delete(`${TIERS[tierName].name}:${scope}:id:${identity}`);
}

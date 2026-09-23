import 'server-only';
import { sql } from 'drizzle-orm';
import { connection } from '@/lib/db/client';
import { logger } from '@/lib/log';

/**
 * Server-side rate limiting, stored in Postgres so every instance counts against the same
 * window: a limit of 5 means 5 whether one instance serves traffic or ten (LB-11, RL-10).
 *
 * Tiers are the CEF security-policy starting points. Each request is counted per source address
 * and, when the caller is identified (a username being tried, an admin id), per identity too.
 * The limiter fails **closed**: if the store cannot be reached the request is refused, because an
 * unlimited login endpoint during a database blip is exactly the window an attacker wants.
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
  | {
      readonly allowed: false;
      readonly retryAfterSeconds: number;
      readonly reason: 'limited' | 'unavailable';
    };

async function hit(
  key: string,
  windowSeconds: number,
): Promise<{ count: number; resetIn: number }> {
  const { db } = connection();
  const rows = await db.execute<{ count: number; reset_in: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case
        when rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) then now()
        else rate_limits.window_start
      end
    returning count,
      ceil(extract(epoch from (window_start + make_interval(secs => ${windowSeconds}) - now())))::int as reset_in
  `);
  const row = rows[0];
  return { count: row?.count ?? 1, resetIn: Math.max(1, row?.reset_in ?? windowSeconds) };
}

export async function checkRateLimit(
  tierName: TierName,
  scope: string,
  subject: { readonly source?: string | null; readonly identity?: string | null },
): Promise<RateDecision> {
  const tier: Tier = TIERS[tierName];
  const { source, identity } = subject;
  try {
    if (source) {
      const bySource = await hit(`${tier.name}:${scope}:ip:${source}`, tier.windowSeconds);
      if (bySource.count > tier.perSource) {
        return { allowed: false, retryAfterSeconds: bySource.resetIn, reason: 'limited' };
      }
    }
    if (identity && tier.perIdentity !== null) {
      const byIdentity = await hit(`${tier.name}:${scope}:id:${identity}`, tier.windowSeconds);
      if (byIdentity.count > tier.perIdentity) {
        return { allowed: false, retryAfterSeconds: byIdentity.resetIn, reason: 'limited' };
      }
    }
    return { allowed: true };
  } catch (error) {
    logger.error('rate_limit.store_unavailable', { tier: tier.name, error: String(error) });
    return { allowed: false, retryAfterSeconds: 30, reason: 'unavailable' };
  }
}

/** Clears a counter — used after a successful login so a typo does not linger. */
export async function resetRateLimit(tierName: TierName, scope: string, identity: string) {
  const tier = TIERS[tierName];
  try {
    await connection().db.execute(
      sql`delete from rate_limits where key = ${`${tier.name}:${scope}:id:${identity}`}`,
    );
  } catch (error) {
    logger.warn('rate_limit.reset_failed', { error: String(error) });
  }
}

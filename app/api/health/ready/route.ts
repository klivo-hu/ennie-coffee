import { NextResponse } from 'next/server';
import { hasDatabase } from '@/lib/config/env';
import { bootState } from '@/lib/db/boot';
import { connection } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

const PING_TIMEOUT_MS = 1_000;

/**
 * Readiness: may this instance receive traffic? The load balancer polls it (LB-06).
 *
 * The instance is ready once its server has started. The database state is reported but does not
 * gate readiness on its own: it is shared by every instance, so evicting all of them when it
 * blips would turn "admin unavailable" into "site down" — while the public pages keep serving the
 * published menu from the fallback. See docs/architecture.md.
 */
export async function GET() {
  let database: 'disabled' | 'up' | 'down' = 'disabled';
  if (hasDatabase()) {
    try {
      await Promise.race([
        connection().sql`select 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PING_TIMEOUT_MS)),
      ]);
      database = 'up';
    } catch {
      database = 'down';
    }
  }
  return NextResponse.json(
    { status: 'ready', database, boot: bootState() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

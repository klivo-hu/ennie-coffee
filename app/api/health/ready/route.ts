import { NextResponse } from 'next/server';
import { bootState } from '@/lib/store/boot';

export const dynamic = 'force-dynamic';

/**
 * Readiness: is this instance serving? The platform's health probes and any uptime monitor read
 * it, and it is the one endpoint that reports how boot went.
 *
 * A failed boot — a data directory that cannot be written — is reported but does not make the
 * instance unready: the public pages still render the published menu from the seed data, and
 * taking the container out of rotation would turn "the admin is unavailable" into "the site is
 * down". The `store` field is what tells an operator which of the two is happening.
 */
export function GET() {
  return NextResponse.json(
    { status: 'ready', store: bootState() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

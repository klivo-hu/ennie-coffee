import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness: the process is up and answering. Used by the container healthcheck only. */
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}

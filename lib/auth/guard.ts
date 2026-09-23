import 'server-only';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { adminEnabled } from '@/lib/config/env';
import { connection } from '@/lib/db/client';
import { adminSessions, adminUsers, type AdminUserRow } from '@/lib/db/schema';
import { ACCESS_COOKIE_CANDIDATES } from './cookies';
import { tokenConfig } from './session';
import { verifyAccessToken } from './tokens';

export interface AdminPrincipal {
  readonly user: AdminUserRow;
  readonly sessionId: string;
  /** False while a required second factor has not been passed (or enrolled). */
  readonly mfaComplete: boolean;
}

export type AuthOutcome =
  | { readonly ok: true; readonly principal: AdminPrincipal }
  | {
      readonly ok: false;
      readonly reason: 'disabled' | 'missing' | 'expired' | 'invalid' | 'revoked' | 'inactive';
    };

/**
 * Authenticates an access token against the database: the token must verify, its session must be
 * live, and its user active. Called by every protected route handler and admin page — the
 * middleware's cookie check is only a redirect convenience, never an authorization decision.
 */
export async function authenticateToken(token: string | undefined): Promise<AuthOutcome> {
  if (!adminEnabled()) return { ok: false, reason: 'disabled' };
  if (!token) return { ok: false, reason: 'missing' };

  const verified = await verifyAccessToken(token, tokenConfig());
  if (!verified.ok) return { ok: false, reason: verified.reason };

  const { db } = connection();
  const [session] = await db
    .select({
      revokedAt: adminSessions.revokedAt,
      expiresAt: adminSessions.expiresAt,
      userId: adminSessions.userId,
    })
    .from(adminSessions)
    .where(eq(adminSessions.id, verified.claims.sid))
    .limit(1);
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'revoked' };
  }
  if (session.userId !== verified.claims.sub) return { ok: false, reason: 'invalid' };

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, session.userId))
    .limit(1);
  if (!user || !user.isActive) return { ok: false, reason: 'inactive' };

  return {
    ok: true,
    principal: { user, sessionId: verified.claims.sid, mfaComplete: verified.claims.mfa },
  };
}

export async function readAccessCookie(): Promise<string | undefined> {
  const jar = await cookies();
  for (const name of ACCESS_COOKIE_CANDIDATES) {
    const value = jar.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

/** For server components: the signed-in admin, or the reason there is none. */
export async function currentAdmin(): Promise<AuthOutcome> {
  return authenticateToken(await readAccessCookie());
}

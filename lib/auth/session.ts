import 'server-only';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { serverEnv } from '@/lib/config/env';
import { connection } from '@/lib/db/client';
import { adminSessions, adminUsers, type AdminUserRow } from '@/lib/db/schema';
import { logger } from '@/lib/log';
import { SESSION_ABSOLUTE_HOURS, SESSION_IDLE_MINUTES } from './cookies';
import { randomToken, sha256 } from './crypto';
import { signAccessToken, type TokenConfig } from './tokens';

export function tokenConfig(): TokenConfig {
  const env = serverEnv();
  if (!env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is not configured.');
  return { secret: env.JWT_ACCESS_SECRET, issuer: env.JWT_ISSUER, audience: env.JWT_AUDIENCE };
}

export interface IssuedSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
  readonly sessionId: string;
}

interface ClientInfo {
  readonly ip: string;
  readonly userAgent: string | null;
}

function mfaSatisfied(user: Pick<AdminUserRow, 'mfaEnabled'>, verified: boolean): boolean {
  if (verified) return true;
  // Without an enrolled factor the session is only complete when MFA is not required.
  return !user.mfaEnabled && !serverEnv().ADMIN_MFA_REQUIRED;
}

/** Starts a new session family after a successful login. */
export async function createSession(
  user: AdminUserRow,
  mfaVerified: boolean,
  client: ClientInfo,
): Promise<IssuedSession> {
  const { db } = connection();
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_HOURS * 3_600_000);
  const [row] = await db
    .insert(adminSessions)
    .values({
      userId: user.id,
      familyId: crypto.randomUUID(),
      tokenHash: sha256(refreshToken),
      mfaVerified,
      expiresAt,
      userAgent: client.userAgent,
      ipAddress: client.ip,
    })
    .returning({ id: adminSessions.id });
  if (!row) throw new Error('Session insert returned no row.');

  const accessToken = await signAccessToken(
    { sub: user.id, sid: row.id, role: user.role, mfa: mfaSatisfied(user, mfaVerified) },
    tokenConfig(),
  );
  return { accessToken, refreshToken, refreshExpiresAt: expiresAt, sessionId: row.id };
}

export type RotateResult =
  | { readonly ok: true; readonly session: IssuedSession; readonly user: AdminUserRow }
  | {
      readonly ok: false;
      readonly reason: 'unknown' | 'expired' | 'idle' | 'reused' | 'revoked' | 'inactive';
    };

/**
 * Exchanges a refresh token for a new pair. The presented token is single-use: it is marked
 * rotated in the same transaction that issues its successor. Presenting a rotated token again is
 * treated as theft — the whole family is revoked, logging out both the thief and the owner.
 */
export async function rotateSession(
  refreshToken: string,
  client: ClientInfo,
): Promise<RotateResult> {
  const { db } = connection();
  const tokenHash = sha256(refreshToken);

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.tokenHash, tokenHash))
      .for('update')
      .limit(1);
    if (!current) return { ok: false, reason: 'unknown' } as const;

    if (current.rotatedAt || current.revokedAt) {
      if (current.rotatedAt && !current.revokedAt) {
        await tx
          .update(adminSessions)
          .set({ revokedAt: new Date(), revokedReason: 'refresh-token-reuse' })
          .where(
            and(eq(adminSessions.familyId, current.familyId), isNull(adminSessions.revokedAt)),
          );
        logger.warn('auth.refresh_reuse_detected', { familyId: current.familyId, ip: client.ip });
        return { ok: false, reason: 'reused' } as const;
      }
      return { ok: false, reason: 'revoked' } as const;
    }

    const now = Date.now();
    if (current.expiresAt.getTime() <= now) return { ok: false, reason: 'expired' } as const;
    if (current.lastUsedAt.getTime() + SESSION_IDLE_MINUTES * 60_000 <= now) {
      await tx
        .update(adminSessions)
        .set({ revokedAt: new Date(), revokedReason: 'idle-timeout' })
        .where(eq(adminSessions.id, current.id));
      return { ok: false, reason: 'idle' } as const;
    }

    const [user] = await tx
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, current.userId))
      .limit(1);
    if (!user || !user.isActive) return { ok: false, reason: 'inactive' } as const;

    const nextToken = randomToken();
    const [next] = await tx
      .insert(adminSessions)
      .values({
        userId: current.userId,
        familyId: current.familyId,
        tokenHash: sha256(nextToken),
        mfaVerified: current.mfaVerified,
        expiresAt: current.expiresAt,
        userAgent: client.userAgent,
        ipAddress: client.ip,
      })
      .returning({ id: adminSessions.id });
    if (!next) throw new Error('Session rotation insert returned no row.');
    await tx
      .update(adminSessions)
      .set({ rotatedAt: new Date() })
      .where(eq(adminSessions.id, current.id));

    const accessToken = await signAccessToken(
      {
        sub: user.id,
        sid: next.id,
        role: user.role,
        mfa: mfaSatisfied(user, current.mfaVerified),
      },
      tokenConfig(),
    );
    return {
      ok: true,
      user,
      session: {
        accessToken,
        refreshToken: nextToken,
        refreshExpiresAt: current.expiresAt,
        sessionId: next.id,
      },
    } as const;
  });
}

/** Revokes the family a session belongs to (logout). */
export async function revokeSessionFamily(sessionId: string, reason: string): Promise<void> {
  const { db } = connection();
  const [row] = await db
    .select({ familyId: adminSessions.familyId })
    .from(adminSessions)
    .where(eq(adminSessions.id, sessionId))
    .limit(1);
  if (!row) return;
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(adminSessions.familyId, row.familyId), isNull(adminSessions.revokedAt)));
}

export async function revokeByRefreshToken(refreshToken: string, reason: string): Promise<void> {
  const { db } = connection();
  const [row] = await db
    .select({ id: adminSessions.id })
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, sha256(refreshToken)))
    .limit(1);
  if (row) await revokeSessionFamily(row.id, reason);
}

/** Ends every session of a user — after a password change or MFA change. */
export async function revokeAllForUser(userId: string, reason: string, exceptSessionId?: string) {
  const { db } = connection();
  let keepFamily: string | null = null;
  if (exceptSessionId) {
    const [row] = await db
      .select({ familyId: adminSessions.familyId })
      .from(adminSessions)
      .where(eq(adminSessions.id, exceptSessionId))
      .limit(1);
    keepFamily = row?.familyId ?? null;
  }
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(
      and(
        eq(adminSessions.userId, userId),
        isNull(adminSessions.revokedAt),
        keepFamily ? ne(adminSessions.familyId, keepFamily) : undefined,
      ),
    );
}

/** Marks the current session's second factor as passed (after enrolling MFA mid-session). */
export async function markSessionMfaVerified(sessionId: string) {
  const { db } = connection();
  const [row] = await db
    .select({ familyId: adminSessions.familyId })
    .from(adminSessions)
    .where(eq(adminSessions.id, sessionId))
    .limit(1);
  if (!row) return;
  await db
    .update(adminSessions)
    .set({ mfaVerified: true })
    .where(eq(adminSessions.familyId, row.familyId));
}

import 'server-only';
import { serverEnv } from '@/lib/config/env';
import { logger } from '@/lib/log';
import { findAdminById } from '@/lib/store/admins';
import { sessionsStore } from '@/lib/store/collections';
import { createId, now } from '@/lib/store/json-store';
import type { AdminSessionRecord, AdminUserRecord } from '@/lib/store/types';
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

function mfaSatisfied(user: Pick<AdminUserRecord, 'mfaEnabled'>, verified: boolean): boolean {
  if (verified) return true;
  // Without an enrolled factor the session is only complete when MFA is not required.
  return !user.mfaEnabled && !serverEnv().ADMIN_MFA_REQUIRED;
}

/** Starts a new session family after a successful login. */
export async function createSession(
  user: AdminUserRecord,
  mfaVerified: boolean,
  client: ClientInfo,
): Promise<IssuedSession> {
  const refreshToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_HOURS * 3_600_000);
  const timestamp = now();
  const record: AdminSessionRecord = {
    id: createId(),
    userId: user.id,
    familyId: createId(),
    tokenHash: sha256(refreshToken),
    mfaVerified,
    createdAt: timestamp,
    lastUsedAt: timestamp,
    expiresAt: expiresAt.toISOString(),
    rotatedAt: null,
    revokedAt: null,
    revokedReason: null,
    userAgent: client.userAgent,
    ipAddress: client.ip,
  };
  await sessionsStore.mutate((items) => ({ items: [...items, record], result: undefined }));

  const accessToken = await signAccessToken(
    { sub: user.id, sid: record.id, role: user.role, mfa: mfaSatisfied(user, mfaVerified) },
    tokenConfig(),
  );
  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
    sessionId: record.id,
  };
}

export type RotateResult =
  | { readonly ok: true; readonly session: IssuedSession; readonly user: AdminUserRecord }
  | {
      readonly ok: false;
      readonly reason: 'unknown' | 'expired' | 'idle' | 'reused' | 'revoked' | 'inactive';
    };

/**
 * What the rotation write decided. Token signing and the user lookup happen after it, outside the
 * lock, so this carries forward only what the write itself established.
 */
type RotationOutcome =
  | { readonly ok: false; readonly reason: 'unknown' | 'revoked' | 'expired' | 'idle' }
  | { readonly ok: false; readonly reason: 'reused'; readonly familyId: string }
  | {
      readonly ok: true;
      readonly sessionId: string;
      readonly userId: string;
      readonly mfaVerified: boolean;
      readonly expiresAt: string;
    };

/**
 * Exchanges a refresh token for a new pair. The presented token is single-use: it is marked
 * rotated in the same write that issues its successor. Presenting a rotated token again is
 * treated as theft — the whole family is revoked, logging out both the thief and the owner.
 *
 * The whole read-check-write runs inside one `mutate`, which is serialised per file, so two
 * browser tabs refreshing at the same instant cannot both be handed a live successor.
 */
export async function rotateSession(
  refreshToken: string,
  client: ClientInfo,
): Promise<RotateResult> {
  const tokenHash = sha256(refreshToken);
  const nextToken = randomToken();
  const nextHash = sha256(nextToken);

  const outcome = await sessionsStore.mutate<RotationOutcome>((items) => {
    const current = items.find((session) => session.tokenHash === tokenHash);
    if (!current) {
      return { items: [...items], result: { ok: false, reason: 'unknown' } };
    }

    if (current.rotatedAt || current.revokedAt) {
      if (current.rotatedAt && !current.revokedAt) {
        const revokedAt = now();
        return {
          items: items.map((session) =>
            session.familyId === current.familyId && !session.revokedAt
              ? { ...session, revokedAt, revokedReason: 'refresh-token-reuse' }
              : session,
          ),
          result: { ok: false, reason: 'reused', familyId: current.familyId },
        };
      }
      return { items: [...items], result: { ok: false, reason: 'revoked' } };
    }

    const nowMs = Date.now();
    if (Date.parse(current.expiresAt) <= nowMs) {
      return { items: [...items], result: { ok: false, reason: 'expired' } };
    }
    if (Date.parse(current.lastUsedAt) + SESSION_IDLE_MINUTES * 60_000 <= nowMs) {
      const revokedAt = now();
      return {
        items: items.map((session) =>
          session.id === current.id
            ? { ...session, revokedAt, revokedReason: 'idle-timeout' }
            : session,
        ),
        result: { ok: false, reason: 'idle' },
      };
    }

    const timestamp = now();
    const next: AdminSessionRecord = {
      id: createId(),
      userId: current.userId,
      familyId: current.familyId,
      tokenHash: nextHash,
      mfaVerified: current.mfaVerified,
      createdAt: timestamp,
      lastUsedAt: timestamp,
      expiresAt: current.expiresAt,
      rotatedAt: null,
      revokedAt: null,
      revokedReason: null,
      userAgent: client.userAgent,
      ipAddress: client.ip,
    };
    return {
      items: [
        ...items.map((session) =>
          session.id === current.id ? { ...session, rotatedAt: timestamp } : session,
        ),
        next,
      ],
      result: {
        ok: true,
        sessionId: next.id,
        userId: next.userId,
        mfaVerified: next.mfaVerified,
        expiresAt: next.expiresAt,
      },
    };
  });

  if (!outcome.ok) {
    if (outcome.reason === 'reused') {
      logger.warn('auth.refresh_reuse_detected', {
        familyId: outcome.familyId,
        ip: client.ip,
      });
    }
    return { ok: false, reason: outcome.reason };
  }

  const user = await findAdminById(outcome.userId);
  if (!user || !user.isActive) {
    // The successor exists but its owner may not sign in: revoke the family rather than leave a
    // usable token behind for an account that was just deactivated.
    await revokeSessionFamily(outcome.sessionId, 'user-inactive');
    return { ok: false, reason: 'inactive' };
  }

  const accessToken = await signAccessToken(
    {
      sub: user.id,
      sid: outcome.sessionId,
      role: user.role,
      mfa: mfaSatisfied(user, outcome.mfaVerified),
    },
    tokenConfig(),
  );
  return {
    ok: true,
    user,
    session: {
      accessToken,
      refreshToken: nextToken,
      refreshExpiresAt: new Date(outcome.expiresAt),
      sessionId: outcome.sessionId,
    },
  };
}

/** Revokes the family a session belongs to (logout). */
export async function revokeSessionFamily(sessionId: string, reason: string): Promise<void> {
  const revokedAt = now();
  await sessionsStore.mutate((items) => {
    const current = items.find((session) => session.id === sessionId);
    if (!current) return { items: [...items], result: undefined };
    return {
      items: items.map((session) =>
        session.familyId === current.familyId && !session.revokedAt
          ? { ...session, revokedAt, revokedReason: reason }
          : session,
      ),
      result: undefined,
    };
  });
}

export async function revokeByRefreshToken(refreshToken: string, reason: string): Promise<void> {
  const tokenHash = sha256(refreshToken);
  const session = (await sessionsStore.read()).find((item) => item.tokenHash === tokenHash);
  if (session) await revokeSessionFamily(session.id, reason);
}

/** Ends every session of a user — after a password change or an MFA change. */
export async function revokeAllForUser(
  userId: string,
  reason: string,
  exceptSessionId?: string,
): Promise<void> {
  const revokedAt = now();
  await sessionsStore.mutate((items) => {
    const keepFamily = exceptSessionId
      ? (items.find((session) => session.id === exceptSessionId)?.familyId ?? null)
      : null;
    return {
      items: items.map((session) =>
        session.userId === userId &&
        !session.revokedAt &&
        (keepFamily === null || session.familyId !== keepFamily)
          ? { ...session, revokedAt, revokedReason: reason }
          : session,
      ),
      result: undefined,
    };
  });
}

/** Marks the current session's second factor as passed (after enrolling MFA mid-session). */
export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  await sessionsStore.mutate((items) => {
    const current = items.find((session) => session.id === sessionId);
    if (!current) return { items: [...items], result: undefined };
    return {
      items: items.map((session) =>
        session.familyId === current.familyId ? { ...session, mfaVerified: true } : session,
      ),
      result: undefined,
    };
  });
}

/** One live session by id, for the request guard. */
export async function findSession(id: string): Promise<AdminSessionRecord | undefined> {
  return (await sessionsStore.read()).find((session) => session.id === id);
}

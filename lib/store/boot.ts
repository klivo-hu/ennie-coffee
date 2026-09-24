import 'server-only';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hashPassword, passwordProblem } from '@/lib/auth/password';
import { serverEnv } from '@/lib/config/env';
import { logger } from '@/lib/log';
import { adminUsersStore } from './collections';
import { createId, dataDir, now, sweepTempFiles } from './json-store';
import { scheduleMaintenance } from './maintenance';
import { seedIfEmpty } from './seed';
import type { AdminUserRecord } from './types';

/**
 * Brings the data directory into a usable state before the first request: the directory exists
 * and is writable, the published menu is present, and the first administrator has been created
 * from the environment when there is none.
 *
 * Boot never throws. A data directory that cannot be written (a volume mounted read-only, a
 * permission mismatch after a restore) leaves the public site serving the published menu from
 * the seed data instead of returning an error page, and says so once in the log.
 */

export type BootState = 'pending' | 'ready' | 'failed';

const globalForBoot = globalThis as unknown as { __ennieBoot?: { state: BootState } };
const status = (globalForBoot.__ennieBoot ??= { state: 'pending' });

export function bootState(): BootState {
  return status.state;
}

/**
 * Creates the first administrator from ADMIN_BOOTSTRAP_USERNAME / ADMIN_BOOTSTRAP_PASSWORD.
 * Skipped as soon as one account exists, so the variables can be removed from `.env` afterwards
 * and a later password change is never undone by a redeploy.
 */
async function bootstrapAdmin(): Promise<void> {
  const env = serverEnv();
  if (!env.ADMIN_BOOTSTRAP_USERNAME || !env.ADMIN_BOOTSTRAP_PASSWORD) return;
  if ((await adminUsersStore.read()).length > 0) {
    logger.info('admin.bootstrap_skipped', {
      reason: 'an administrator already exists — ADMIN_BOOTSTRAP_PASSWORD can be removed',
    });
    return;
  }
  const problem = passwordProblem(env.ADMIN_BOOTSTRAP_PASSWORD, {
    username: env.ADMIN_BOOTSTRAP_USERNAME,
  });
  if (problem) {
    logger.error('admin.bootstrap_rejected', { reason: problem });
    return;
  }

  const timestamp = now();
  const user: AdminUserRecord = {
    id: createId(),
    username: env.ADMIN_BOOTSTRAP_USERNAME,
    passwordHash: await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD),
    role: 'owner',
    isActive: true,
    mfaSecretEncrypted: null,
    mfaEnabled: false,
    mfaLastStep: null,
    mfaRecoveryCodes: [],
    failedLoginCount: 0,
    failedSinceLastLogin: 0,
    previousFailedAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    passwordChangedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  // Re-checked inside the lock, so a second start that races this one cannot add a second owner.
  const created = await adminUsersStore.mutate<boolean>((items) =>
    items.length > 0 ? { items: [...items], result: false } : { items: [user], result: true },
  );
  if (created) logger.info('admin.bootstrap_created', { username: user.username });
}

/**
 * Proves the data directory can actually be written, rather than only that it exists.
 *
 * The two are different in exactly the cases that matter — a volume mounted read-only, a
 * `DATA_DIR` owned by another user after a restore, a full disk — and without this check the
 * first symptom would be an admin save failing hours later. Here it becomes a `failed` boot
 * state that /api/health/ready reports.
 */
async function assertWritable(): Promise<void> {
  const probe = path.join(dataDir(), `.write-probe-${createId()}`);
  try {
    await writeFile(probe, 'ok', { mode: 0o600 });
  } finally {
    await rm(probe, { force: true }).catch(() => undefined);
  }
}

export async function bootStore(): Promise<void> {
  status.state = 'pending';
  try {
    await mkdir(dataDir(), { recursive: true });
    await assertWritable();
    await sweepTempFiles();
    await seedIfEmpty();
    await bootstrapAdmin();
    scheduleMaintenance();
    status.state = 'ready';
    logger.info('store.ready', { dataDir: dataDir() });
  } catch (error) {
    status.state = 'failed';
    logger.error('store.boot_failed', { dataDir: dataDir(), error: String(error) });
  }
}

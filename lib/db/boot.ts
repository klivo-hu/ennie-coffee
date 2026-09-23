import 'server-only';
import path from 'node:path';
import { sql as rawSql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { passwordProblem, hashPassword } from '@/lib/auth/password';
import { serverEnv } from '@/lib/config/env';
import { startContentListener } from '@/lib/content/cache';
import { logger } from '@/lib/log';
import { connection } from './client';
import { scheduleMaintenance } from './maintenance';
import { adminUsers } from './schema';
import { seedIfEmpty } from './seed';

/** Arbitrary constant shared by every instance: whoever holds it migrates, the rest wait. */
const MIGRATION_LOCK_ID = 7_314_202_015;
const RETRY_MS = 5_000;

export type BootState = 'disabled' | 'pending' | 'ready' | 'failed';

const globalForBoot = globalThis as unknown as { __ennieBoot?: { state: BootState } };
const status = (globalForBoot.__ennieBoot ??= { state: 'pending' });

export function bootState(): BootState {
  return status.state;
}

async function bootstrapAdmin(): Promise<void> {
  const env = serverEnv();
  if (!env.ADMIN_BOOTSTRAP_USERNAME || !env.ADMIN_BOOTSTRAP_PASSWORD) return;
  const { db } = connection();
  const [{ count } = { count: 0 }] = await db
    .select({ count: rawSql<number>`count(*)::int` })
    .from(adminUsers);
  if (count > 0) {
    logger.info('admin.bootstrap_skipped', {
      reason: 'an administrator already exists — ADMIN_BOOTSTRAP_PASSWORD can be removed from .env',
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
  await db.insert(adminUsers).values({
    username: env.ADMIN_BOOTSTRAP_USERNAME,
    passwordHash: await hashPassword(env.ADMIN_BOOTSTRAP_PASSWORD),
    role: 'owner',
  });
  logger.info('admin.bootstrap_created', { username: env.ADMIN_BOOTSTRAP_USERNAME });
}

async function runOnce(): Promise<void> {
  const { sql, db } = connection();
  const reserved = await sql.reserve();
  try {
    await reserved`select pg_advisory_lock(${MIGRATION_LOCK_ID})`;
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    await seedIfEmpty(db);
    await bootstrapAdmin();
  } finally {
    await reserved`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`.catch(() => undefined);
    reserved.release();
  }
}

/**
 * Brings the database to the current schema, seeds an empty one, and creates the first
 * administrator. Never throws: while the database is unreachable the public site serves the seed
 * content and boot retries in the background.
 */
export async function bootDatabase(): Promise<void> {
  if (!serverEnv().DATABASE_URL) {
    status.state = 'disabled';
    logger.warn('db.not_configured', { mode: 'serving seed content; admin disabled' });
    return;
  }
  status.state = 'pending';
  for (let attempt = 1; ; attempt += 1) {
    try {
      await runOnce();
      status.state = 'ready';
      logger.info('db.ready', { attempt });
      await startContentListener();
      scheduleMaintenance();
      return;
    } catch (error) {
      status.state = 'failed';
      logger.error('db.boot_failed', { attempt, error: String(error) });
      await new Promise((resolve) => setTimeout(resolve, Math.min(RETRY_MS * attempt, 60_000)));
    }
  }
}

import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import { serverEnv } from '@/lib/config/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

interface Connection {
  readonly sql: Sql;
  readonly db: Database;
}

/**
 * One pool per process. Stored on globalThis so development hot reloads reuse it instead of
 * opening a new pool per edit. All queries go through Drizzle's parameterized builder or the
 * `sql` tagged template, which binds values — nothing is ever concatenated into SQL text.
 */
const globalForDb = globalThis as unknown as { __ennieDb?: Connection };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set.');
    this.name = 'DatabaseNotConfiguredError';
  }
}

export function connection(): Connection {
  if (globalForDb.__ennieDb) return globalForDb.__ennieDb;
  const env = serverEnv();
  if (!env.DATABASE_URL) throw new DatabaseNotConfiguredError();

  const sql = postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 30,
    connect_timeout: 5,
    prepare: true,
    onnotice: () => {},
  });
  const created: Connection = { sql, db: drizzle(sql, { schema }) };
  globalForDb.__ennieDb = created;
  return created;
}

export function db(): Database {
  return connection().db;
}

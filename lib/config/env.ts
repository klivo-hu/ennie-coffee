import 'server-only';
import { z } from 'zod';

/**
 * Server environment, parsed once at the boundary and typed thereafter.
 *
 * Only variables that change behavior are validated here; business and legal facts live in
 * their own modules (`business.ts`, `legal.ts`) because a missing fact there degrades one line of
 * copy, not the application. Nothing in this module is ever serialized to the client.
 */

const booleanFlag = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((value) => (value === undefined ? fallback : value === 'true' || value === '1'));

const isProduction = process.env.NODE_ENV === 'production';

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL must be a postgres:// connection string.')
    .optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters.')
    .optional(),
  JWT_ISSUER: z.string().trim().min(1).default('ennie-coffee'),
  JWT_AUDIENCE: z.string().trim().min(1).default('ennie-coffee-admin'),

  ADMIN_BOOTSTRAP_USERNAME: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9._-]{2,63}$/,
      'ADMIN_BOOTSTRAP_USERNAME: 3–64 characters, letters, digits, dot, underscore, hyphen.',
    )
    .optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).max(256).optional(),
  ADMIN_MFA_REQUIRED: booleanFlag(isProduction),

  /** How many reverse proxies sit in front of the app (Traefik + HAProxy = 2). */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  /** Secure cookies are the default; only plain-HTTP local development may turn them off. */
  AUTH_COOKIE_SECURE: booleanFlag(isProduction),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  // A blank value means "not set", so a later env file can switch a setting off with `KEY=`
  // (.env.local does this for the database during `npm run dev`).
  const present = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
  const parsed = EnvSchema.safeParse(present);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid server environment — ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

/** True when a database is configured. A review preview runs without one and serves seed content. */
export function hasDatabase(): boolean {
  return Boolean(serverEnv().DATABASE_URL);
}

/** True when the admin area can run: it needs both the database and a signing secret. */
export function adminEnabled(): boolean {
  const env = serverEnv();
  return Boolean(env.DATABASE_URL && env.JWT_ACCESS_SECRET);
}

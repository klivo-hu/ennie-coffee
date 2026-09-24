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
  /**
   * Writable directory holding the menu, the admin accounts and the uploaded imagery. Production
   * mounts a Docker volume here; without one, every edit is lost on the next deployment.
   */
  DATA_DIR: z.string().trim().min(1).optional(),

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

  /** How many reverse proxies sit in front of the app (the platform's Traefik = 1). */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  /** Secure cookies are the default; only plain-HTTP local development may turn them off. */
  AUTH_COOKIE_SECURE: booleanFlag(isProduction),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  // A blank value means "not set", so a later env file can switch a setting off with `KEY=`.
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

/**
 * True when the admin area can run. The store itself needs no configuration, so the one
 * requirement is a signing secret for the session tokens: without it no session could be issued
 * or verified, and every admin request would fail late instead of being refused up front.
 */
export function adminEnabled(): boolean {
  return Boolean(serverEnv().JWT_ACCESS_SECRET);
}

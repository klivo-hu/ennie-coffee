import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateToken, type AdminPrincipal } from '@/lib/auth/guard';
import { ACCESS_COOKIE_CANDIDATES } from '@/lib/auth/cookies';
import { can, type Permission } from '@/lib/auth/permissions';
import { adminEnabled } from '@/lib/config/env';
import { logger } from '@/lib/log';
import { checkRateLimit, type RateDecision, type TierName } from '@/lib/security/rate-limit';
import { isSameOriginRequest, requestContext, type RequestContext } from '@/lib/security/request';

/**
 * One wrapper for every API route, so the security steps cannot be forgotten on a new endpoint:
 * same-origin check for writes → admin availability → per-source rate limit → authentication →
 * authorization → per-identity rate limit → handler → uniform JSON errors with no internals leaked.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const MAX_JSON_BYTES = 64 * 1024;

export interface RouteContext<P> {
  readonly request: NextRequest;
  readonly params: P;
  readonly client: RequestContext;
  readonly principal: AdminPrincipal | null;
}

interface RouteOptions {
  /** Tier + a stable scope name for the counter key. Every endpoint declares one (RL-23). */
  readonly rateLimit: { readonly tier: TierName; readonly scope: string };
  /** Omit for the unauthenticated auth endpoints, which authenticate inside the handler. */
  readonly permission?: Permission;
  /** Allows a session that still owes its second factor (MFA enrollment endpoints only). */
  readonly allowIncompleteMfa?: boolean;
}

function json(status: number, body: unknown, headers?: HeadersInit): NextResponse {
  const response = NextResponse.json(body, { status, headers });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export function errorResponse(error: ApiError, headers?: HeadersInit): NextResponse {
  return json(
    error.status,
    { error: { code: error.code, message: error.message, fields: error.fields } },
    headers,
  );
}

export function ok(data: unknown, status = 200): NextResponse {
  return json(status, { data });
}

export function rateLimitedResponse(
  decision: Extract<RateDecision, { allowed: false }>,
): NextResponse {
  return errorResponse(
    new ApiError(
      429,
      'rate_limited',
      'Túl sok kérés érkezett. Várj egy kicsit, majd próbáld újra.',
    ),
    { 'Retry-After': String(decision.retryAfterSeconds) },
  );
}

function readAccessToken(request: NextRequest): string | undefined {
  for (const name of ACCESS_COOKIE_CANDIDATES) {
    const value = request.cookies.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

export function route<P = Record<string, never>>(
  options: RouteOptions,
  handler: (context: RouteContext<P>) => Promise<NextResponse>,
) {
  return async (request: NextRequest, segment: { params: Promise<P> }): Promise<NextResponse> => {
    const client = requestContext(request);
    const { tier, scope } = options.rateLimit;
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD' && !isSameOriginRequest(request)) {
        throw new ApiError(403, 'cross_origin', 'A kérés nem ebből az oldalból érkezett.');
      }
      if (!adminEnabled()) {
        throw new ApiError(
          503,
          'admin_disabled',
          'Az adminisztráció nincs beállítva ezen a szerveren.',
        );
      }

      const bySource = checkRateLimit(tier, scope, { source: client.ip });
      if (!bySource.allowed) return rateLimitedResponse(bySource);

      let principal: AdminPrincipal | null = null;
      if (options.permission) {
        const outcome = await authenticateToken(readAccessToken(request));
        if (!outcome.ok) {
          const code = outcome.reason === 'expired' ? 'token_expired' : 'unauthenticated';
          throw new ApiError(401, code, 'Jelentkezz be újra.');
        }
        principal = outcome.principal;
        if (!principal.mfaComplete && !options.allowIncompleteMfa) {
          throw new ApiError(403, 'mfa_required', 'Előbb állítsd be a kétlépcsős azonosítást.');
        }
        if (!can(principal.user.role, options.permission)) {
          throw new ApiError(403, 'forbidden', 'Ehhez a művelethez nincs jogosultságod.');
        }
        const byIdentity = checkRateLimit(tier, scope, { identity: principal.user.id });
        if (!byIdentity.allowed) return rateLimitedResponse(byIdentity);
      }

      return await handler({ request, params: await segment.params, client, principal });
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      if (error instanceof z.ZodError) return errorResponse(validationError(error));
      logger.error('api.unhandled', {
        path: request.nextUrl.pathname,
        method: request.method,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
      return errorResponse(new ApiError(500, 'internal', 'Váratlan hiba történt. Próbáld újra.'));
    }
  };
}

export function validationError(error: z.ZodError): ApiError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  return new ApiError(422, 'validation', 'Ellenőrizd a megjelölt mezőket.', fields);
}

/** Reads and validates a JSON body with a hard size limit. */
export async function readJson<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new ApiError(415, 'unsupported_media_type', 'JSON kérést várunk.');
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_JSON_BYTES) throw new ApiError(413, 'too_large', 'A kérés túl nagy.');
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new ApiError(413, 'too_large', 'A kérés túl nagy.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ApiError(400, 'bad_json', 'Érvénytelen kérés.');
  }
  return schema.parse(raw);
}

/** Route params that must be UUIDs are validated before anything reads the store. */
export function uuidParam(value: string): string {
  const parsed = z.uuid().safeParse(value);
  if (!parsed.success) throw new ApiError(404, 'not_found', 'Nem található.');
  return parsed.data;
}

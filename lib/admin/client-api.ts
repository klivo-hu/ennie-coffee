'use client';

/**
 * The admin's one way to call its API. Same-origin fetch with the auth cookies; on an expired
 * access token it rotates the session once (POST /api/auth/refresh) and retries; if the session
 * has ended it sends the browser to the sign-in page with a way back.
 */

export interface ApiFailure {
  readonly code: string;
  readonly message: string;
  readonly fields?: Record<string, string>;
}

export type ApiResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ApiFailure };

const NETWORK_FAILURE: ApiFailure = {
  code: 'network',
  message: 'Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatot, és próbáld újra.',
};

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function toSignIn() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/admin/belepes?next=${encodeURIComponent(next)}&ok=lejart`);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, { credentials: 'same-origin', ...init });
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<ApiResult<T>> {
  const init: RequestInit = {
    method: options.method ?? (options.body || options.form ? 'POST' : 'GET'),
  };
  if (options.form) {
    init.body = options.form;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    init.headers = { 'Content-Type': 'application/json' };
  }

  let response: Response;
  try {
    response = await send(path, init);
    if (response.status === 401) {
      const payload = (await response
        .clone()
        .json()
        .catch(() => null)) as { error?: ApiFailure } | null;
      if (payload?.error?.code === 'token_expired' && (await refreshSession())) {
        response = await send(path, init);
      }
    }
  } catch {
    return { ok: false, error: NETWORK_FAILURE };
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: ApiFailure;
  } | null;
  if (response.ok && payload && 'data' in payload) return { ok: true, data: payload.data as T };
  if (response.status === 401) {
    toSignIn();
  }
  return {
    ok: false,
    error: payload?.error ?? {
      code: `http_${response.status}`,
      message: 'Váratlan hiba történt. Próbáld újra.',
    },
  };
}

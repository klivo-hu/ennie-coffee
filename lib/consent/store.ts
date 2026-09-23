import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_STORAGE_KEY,
  CONSENT_STORAGE_MEDIUM,
  CONSENT_VERSION,
} from './config';

/**
 * The consent decision record.
 *
 * Consent is only meaningful with its scope and its moment attached, so both are stored. A record
 * written against a different `version` answered a different set of purposes and is discarded
 * rather than honored.
 */
export interface ConsentState {
  readonly version: number;
  readonly decidedAt: string;
  readonly granted: Readonly<Record<string, boolean>>;
}

const MS_PER_DAY = 86_400_000;

function readRaw(): string | null {
  if (typeof document === 'undefined') return null;
  if (CONSENT_STORAGE_MEDIUM === 'local') {
    try {
      return window.localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). No decision is the safe read.
      return null;
    }
  }
  const prefix = `${CONSENT_STORAGE_KEY}=`;
  const entry = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function writeRaw(value: string): void {
  if (typeof document === 'undefined') return;
  if (CONSENT_STORAGE_MEDIUM === 'local') {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // A decision that cannot be stored is re-asked next visit, which is correct behavior.
    }
    return;
  }
  const maxAge = CONSENT_MAX_AGE_DAYS * 86_400;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_STORAGE_KEY}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** The current decision, or null when none stands: absent, expired, or given for other purposes. */
export function readConsent(): ConsentState | null {
  const raw = readRaw();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    const age = Date.now() - new Date(parsed.decidedAt).getTime();
    if (!Number.isFinite(age) || age > CONSENT_MAX_AGE_DAYS * MS_PER_DAY) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Records a decision with the moment and the purposes it answered. */
export function writeConsent(granted: Record<string, boolean>): ConsentState {
  const state: ConsentState = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    granted,
  };
  writeRaw(JSON.stringify(state));
  return state;
}

/** Clears the decision, so the visitor is asked again from a clean state. */
export function clearConsent(): void {
  if (typeof document === 'undefined') return;
  if (CONSENT_STORAGE_MEDIUM === 'local') {
    try {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // Nothing to clear if storage is unavailable.
    }
    return;
  }
  document.cookie = `${CONSENT_STORAGE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

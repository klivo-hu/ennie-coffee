import 'server-only';
import { Secret, TOTP } from 'otpauth';
import QRCode from 'qrcode';
import { randomToken, sha256 } from './crypto';

/**
 * Time-based one-time passwords (RFC 6238: SHA-1, 6 digits, 30 s — the parameters every
 * authenticator app supports). One step of clock drift is tolerated either side, and the last
 * accepted step is stored so a code cannot be used twice.
 */

const ISSUER = 'Ennie Coffee admin';
const PERIOD = 30;
const RECOVERY_CODE_COUNT = 8;

function totpFor(secretBase32: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

export async function enrollmentQr(secretBase32: string, username: string) {
  const uri = totpFor(secretBase32, username).toString();
  const svg = await QRCode.toString(uri, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#263423', light: '#ffffff' },
  });
  return { uri, svg };
}

/**
 * Returns the accepted time-step, or null. A step at or before `lastStep` is refused (replay).
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastStep: number | null,
): number | null {
  const normalized = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return null;
  const totp = totpFor(secretBase32, 'verify');
  const delta = totp.validate({ token: normalized, window: 1 });
  if (delta === null) return null;
  const step = Math.floor(Date.now() / 1000 / PERIOD) + delta;
  if (lastStep !== null && step <= lastStep) return null;
  return step;
}

/** Human-typable single-use codes; only their hashes are stored. */
export function generateRecoveryCodes(): { plain: string[]; hashed: string[] } {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomToken(8)
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .slice(0, 10)
      .padEnd(10, 'x');
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashed: plain.map((code) => sha256(normalizeRecoveryCode(code))) };
}

export function normalizeRecoveryCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/** Argon2id — the `Algorithm` const enum cannot be imported under isolatedModules. */
const ARGON2ID = 2;

/**
 * Password hashing with Argon2id — memory-hard, per-hash random salt, parameters embedded in the
 * encoded hash so they can be raised later without invalidating existing passwords. The values
 * follow the OWASP Argon2id baseline (46 MiB, t=1, p=1).
 */
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 47_104,
  timeCost: 1,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256;

export function hashPassword(password: string): Promise<string> {
  return hash(password.normalize('NFKC'), OPTIONS);
}

export async function verifyPassword(encoded: string, password: string): Promise<boolean> {
  try {
    return await verify(encoded, password.normalize('NFKC'));
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns the same work as a real verification when the account does not exist, so response time
 * does not reveal which usernames are registered.
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalizer-not-a-real-password');
  await verifyPassword(await dummyHash, password);
}

/** The most common passwords and the obvious contextual ones for this site. */
const DENYLIST = new Set([
  'password1234',
  'password12345',
  '123456789012',
  'qwertyuiop12',
  'jelszo123456',
  'jelszojelszo',
  'administrator',
  'admin1234567',
  'letmein12345',
  'iloveyou1234',
  '111111111111',
  '000000000000',
  'aaaaaaaaaaaa',
  'qwerty123456',
  'passw0rd1234',
]);

/**
 * Length-first policy (no composition rules). Returns a Hungarian message describing what to
 * change, or null when the password is acceptable.
 */
export function passwordProblem(
  password: string,
  context: { username?: string } = {},
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A jelszó legalább ${PASSWORD_MIN_LENGTH} karakter legyen.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `A jelszó legfeljebb ${PASSWORD_MAX_LENGTH} karakter lehet.`;
  }
  const lowered = password.toLowerCase();
  if (DENYLIST.has(lowered) || /^(.)\1+$/.test(password)) {
    return 'Ez a jelszó túl gyakori. Válassz egy hosszabb, egyedi mondatot vagy kifejezést.';
  }
  // A contextual word with only digits or symbols added ("Enniecoffee2026!", "marta.kovacs1") is
  // as guessable as the word itself, so both sides are compared as bare letters.
  const contextual = ['ennie', 'coffee', 'enniecoffee', 'hatvan'];
  if (context.username) contextual.push(context.username);
  const core = lettersOnly(password);
  if (contextual.map(lettersOnly).some((word) => word.length >= 4 && core === word)) {
    return 'A jelszó ne a kávézó nevére vagy a felhasználónevedre épüljön.';
  }
  return null;
}

function lettersOnly(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

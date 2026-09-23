/**
 * Structured, single-line JSON logs on stdout/stderr — the container runtime collects them and
 * the platform caps their size. Secrets never reach here: callers pass identifiers, not tokens,
 * passwords, or request bodies.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVEL_ORDER[(process.env.LOG_LEVEL as Level | undefined) ?? 'info'] ?? 20;

function emit(level: Level, event: string, fields: Fields = {}) {
  if (LEVEL_ORDER[level] < threshold) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: Fields) => emit('debug', event, fields),
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
};

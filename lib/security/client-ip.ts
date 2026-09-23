/**
 * Derives the client address behind a known number of trusted proxies.
 *
 * Each proxy appends the address it received the request from to `X-Forwarded-For`, so the entry
 * written by the outermost trusted proxy sits `hops` positions from the right. Anything further
 * left was supplied by the client and is never trusted — a visitor who sends a forged header only
 * moves their fake value out of the window we read. With `hops = 0` (no proxy in front, as in
 * local development) the header is ignored entirely.
 */
export function clientIpFromForwarded(forwardedFor: string | null, hops: number): string | null {
  if (hops <= 0 || !forwardedFor) return null;
  const chain = forwardedFor
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const candidate = chain[chain.length - hops];
  if (!candidate) return null;
  return isPlausibleIp(candidate) ? normalizeIp(candidate) : null;
}

function isPlausibleIp(value: string): boolean {
  return /^[0-9a-fA-F:.]{2,45}$/.test(value);
}

/** IPv4-mapped IPv6 ("::ffff:10.0.0.1") and IPv4 are the same client. */
function normalizeIp(value: string): string {
  return value.startsWith('::ffff:') ? value.slice(7) : value.toLowerCase();
}

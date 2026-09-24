/**
 * Server start hook. Prepares the data directory, seeds the published menu into an empty one, and
 * creates the first administrator.
 *
 * Boot is awaited, but only up to a bound. On an ordinary start it finishes in milliseconds and
 * the first request already sees a complete store. On the very first start of a fresh volume it
 * also encodes the six menu photographs into their responsive variants, which takes longer than
 * anyone should wait for a page: past the bound the server begins serving while seeding finishes
 * behind it, and the price list renders from the published seed menu until it is done.
 *
 * Boot never throws. A data directory that cannot be written leaves the public site serving that
 * same seed menu, and says so in the log and in /api/health/ready.
 */
const BOOT_WAIT_MS = 20_000;

export async function register() {
  // Next also runs this hook while building. There is nothing to prepare then — the build has no
  // volume and throws its filesystem away — and seeding would spend half a minute encoding
  // images into a directory that is immediately discarded.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // The import must sit inside this exact check: webpack compiles the hook for the edge runtime
  // too and only drops Node-only modules (sharp, argon2) from a branch it can prove dead. An
  // early `return` for other runtimes is not enough.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootStore } = await import('./lib/store/boot');
    const boot = bootStore();
    await Promise.race([boot, new Promise((resolve) => setTimeout(resolve, BOOT_WAIT_MS))]);
  }
}

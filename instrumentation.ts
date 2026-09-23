/**
 * Server start hook. Brings the database up to date before the first request where possible; if
 * the database is slow or down, the server starts anyway (serving the published menu) and boot
 * keeps retrying in the background.
 */
const BOOT_WAIT_MS = 20_000;

export async function register() {
  // The import must sit inside this exact check: webpack compiles the hook for the edge runtime
  // too and only drops Node-only modules (sharp, argon2, the migrator) from a branch it can prove
  // dead. An early `return` for other runtimes is not enough.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootDatabase } = await import('./lib/db/boot');
    const boot = bootDatabase();
    await Promise.race([boot, new Promise((resolve) => setTimeout(resolve, BOOT_WAIT_MS))]);
  }
}

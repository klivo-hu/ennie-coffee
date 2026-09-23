import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated from lib/db/schema.ts with `npm run db:generate`, committed under
 * drizzle/, and applied by the application at startup (lib/db/boot.ts) under an advisory lock,
 * so any number of instances can boot at once and exactly one of them migrates.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
});

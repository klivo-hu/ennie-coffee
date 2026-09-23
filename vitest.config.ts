import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias in tsconfig.json so tests import exactly as the app does.
      '@': fileURLToPath(new URL('.', import.meta.url)),
      // Server modules are unit-tested directly; the guard only matters inside Next's bundler.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    // Component tests opt into a DOM with a `// @vitest-environment jsdom` pragma.
  },
});

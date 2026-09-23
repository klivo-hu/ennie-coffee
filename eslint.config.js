import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat ESLint config. `next lint` is deprecated in Next 15 and removed in 16, so the project
 * calls ESLint directly and owns its rule set.
 */
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript resolves every identifier itself; ESLint's version only produces
      // false positives on DOM and Node globals.
      'no-undef': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/link',
              message:
                "Use Link from '@/components/ui/link' — it turns off prefetching, which only wastes requests on this site's per-request pages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ['components/ui/link.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
);

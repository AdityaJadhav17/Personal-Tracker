import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      // Throwaway spike, deleted once it has answered its three questions.
      // Not shipped, not imported, and not worth a globals config.
      'spike',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Security: the one rule that closes the injection path. See docs/mvp.md.
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
    },
  },
  {
    // US-51. A classic browser script served as-is, outside the bundle.
    files: ['public/**/*.js'],
    languageOptions: {
      globals: { document: 'readonly', localStorage: 'readonly' },
    },
  },
  {
    // Build tooling that runs in Node, never in the browser.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        // US-56. The updater asks GitHub whether CI passed, and waits between.
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
  {
    // AC-84.3. Every spec takes `test` from e2e/clock.ts, which starts the
    // page on a fixed day. Taken straight from Playwright, a spec runs on the
    // machine's date and fails on the last day of a month.
    files: ['e2e/**/*.ts'],
    ignores: ['e2e/clock.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test'],
              message: "Import test from './clock', which pins the date.",
            },
          ],
        },
      ],
    },
  },
  prettier,
);

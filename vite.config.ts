import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Needed so `import css from './index.css?raw'` returns the real file.
    // Without it Vitest replaces every CSS import with an empty string, and
    // src/design/contrast.test.ts would silently check nothing.
    css: true,
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test-setup.ts', 'src/**/*.test.{ts,tsx}'],
    },
  },
});

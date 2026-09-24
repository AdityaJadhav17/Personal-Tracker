import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no matchMedia. US-51's theme toggle asks it which scheme the
 * system prefers; this answers "light" unless a test sets `systemDark`.
 */
export const media = { systemDark: false };
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('dark') && media.systemDark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

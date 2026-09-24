import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no matchMedia. US-51's theme toggle asks it which scheme the
 * system prefers; this answers "light" unless a test sets `systemDark`.
 */
export const media = { systemDark: false };

/**
 * jsdom has no popover API either. US-53 opens a calendar day with
 * showPopover; here the day simply stays in the document, which is all a
 * component test can see anyway. Escape and light dismiss are Playwright's.
 */
HTMLElement.prototype.showPopover = () => {};
HTMLElement.prototype.hidePopover = () => {};
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('dark') && media.systemDark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

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
 * Hiding says so the way a browser does, with a toggle event, because
 * US-66's sheets close on that event whatever closed them.
 */
HTMLElement.prototype.showPopover = () => {};
HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
  this.dispatchEvent(
    Object.assign(new Event('toggle'), { newState: 'closed' }),
  );
};
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: query.includes('dark') && media.systemDark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

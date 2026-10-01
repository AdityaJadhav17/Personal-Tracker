import '@testing-library/jest-dom/vitest';

/**
 * AC-84.4. Every test runs on Tuesday 15 September 2026 at 10:00 local, the
 * "today" the written-out dates in these tests assume. Without it the app's
 * clock is the machine's, and a test adding a deadline for 3 October started
 * failing once 3 October had passed. Only Date is faked: timers, user-event
 * and Web Crypto stay real.
 */
export const TODAY = new Date(2026, 8, 15, 10, 0, 0, 0);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: TODAY });
});

afterEach(() => {
  vi.useRealTimers();
});

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

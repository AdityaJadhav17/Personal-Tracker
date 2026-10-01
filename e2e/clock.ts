import { test as base, expect } from '@playwright/test';

/**
 * AC-84.1. The moment every spec's "today" starts at: Tuesday 15 September
 * 2026, 10:00 local. Mid-month and seven weeks from a clock change, so a day
 * or a week either side stays in the same month and the same offset. On the
 * real clock, specs failed on the last day of every month.
 */
export const TODAY = new Date(2026, 8, 15, 10, 0, 0, 0);

/**
 * AC-84.1. Every spec imports `test` from here. The page's clock starts at
 * TODAY and keeps moving in real time: a frozen clock would give every note
 * the same edit time, and notes are ordered by it.
 */
export const test = base.extend<{ pinnedClock: void }>({
  pinnedClock: [
    async ({ page }, use) => {
      await page.clock.install({ time: TODAY });
      await use();
    },
    { auto: true },
  ],
});

export { expect };

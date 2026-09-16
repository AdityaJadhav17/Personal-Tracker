import { toDateValue } from './dates';
import type { Item } from './types';

/**
 * What is still open and due today. AC-16.1 and AC-16.3.
 *
 * Counted by local calendar day, the same rule the dashboard groups by, so the
 * number and the Today group can never disagree. A rolling twenty-four hours
 * would count tomorrow morning as today late at night.
 */
export function remainingToday(items: Item[], now: Date): number {
  const today = toDateValue(now);
  return items.filter(
    (item) =>
      item.status === 'open' && toDateValue(new Date(item.dueAt)) === today,
  ).length;
}

/**
 * What you finished yesterday. AC-16.2.
 *
 * Keyed on when it was finished, not when it was due, so clearing a backlog
 * shows up on the day you did the work.
 */
export function completedYesterday(items: Item[], now: Date): number {
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const key = toDateValue(yesterday);

  return items.filter(
    (item) =>
      item.completedAt !== null &&
      toDateValue(new Date(item.completedAt)) === key,
  ).length;
}

import { daysBetween, localDay, monthDay } from './dates';
import type { Database, Goal, Item } from './types';

/**
 * How much of a goal's work is finished.
 *
 * Derived every render rather than stored, so it cannot drift from the items
 * it describes. Returns the two numbers rather than a percentage, because a
 * goal with no items has no percentage and the caller needs to say "0 of 0"
 * instead of dividing by zero. AC-15.1 and AC-15.2.
 */
export function progressOf(
  items: Item[],
  goalId: string,
): { done: number; total: number } {
  const mine = items.filter((item) => item.goalId === goalId);
  return {
    done: mine.filter((item) => item.status === 'done').length,
    total: mine.length,
  };
}

/**
 * Remove a goal and let go of it everywhere, keeping the work.
 *
 * AC-20.1. Abandoning a goal must not delete the things you already did for
 * it. The items stay and their `goalId` returns to null. Same shape as
 * deleteCourse, for the same reason.
 */
export function deleteGoal(db: Database, id: string): Database {
  return {
    ...db,
    goals: db.goals.filter((goal) => goal.id !== id),
    items: db.items.map((item) =>
      item.goalId === id ? { ...item, goalId: null } : item,
    ),
  };
}

/**
 * AC-65.1. A goal's target as its date and how long is left, "Oct 10 · 16
 * days left". No time of day: a goal is aimed at a day, not a minute.
 */
export function timeLeft(targetAt: Goal['targetAt'], now: Date): string {
  const left = -daysBetween(targetAt, now);
  const when =
    left < 0
      ? 'Passed'
      : left === 0
        ? 'Today'
        : left === 1
          ? 'Tomorrow'
          : `${left} days left`;
  return `${monthDay(localDay(targetAt))} · ${when}`;
}

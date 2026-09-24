import { localDay } from './dates';
import type { Item, Priority } from './types';

const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/**
 * Order the items inside one dashboard group: soonest day first, then
 * priority within a day, then time.
 *
 * US-55. This was priority first, which put December's finals above next
 * week's homework in Later, and once US-54 showed only ten, pushed that
 * homework out of sight. Dates lead now, in every group, Overdue included, so
 * the most overdue comes first. Priority still decides between things due the
 * same day, and high items keep their accent bar, so an exam still stands out.
 *
 * Due dates all come out of toISOString, so one format means comparing them
 * as strings orders them chronologically without parsing. Array.sort is
 * stable, which is what holds two items due at the same minute in the same
 * order between reloads.
 */
export function sortWithinGroup(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byDay = localDay(a.dueAt).localeCompare(localDay(b.dueAt));
    if (byDay !== 0) return byDay;
    const byPriority = RANK[a.priority] - RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.dueAt.localeCompare(b.dueAt);
  });
}

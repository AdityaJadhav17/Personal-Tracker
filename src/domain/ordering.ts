import type { Item, Priority } from './types';

const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/**
 * Order the items inside one dashboard group: priority first, then whichever
 * is due soonest.
 *
 * This runs on every group, Overdue included, so a high-priority item that is
 * a day late reads above a low-priority one that is twelve days late. Being
 * late is already carried by the group itself. Within the group, what to do
 * first is a priority question.
 *
 * Due dates all come out of toISOString, so one format means comparing them
 * as strings orders them chronologically without parsing. Array.sort is
 * stable, which is what holds two items due at the same minute in the same
 * order between reloads.
 */
export function sortWithinGroup(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const byPriority = RANK[a.priority] - RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.dueAt.localeCompare(b.dueAt);
  });
}

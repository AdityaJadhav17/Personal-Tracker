import type { Item } from './types';

/**
 * US-45. An item's steps, in the order they fall due.
 *
 * Sorted by date rather than by when they were added, because the order a
 * project's steps happen in is the order they are due. ISO instants in UTC
 * sort as strings in time order.
 */
export function stepsOf(parentId: string, items: Item[]): Item[] {
  return items
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

import type { Database } from './types';

/** What a database looks like on its way through, before the last hop. */
interface Partial {
  version: number;
  items: unknown[];
  goals?: unknown[];
  courses?: unknown[];
  reflections?: unknown[];
  lastBackupAt?: string | null;
}

/**
 * Bring a database up to the current version, one hop at a time.
 *
 * Version 1 had only `items`, and items had no goal or course. Version 2 adds
 * goals, courses and reflections, and a null link on every item. Version 3
 * adds `repeat`. Version 4 adds `repeatDay` on items and `lastBackupAt` on the
 * database. Version 5 adds `parentId`, for steps. Anything already current is
 * handed straight back.
 *
 * Written as steps rather than one branch per starting version, so adding
 * version 4 means adding one hop instead of revisiting every path through.
 *
 * The caller has validated the shape; this only moves it forward. Keep it
 * pure, because both `load` and `parseImport` route through it and neither
 * should be surprised by a mutated input.
 */
export function upgrade(db: Partial): Database {
  let current = db;

  if (current.version < 2) {
    current = {
      version: 2,
      items: current.items.map((item) => ({
        ...(item as object),
        goalId: null,
        courseId: null,
      })),
      goals: [],
      courses: [],
      reflections: [],
    };
  }

  if (current.version < 3) {
    current = {
      ...current,
      version: 3,
      items: current.items.map((item) => ({
        repeat: 'none',
        // Spread second, so anything that already carries the field keeps it.
        ...(item as object),
      })),
    };
  }

  if (current.version < 4) {
    current = {
      ...current,
      version: 4,
      items: current.items.map((item) => ({
        repeatDay: null,
        ...(item as object),
      })),
      lastBackupAt: current.lastBackupAt ?? null,
    };
  }

  if (current.version < 5) {
    current = {
      ...current,
      version: 5,
      items: current.items.map((item) => ({
        parentId: null,
        ...(item as object),
      })),
    };
  }

  return current as unknown as Database;
}

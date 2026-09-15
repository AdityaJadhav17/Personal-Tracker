import type { Database, Item } from './types';

/**
 * Bring a database up to the current version.
 *
 * Version 1 had only `items`, and items had no goal or course. Version 2 adds
 * goals, courses and reflections, and a null link on every item. Anything
 * already at version 2 is handed straight back.
 *
 * The caller has validated the shape; this only moves it forward. Keep it
 * pure, because both `load` and `parseImport` route through it and neither
 * should be surprised by a mutated input.
 */
export function upgrade(db: { version: number; items: unknown[] }): Database {
  if (db.version === 2) return db as unknown as Database;

  return {
    version: 2,
    items: db.items.map((item) => ({
      ...(item as Omit<Item, 'goalId' | 'courseId'>),
      goalId: null,
      courseId: null,
    })),
    goals: [],
    courses: [],
    reflections: [],
  };
}

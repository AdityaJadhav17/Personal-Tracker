import type { Database } from './types';

/**
 * Remove a course and let go of it everywhere, keeping the work.
 *
 * AC-07.3. Deleting a course you dropped, or one whose quarter ended, must not
 * take its assignments with it. The items stay and their `courseId` returns to
 * null, which is the same state an item has before it is assigned.
 *
 * Pure, so the caller can test the cascade without a DOM.
 */
export function deleteCourse(db: Database, id: string): Database {
  return {
    ...db,
    courses: db.courses.filter((course) => course.id !== id),
    items: db.items.map((item) =>
      item.courseId === id ? { ...item, courseId: null } : item,
    ),
  };
}

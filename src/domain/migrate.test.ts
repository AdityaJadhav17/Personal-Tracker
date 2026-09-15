import { upgrade } from './migrate';
import type { Database } from './types';

/** An item exactly as version 1 wrote it: no goalId, no courseId. */
function v1Item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    title: 'CSE 100 project',
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-15T17:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

function v1Database(items: unknown[] = [v1Item()]) {
  return { version: 1, items };
}

describe('upgrade', () => {
  test('a version 2 database is returned untouched', () => {
    const already: Database = {
      version: 2,
      items: [],
      goals: [],
      courses: [],
      reflections: [],
    };
    expect(upgrade(already)).toBe(already);
  });

  test('a version 1 database gains the three new collections, empty', () => {
    const upgraded = upgrade(v1Database());

    expect(upgraded.version).toBe(2);
    expect(upgraded.goals).toEqual([]);
    expect(upgraded.courses).toEqual([]);
    expect(upgraded.reflections).toEqual([]);
  });

  test('every version 1 item gains a null goalId and courseId', () => {
    const upgraded = upgrade(
      v1Database([v1Item({ id: 'a' }), v1Item({ id: 'b' })]),
    );

    expect(upgraded.items).toHaveLength(2);
    for (const item of upgraded.items) {
      expect(item.goalId).toBeNull();
      expect(item.courseId).toBeNull();
    }
  });

  test('no other field on a version 1 item is touched', () => {
    const original = v1Item({
      title: 'Rent',
      note: 'Zelle, not Venmo',
      status: 'done',
      completedAt: '2026-09-16T01:00:00.000Z',
      priority: 'high',
      category: 'personal',
    });

    const [upgraded] = upgrade(v1Database([original])).items;

    expect(upgraded).toMatchObject({
      id: original.id,
      title: 'Rent',
      dueAt: original.dueAt,
      category: 'personal',
      priority: 'high',
      status: 'done',
      note: 'Zelle, not Venmo',
      createdAt: original.createdAt,
      completedAt: '2026-09-16T01:00:00.000Z',
    });
  });

  test('an empty version 1 database upgrades without complaint', () => {
    expect(upgrade(v1Database([]))).toEqual({
      version: 2,
      items: [],
      goals: [],
      courses: [],
      reflections: [],
    });
  });

  test('upgrading does not mutate the database it was given', () => {
    const before = v1Database();
    const snapshot = JSON.stringify(before);

    upgrade(before);

    expect(JSON.stringify(before)).toBe(snapshot);
  });

  test('upgrading twice is the same as upgrading once', () => {
    const once = upgrade(v1Database());
    expect(upgrade(once)).toEqual(once);
  });
});

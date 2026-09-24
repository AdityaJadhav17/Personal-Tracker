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
  test('a database already at the current version is returned untouched', () => {
    const already: Database = {
      version: 4,
      items: [],
      goals: [],
      courses: [],
      reflections: [],
      lastBackupAt: null,
    };
    expect(upgrade(already)).toBe(already);
  });

  test('a version 1 database gains the three new collections, empty', () => {
    const upgraded = upgrade(v1Database());

    // US-28 moved the destination from 2 to 3; the point of the test is that
    // a version 1 file arrives at whatever current is, with nothing missing.
    expect(upgraded.version).toBe(4);
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
      version: 4,
      items: [],
      goals: [],
      courses: [],
      reflections: [],
      lastBackupAt: null,
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

describe('AC-28.7 upgrading past version 3', () => {
  test('a version 1 database arrives at the current version with everything filled in', () => {
    const upgraded = upgrade(v1Database());

    expect(upgraded.version).toBe(4);
    expect(upgraded.items[0]).toMatchObject({
      title: 'CSE 100 project',
      goalId: null,
      courseId: null,
      repeat: 'none',
    });
  });

  test('a version 2 database gains repeat and keeps its collections', () => {
    const v2 = {
      version: 2,
      items: [{ ...v1Item(), goalId: 'g1', courseId: 'c1' }],
      goals: [{ id: 'g1' }],
      courses: [{ id: 'c1' }],
      reflections: [{ id: 'r1' }],
    };

    const upgraded = upgrade(v2 as never);

    expect(upgraded.version).toBe(4);
    expect(upgraded.items[0]?.repeat).toBe('none');
    // The links it already had survive the second hop.
    expect(upgraded.items[0]?.goalId).toBe('g1');
    expect(upgraded.goals).toHaveLength(1);
    expect(upgraded.reflections).toHaveLength(1);
  });

  test('a version 3 database is returned untouched', () => {
    const already = {
      version: 3,
      items: [{ ...v1Item(), goalId: null, courseId: null, repeat: 'monthly' }],
      goals: [],
      courses: [],
      reflections: [],
    };

    expect(upgrade(already as never).items[0]?.repeat).toBe('monthly');
  });

  test('an item that already repeats is not reset by the upgrade', () => {
    const v2 = {
      version: 2,
      items: [{ ...v1Item(), goalId: null, courseId: null, repeat: 'weekly' }],
      goals: [],
      courses: [],
      reflections: [],
    };

    // Version 2 never wrote this field, but if something did, it is kept
    // rather than stamped over.
    expect(upgrade(v2 as never).items[0]?.repeat).toBe('weekly');
  });
});

describe('version 4', () => {
  test('AC-40.7 a version 3 database gains no backup date and no repeat anchors', () => {
    const upgraded = upgrade({
      version: 3,
      items: [v1Item({ goalId: null, courseId: null, repeat: 'monthly' })],
      goals: [],
      courses: [],
      reflections: [],
    });

    expect(upgraded.version).toBe(4);
    expect(upgraded.lastBackupAt).toBeNull();
    expect(upgraded.items[0]?.repeatDay).toBeNull();
    expect(upgraded.items[0]?.repeat).toBe('monthly');
  });

  test('AC-40.7 a version 1 file still reaches the current version whole', () => {
    const upgraded = upgrade(v1Database());

    expect(upgraded.version).toBe(4);
    expect(upgraded.items[0]).toMatchObject({
      repeat: 'none',
      repeatDay: null,
      goalId: null,
    });
  });
});

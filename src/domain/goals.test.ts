import { deleteGoal, progressOf } from './goals';
import type { Database, Goal, Item } from './types';

function anItem(id: string, goalId: string | null, done = false): Item {
  return {
    id,
    title: id,
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: done ? 'done' : 'open',
    note: '',
    createdAt: '2026-09-15T17:00:00.000Z',
    completedAt: done ? '2026-09-16T01:00:00.000Z' : null,
    goalId,
    courseId: null,
    repeatDay: null,
    parentId: null,
    repeat: 'none',
  };
}

function aGoal(id: string, name = id): Goal {
  return {
    id,
    name,
    description: 'Something worth doing',
    targetAt: '2026-12-15T08:00:00.000Z',
    createdAt: '2026-09-15T17:00:00.000Z',
  };
}

function aDatabase(goals: Goal[], items: Item[]): Database {
  return {
    version: 5,
    items,
    goals,
    courses: [],
    reflections: [],
    lastBackupAt: null,
  };
}

describe('progressOf', () => {
  test('AC-15.1 counts the done items against the total', () => {
    const items = [
      anItem('a', 'g1', true),
      anItem('b', 'g1'),
      anItem('c', 'g1'),
      anItem('d', 'g1'),
    ];

    expect(progressOf(items, 'g1')).toEqual({ done: 1, total: 4 });
  });

  test('AC-15.1 items belonging to another goal do not count', () => {
    const items = [
      anItem('a', 'g1', true),
      anItem('b', 'g2'),
      anItem('c', null),
    ];

    expect(progressOf(items, 'g1')).toEqual({ done: 1, total: 1 });
  });

  test('AC-15.2 a goal with no items is zero of zero, not a division', () => {
    expect(progressOf([anItem('a', 'g2')], 'g1')).toEqual({
      done: 0,
      total: 0,
    });
  });

  test('AC-15.2 a goal with no items reports no fraction to divide by', () => {
    const { done, total } = progressOf([], 'g1');
    // The caller renders 0% from this without dividing by zero.
    expect(total).toBe(0);
    expect(done).toBe(0);
  });

  test('AC-15.1 everything finished is total of total', () => {
    const items = [anItem('a', 'g1', true), anItem('b', 'g1', true)];

    expect(progressOf(items, 'g1')).toEqual({ done: 2, total: 2 });
  });
});

describe('deleteGoal', () => {
  test('AC-20.1 the goal goes', () => {
    const db = aDatabase([aGoal('g1'), aGoal('g2')], []);

    expect(deleteGoal(db, 'g1').goals.map((g) => g.id)).toEqual(['g2']);
  });

  test('AC-20.1 its items remain, with the goal cleared', () => {
    const db = aDatabase(
      [aGoal('g1')],
      [anItem('a', 'g1'), anItem('b', 'g1'), anItem('c', 'g1')],
    );

    const next = deleteGoal(db, 'g1');

    expect(next.items).toHaveLength(3);
    for (const item of next.items) {
      expect(item.goalId).toBeNull();
    }
  });

  test('AC-20.1 items of another goal are untouched', () => {
    const db = aDatabase(
      [aGoal('g1'), aGoal('g2')],
      [anItem('a', 'g1'), anItem('b', 'g2')],
    );

    expect(deleteGoal(db, 'g1').items.find((i) => i.id === 'b')?.goalId).toBe(
      'g2',
    );
  });

  test('AC-20.1 nothing else about an item changes', () => {
    const original = anItem('a', 'g1', true);
    const db = aDatabase([aGoal('g1')], [original]);

    expect(deleteGoal(db, 'g1').items[0]).toEqual({
      ...original,
      goalId: null,
    });
  });

  test('deleting a goal that is not there changes nothing', () => {
    const db = aDatabase([aGoal('g1')], [anItem('a', 'g1')]);

    expect(deleteGoal(db, 'gone')).toEqual(db);
  });

  test('the other collections are carried through', () => {
    const db = aDatabase([aGoal('g1')], []);
    const next = deleteGoal(db, 'g1');

    expect(next.version).toBe(5);
    expect(next.courses).toEqual([]);
    expect(next.reflections).toEqual([]);
  });

  test('deleting does not mutate the database it was given', () => {
    const db = aDatabase([aGoal('g1')], [anItem('a', 'g1')]);
    const snapshot = JSON.stringify(db);

    deleteGoal(db, 'g1');

    expect(JSON.stringify(db)).toBe(snapshot);
  });
});

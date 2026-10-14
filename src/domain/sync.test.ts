import { stamp } from './sync';
import type { Database, Item } from './types';

const NOW = new Date(2026, 8, 15, 10);
const T0 = '2026-09-01T00:00:00.000Z';

function anItem(id: string, rest: Partial<Item> = {}): Item {
  return {
    id,
    title: id,
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: T0,
    changedAt: T0,
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    parentId: null,
    repeat: 'none',
    ...rest,
  };
}
function aDatabase(items: Item[]): Database {
  return {
    version: 11,
    items,
    goals: [],
    courses: [],
    reflections: [],
    notes: [],
    lastBackupAt: null,
    lock: null,
    tasks: [],
    deleted: [],
  };
}

test('AC-99.1 a changed record is dated now; an untouched one keeps its time', () => {
  const a = anItem('a');
  const b = anItem('b');
  const before = aDatabase([a, b]);
  const after = stamp(
    before,
    { ...before, items: [a, { ...b, title: 'B' }] },
    NOW,
  );
  expect(after.items[0]!.changedAt).toBe(T0);
  expect(after.items[1]!.changedAt).toBe(NOW.toISOString());
});

test('AC-99.2 a deleted record leaves a marker; bringing it back removes it', () => {
  const a = anItem('a');
  const before = aDatabase([a]);
  const gone = stamp(before, { ...before, items: [] }, NOW);
  expect(gone.deleted).toEqual([
    { kind: 'items', id: 'a', at: NOW.toISOString() },
  ]);
  const back = stamp(gone, { ...gone, items: [a] }, NOW);
  expect(back.deleted).toEqual([]);
  expect(back.items[0]!.changedAt).toBe(NOW.toISOString());
});

test('AC-99.2 reflections are marked by day', () => {
  const r = {
    id: 'r1',
    day: '2026-09-14',
    score: 4 as const,
    note: '',
    createdAt: T0,
    changedAt: T0,
  };
  const before = { ...aDatabase([]), reflections: [r] };
  expect(stamp(before, { ...before, reflections: [] }, NOW).deleted[0]).toEqual(
    {
      kind: 'reflections',
      id: '2026-09-14',
      at: NOW.toISOString(),
    },
  );
});

test('AC-99.1 a new lock is dated now', () => {
  const before = aDatabase([]);
  const lock = { salt: 's', check: { iv: 'i', data: 'd' }, changedAt: T0 };
  expect(stamp(before, { ...before, lock }, NOW).lock?.changedAt).toBe(
    NOW.toISOString(),
  );
});

test('AC-99.3 markers older than 60 days are dropped', () => {
  const before = {
    ...aDatabase([]),
    deleted: [
      { kind: 'items' as const, id: 'old', at: '2026-07-01T00:00:00.000Z' },
      { kind: 'items' as const, id: 'recent', at: '2026-09-01T00:00:00.000Z' },
    ],
  };
  expect(stamp(before, before, NOW).deleted.map((d) => d.id)).toEqual([
    'recent',
  ]);
});

import { lockConflict, merge, sameRecords, stamp } from './sync';
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

// US-101. merge and sameRecords.
const at = (h: number, s = 0) => new Date(2026, 8, 15, h, 0, s).toISOString();
const aNote = (sealed: string | null, changedAt: string, id = 'n') => ({
  id,
  body: 'Bank',
  createdAt: T0,
  updatedAt: T0,
  changedAt,
  pinned: false,
  sealed: sealed ? { iv: sealed, data: sealed } : null,
});
const aLock = (salt: string, changedAt: string) => ({
  salt,
  check: { iv: 'c', data: 'c' },
  changedAt,
});
/** Merge order may differ, the content may not. */
const canon = (db: Database) => ({
  ...db,
  items: [...db.items].sort((x, y) => x.id.localeCompare(y.id)),
  notes: [...db.notes].sort((x, y) => x.id.localeCompare(y.id)),
  deleted: [...db.deleted].sort((x, y) => x.id.localeCompare(y.id)),
});
const mark = (id: string, when: string) => ({
  kind: 'items' as const,
  id,
  at: when,
});

test('AC-101.2 the newer change of a record wins, from either side', () => {
  const local = aDatabase([anItem('a', { title: 'mine', changedAt: at(9) })]);
  const shared = aDatabase([
    anItem('a', { title: 'theirs', changedAt: at(10) }),
  ]);
  expect(merge(local, shared).items[0]!.title).toBe('theirs');
  expect(merge(shared, local).items[0]!.title).toBe('theirs');
});

test('AC-101.2 records only one side has are kept', () => {
  const merged = merge(aDatabase([anItem('a')]), aDatabase([anItem('b')]));
  expect(merged.items.map((i) => i.id).sort()).toEqual(['a', 'b']);
});

test('AC-101.2 a deletion beats an older edit, and loses to a newer one', () => {
  const kept = anItem('a', { changedAt: at(9) });
  const gone = { ...aDatabase([]), deleted: [mark('a', at(10))] };
  expect(merge(aDatabase([kept]), gone).items).toEqual([]);
  const revived = anItem('a', { changedAt: at(11) });
  const merged = merge(aDatabase([revived]), gone);
  expect(merged.items.map((i) => i.id)).toEqual(['a']);
  expect(merged.deleted).toEqual([]);
});

test('AC-101.2 merging a copy with itself changes nothing', () => {
  const db = aDatabase([anItem('a'), anItem('b')]);
  expect(merge(db, db)).toEqual(db);
});

test('AC-101.2 the newest of two deletion markers is kept', () => {
  const m = (h: number) => ({ ...aDatabase([]), deleted: [mark('a', at(h))] });
  expect(merge(m(9), m(10)).deleted).toEqual([mark('a', at(10))]);
  expect(merge(m(10), m(9)).deleted).toEqual([mark('a', at(10))]);
});

test('AC-101.3 the newer lock wins and brings its locked notes', () => {
  const local = {
    ...aDatabase([]),
    lock: aLock('old', at(9)),
    notes: [aNote('edited-under-old', at(12))],
  };
  const shared = {
    ...aDatabase([]),
    lock: aLock('new', at(10)),
    notes: [aNote('resealed-under-new', at(10))],
  };
  const merged = merge(local, shared);
  expect(merged.lock?.salt).toBe('new');
  expect(merged.notes[0]!.sealed?.data).toBe('resealed-under-new');
});

test('AC-101.3 under the same lock the newer edit of a locked note wins', () => {
  const lock = aLock('same', at(9));
  const local = { ...aDatabase([]), lock, notes: [aNote('old', at(10))] };
  const shared = { ...aDatabase([]), lock, notes: [aNote('newer', at(11))] };
  expect(merge(local, shared).notes[0]!.sealed?.data).toBe('newer');
});

test('AC-101.6 the local last-backup date is kept', () => {
  const local = { ...aDatabase([]), lastBackupAt: at(8) };
  const shared = { ...aDatabase([]), lastBackupAt: at(11) };
  expect(merge(local, shared).lastBackupAt).toBe(at(8));
});

test('AC-101.2 merge(a, b) equals merge(b, a), equal times included', () => {
  const a = aDatabase([
    anItem('t', { title: 'alpha', changedAt: at(9) }),
    anItem('x', { changedAt: at(8) }),
  ]);
  const b = aDatabase([
    anItem('t', { title: 'beta', changedAt: at(9) }),
    anItem('y', { changedAt: at(8) }),
  ]);
  expect(canon(merge(a, b))).toEqual(canon(merge(b, a)));
  expect(merge(a, b).items.find((i) => i.id === 't')!.title).toBe('beta');
});

test('AC-101.2 merge(a, b) equals merge(b, a) with markers and locks', () => {
  const a = {
    ...aDatabase([anItem('x', { changedAt: at(8) })]),
    deleted: [mark('y', at(9))],
    lock: aLock('one', at(9)),
    notes: [aNote('one', at(9))],
  };
  const b = {
    ...aDatabase([anItem('y', { changedAt: at(8) })]),
    deleted: [mark('x', at(9))],
    lock: aLock('two', at(9)),
    notes: [aNote('two', at(9))],
  };
  expect(canon(merge(a, b))).toEqual(canon(merge(b, a)));
  expect(merge(a, b).items).toEqual([]);
});

test('AC-101.7 a locked note only on the losing-lock side stays sealed as it was', () => {
  const local = {
    ...aDatabase([]),
    lock: aLock('old', at(9)),
    notes: [aNote('only-here', at(9), 'lonely')],
  };
  const shared = { ...aDatabase([]), lock: aLock('new', at(10)) };
  const merged = merge(local, shared);
  expect(merged.lock?.salt).toBe('new');
  expect(merged.notes[0]!.sealed?.data).toBe('only-here');
});

test('AC-101.7 a repeating item finished on both sides leaves both next occurrences', () => {
  const done = (next: string) =>
    aDatabase([
      anItem('r', { repeat: 'weekly', status: 'done', changedAt: at(9) }),
      anItem(next, { repeat: 'weekly', parentId: 'r', changedAt: at(9) }),
    ]);
  const ids = merge(done('next-local'), done('next-shared'))
    .items.map((i) => i.id)
    .sort();
  expect(ids).toEqual(['next-local', 'next-shared', 'r']);
});

test('AC-101.2 sameRecords is true for the same content, lock and markers whatever the key order', () => {
  const a = {
    ...aDatabase([anItem('a')]),
    lock: aLock('x', at(9)),
    deleted: [mark('z', at(9))],
    lastBackupAt: at(8),
  };
  const b = {
    ...a,
    items: [reorder(anItem('a'))],
    lastBackupAt: null,
  };
  expect(sameRecords(a, b)).toBe(true);
});

test('AC-101.2 sameRecords is false when a key, time, lock or marker differs', () => {
  const base = aDatabase([anItem('a')]);
  const locked = (h: number) => ({ ...base, lock: aLock('x', at(h)) });
  expect(sameRecords(base, aDatabase([anItem('b')]))).toBe(false);
  expect(
    sameRecords(base, aDatabase([anItem('a', { changedAt: at(9) })])),
  ).toBe(false);
  expect(sameRecords(base, locked(9))).toBe(false);
  expect(sameRecords(locked(9), locked(10))).toBe(false);
  const marked = (when: string) => ({ ...base, deleted: [mark('z', when)] });
  expect(sameRecords(base, marked(at(9)))).toBe(false);
  expect(sameRecords(marked(at(9)), marked(at(10)))).toBe(false);
});

// US-101 fix round 1.
const reorder = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).reverse()) as T;

test('AC-101.2 sameRecords is false for equal times with different content', () => {
  const a = aDatabase([anItem('a', { title: 'one' })]);
  const b = aDatabase([anItem('a', { title: 'two' })]);
  expect(sameRecords(a, b)).toBe(false);
  expect(
    sameRecords(a, aDatabase([reorder(anItem('a', { title: 'one' }))])),
  ).toBe(true);
});

test('AC-101.2 an equal-time tie picks the same winner whatever the key order', () => {
  const a = aDatabase([anItem('a', { title: 'beta' })]);
  const b = aDatabase([reorder(anItem('a', { title: 'alpha' }))]);
  expect(merge(a, b).items[0]!.title).toBe('beta');
  expect(merge(b, a).items[0]!.title).toBe('beta');
  expect(canon(merge(a, b))).toEqual(canon(merge(b, a)));
});

test('AC-105.1 a sealed note on the lock side beats a newer readable copy from a device with no lock', () => {
  const readable = { ...aNote(null, at(12)), body: 'later edit' };
  const local = { ...aDatabase([]), lock: null, notes: [readable] };
  const sealed = aNote('kept', at(10));
  const shared = {
    ...aDatabase([]),
    lock: aLock('lock', at(9)),
    notes: [sealed],
  };
  expect(merge(local, shared).notes).toEqual([sealed]);
  expect(merge(shared, local).notes).toEqual([sealed]);
});

test('AC-105.1 a sealed note on the lock side beats a newer readable copy from a device whose lock loses', () => {
  const readable = { ...aNote(null, at(12)), body: 'later edit' };
  const local = {
    ...aDatabase([]),
    lock: aLock('old', at(8)),
    notes: [readable],
  };
  const sealed = aNote('kept', at(10));
  const shared = {
    ...aDatabase([]),
    lock: aLock('new', at(9)),
    notes: [sealed],
  };
  expect(merge(local, shared).notes).toEqual([sealed]);
  expect(merge(shared, local).notes).toEqual([sealed]);
});

test('AC-101.3 the lock side copy of a note is taken whole, even if older and readable', () => {
  const local = {
    ...aDatabase([]),
    lock: aLock('old', at(9)),
    notes: [aNote('newer-sealed', at(12))],
  };
  const readable = { ...aNote(null, at(8)), body: 'readable text' };
  const shared = {
    ...aDatabase([]),
    lock: aLock('new', at(10)),
    notes: [readable],
  };
  expect(merge(local, shared).notes).toEqual([readable]);
  expect(merge(shared, local).notes).toEqual([readable]);
});

test('AC-101.2 a far-future changedAt wins once and merging again changes nothing', () => {
  const week = new Date(2026, 8, 22, 10).toISOString();
  const ahead = aDatabase([anItem('a', { title: 'ahead', changedAt: week })]);
  const normal = aDatabase([
    anItem('a', { title: 'normal', changedAt: at(9) }),
  ]);
  const merged = merge(ahead, normal);
  expect(merged.items[0]).toEqual(ahead.items[0]);
  expect(merge(merged, ahead)).toEqual(merged);
  expect(merge(merged, normal)).toEqual(merged);
  expect(merge(normal, merged).items).toEqual(merged.items);
});

test('AC-101.7 lockConflict counts sealed notes the losing lock holds and the winner lacks', () => {
  const lonely = (salt: string, h: number) => ({
    ...aDatabase([]),
    lock: aLock(salt, at(h)),
    notes: [aNote('x', at(h), 'lonely'), aNote(null, at(h), 'plain')],
  });
  const older = lonely('old', 9);
  const newer = { ...aDatabase([]), lock: aLock('new', at(10)) };
  expect(lockConflict(older, newer)).toEqual({ count: 1, here: true });
  expect(lockConflict(newer, older)).toEqual({ count: 1, here: false });
  const same = { ...newer, lock: aLock('old', at(10)) };
  expect(lockConflict(older, same).count).toBe(0);
  const known = { ...newer, notes: [aNote('y', at(10), 'lonely')] };
  expect(lockConflict(older, known).count).toBe(0);
  expect(lockConflict(older, aDatabase([])).count).toBe(0);
});

test('AC-102.4 lockConflict also counts a note sealed on the losing side and readable on the winner', () => {
  const older = {
    ...aDatabase([]),
    lock: aLock('old', at(9)),
    notes: [aNote('x', at(9), 'both')],
  };
  const newer = {
    ...aDatabase([]),
    lock: aLock('new', at(10)),
    notes: [aNote(null, at(10), 'both')],
  };
  expect(lockConflict(older, newer)).toEqual({ count: 1, here: true });
  expect(lockConflict(newer, older)).toEqual({ count: 1, here: false });
  const sealedBoth = { ...newer, notes: [aNote('y', at(10), 'both')] };
  expect(lockConflict(older, sealedBoth).count).toBe(0);
});

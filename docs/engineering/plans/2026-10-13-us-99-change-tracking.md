# US-99 Change Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every record knows when it last changed, and every deletion leaves a dated marker, so a later merge (US-101) can tell which side is newer. Nothing syncs yet.

**Architecture:** Database version 11 adds `changedAt` to every record in the six collections and to the lock, and a `deleted` list to the database. A pure `stamp(previous, next, now)` in `src/domain/sync.ts` compares records by reference and is called once, in `useDatabase`'s `commit`, so no action sets `changedAt` by hand.

**Tech Stack:** React 18, TypeScript, Vitest, Playwright. No new dependency.

**Spec:** `docs/engineering/sync-design.md`, section 1.

## Global Constraints

- Test-first: write the test, watch it fail with a specific message, then the minimum code. Test names contain the AC ID.
- `src/domain/dates.ts` is the only file allowed to construct a `Date`; domain functions take `now` as a parameter.
- Only `migrate.ts` knows versions; adding version 11 is one hop there.
- Aditya runs every git command. "Commit" steps below are commit messages to hand him, not commands to run.
- Before handing over: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npx playwright test`, and the UTC run.
- Never open, seed or clear storage at `localhost:4180`.

---

### Before anything: back up both devices

US-99 is the migration that dates every record. Before its push: Export on the
laptop and on the phone, and check today's file is in the backup folder.

### Task 0: The story

**Files:**

- Create: `docs/product/stories/US-99.md`
- Modify: `docs/product/v2-plan.md` (index line)

- [ ] **Step 1: Write the story**

```markdown
# US-99, every change dated, every deletion remembered

The first of three stories for sync (docs/engineering/sync-design.md).

US-99 As someone about to use Margin on two devices,
I want each record to carry when it last changed, and each deletion to leave a mark,
so that sync can keep the newer of two edits and not bring back what I deleted.

Acceptance criteria:
AC-99.1 Every item, goal, course, reflection, note and routine task, and
the lock, has changedAt. Any change to it sets it to now; a record
nothing touched keeps its time.
AC-99.2 Deleting any of them adds { kind, id, at } to deleted. Bringing
it back (Undo) removes its marker.
AC-99.3 Markers older than 60 days are dropped.
AC-99.4 Version 10 data and files upgrade to 11 with changedAt the
latest of each record's createdAt, completedAt and updatedAt, and an
empty deleted list.
AC-99.5 Export and Import carry changedAt and deleted; a deleted entry
that is not { kind, id, at } is refused.
AC-99.6 Import Merge keeps each file record's own changedAt; Import
Replace dates the file's records now and adds no deletion markers.
AC-99.7 A commit leaves every record it did not touch with its time.
```

- [ ] **Step 2: Add `- [US-99, every change dated, every deletion remembered](stories/US-99.md)` to the index in `docs/product/v2-plan.md`.**

---

### Task 1: Version 11 data shape

**Files:**

- Modify: `src/domain/types.ts` (Item, Goal, Course, Reflection, Note, Task, Lock, Database)
- Modify: `src/domain/migrate.ts` (one hop after version 10)
- Modify: `src/storage/db.ts` (`emptyDatabase`, `load` reads `deleted`)
- Modify: `src/domain/transfer.ts` (`KEYS[11]`, version check, validators, `to*` mappers, `deleted`)
- Modify: every test fixture the compiler lists
- Test: `src/domain/migrate.test.ts`, `src/domain/transfer.test.ts`

**Interfaces:**

- Produces: `Deletion { kind: Collection; id: string; at: string }`, `Database.deleted: Deletion[]`, `changedAt: string` on Item, Goal, Course, Reflection, Note, Task and Lock; `Database.version: 11`.

- [ ] **Step 1: Write the failing migration test** (append to `src/domain/migrate.test.ts`)

```ts
describe('US-99 change tracking', () => {
  test('AC-99.4 version 10 data gains changedAt from its newest time, and no deletions', () => {
    const upgraded = upgrade({
      version: 10,
      items: [{ ...v10Item(), createdAt: '2026-09-01T00:00:00.000Z' }],
      goals: [],
      courses: [],
      reflections: [],
      notes: [
        {
          id: 'n',
          body: 'x',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-20T00:00:00.000Z',
          pinned: false,
          sealed: null,
        },
      ],
      lastBackupAt: null,
      lock: null,
      tasks: [],
    });
    expect(upgraded.version).toBe(11);
    expect(upgraded.items[0]?.changedAt).toBe('2026-09-01T00:00:00.000Z');
    expect(upgraded.notes[0]?.changedAt).toBe('2026-09-20T00:00:00.000Z');
    expect(upgraded.deleted).toEqual([]);
  });
});
```

(`v10Item()` is a local helper returning a complete version-10 item; copy the shape of `anItem` in `src/domain/transfer.test.ts` without `changedAt`.)

- [ ] **Step 2: Run it.** `npx vitest run src/domain/migrate.test.ts -t AC-99.4` — expected FAIL: `expected 10 to be 11`.

- [ ] **Step 3: Types.** In `src/domain/types.ts`, add `changedAt: string;` (doc comment: `/** US-99. When this record last changed; sync keeps the newer. */`) to Item, Goal, Course, Reflection, Note, Task and Lock. Add:

```ts
/** US-99. The six collections sync merges, by key. */
export type Collection =
  'items' | 'goals' | 'courses' | 'reflections' | 'notes' | 'tasks';

/** US-99. A record deleted at `at`; reflections are keyed by day. */
export interface Deletion {
  kind: Collection;
  id: string;
  at: string;
}
```

and in `Database`: `version: 11;` and `deleted: Deletion[];`.

- [ ] **Step 4: The hop.** In `src/domain/migrate.ts`, after the version 10 hop:

```ts
// US-99. Every record dated, so sync can keep the newer; nothing deleted yet.
if (current.version < 11) {
  const dated = <T extends object>(records: T[] | undefined) =>
    (records ?? []).map((record) => {
      const r = record as Record<string, unknown>;
      return {
        // The latest time it already has: a task finished on one device
        // and open on the other must not tie (council, 13 October).
        changedAt: [r.createdAt, r.completedAt, r.updatedAt]
          .filter((t): t is string => typeof t === 'string')
          .sort()
          .at(-1)!,
        ...record,
      };
    });
  current = {
    ...current,
    version: 11,
    items: dated(current.items),
    goals: dated(current.goals),
    courses: dated(current.courses),
    reflections: dated(current.reflections),
    notes: dated(current.notes),
    tasks: dated(current.tasks),
    lock: current.lock
      ? {
          changedAt: current.lock.changedAt ?? new Date(0).toISOString(),
          ...current.lock,
        }
      : null,
    deleted: current.deleted ?? [],
  };
}
```

`new Date(0)` is not allowed outside `dates.ts`: add `export const EPOCH = '1970-01-01T00:00:00.000Z';` to `src/domain/dates.ts` and use `EPOCH` (a lock with no time loses to any dated one, which is correct: it predates sync).

- [ ] **Step 5: `emptyDatabase`** in `src/storage/db.ts`: `version: 11`, `deleted: []`. In `load`, read `deleted: Array.isArray(stored.deleted) ? (stored.deleted as Deletion[]) : []`.

- [ ] **Step 6: Fixtures.** Run `npm run typecheck`. For every fixture it lists, add `changedAt` equal to the fixture's `createdAt` (notes: `updatedAt`), and `deleted: []` to database fixtures; move "current version" assertions from 10 to 11 (`toBe(10)` and `version: 10` in expectations, as US-98 did). A regex helper that inserts `changedAt: <createdAt value>,` after each `createdAt:` line in fixtures does most of it; review the diff.

- [ ] **Step 7: Run.** `npx vitest run src/domain/migrate.test.ts` — expected PASS.

- [ ] **Step 8: Import and export tests** (append to `src/domain/transfer.test.ts`)

```ts
describe('US-99 change tracking in files', () => {
  test('AC-99.5 changedAt and deletions survive an export and an import', () => {
    const db = {
      ...aDatabase(),
      deleted: [
        { kind: 'items' as const, id: 'gone', at: '2026-09-14T00:00:00.000Z' },
      ],
    };
    const result = parseImport(serialize(db));
    expect(result.ok && result.db.deleted).toEqual(db.deleted);
    expect(result.ok && result.db.items[0]?.changedAt).toBe(
      db.items[0]!.changedAt,
    );
  });

  test('AC-99.5 a deleted entry that is not a deletion is refused', () => {
    const result = parseImport(
      JSON.stringify({
        ...aDatabase(),
        deleted: [{ kind: 'people', id: 'x', at: 'now' }],
      }),
    );
    expect(!result.ok && result.error).toMatch(/deleted/i);
  });

  test('AC-99.4 a version 10 file imports with changedAt filled in', () => {
    const { changedAt: _, ...old } = aDatabase().items[0]!;
    const result = parseImport(
      JSON.stringify({
        ...aDatabase(),
        version: 10,
        deleted: undefined,
        items: [old],
      }),
    );
    expect(result.ok && result.db.items[0]?.changedAt).toBe(old.createdAt);
  });
});
```

(If lint flags the `_` binding, build `old` with `delete` as US-98 did.)

- [ ] **Step 9: Run** — expected FAIL: version 11 not readable.

- [ ] **Step 10: Transfer.** In `src/domain/transfer.ts`:
  - `KEYS[11]` = `KEYS[10]` plus `'deleted'`; add `version !== 11` to the readable versions.
  - Each record validator: `if (raw.changedAt !== undefined && !isInstant(raw.changedAt)) return 'its changed date is not a date';`
  - Each `to*` mapper: `changedAt: toInstant((raw.changedAt ?? raw.updatedAt ?? raw.createdAt) as string)` (notes have `updatedAt`; the others fall to `createdAt`).
  - The lock rebuild: `changedAt: typeof lock.changedAt === 'string' ? toInstant(lock.changedAt) : EPOCH`.
  - A `deletionProblem(value)` checking `kind` is one of the six names, `id` is non-empty text and `at` is an instant; report failures as `Deletion ${n} ${problem}.`
  - `deleted: version >= 11 ? (raw.deleted as unknown[]).map(toDeletion) : []`, with `toDeletion` rebuilding `{ kind, id, at: toInstant(at) }`.

- [ ] **Step 11: Run** `npx vitest run src/domain` — expected PASS.

- [ ] **Step 12: Commit** — message: `US-99 version 11: changedAt on every record, deletion markers (AC-99.4, 99.5)`

---

### Task 2: `stamp`, the one place records are dated

**Files:**

- Create: `src/domain/sync.ts`
- Test: `src/domain/sync.test.ts`

**Interfaces:**

- Consumes: `Database`, `Collection`, `Deletion` from Task 1; `daysBetween` from `src/domain/dates.ts`.
- Produces: `export const COLLECTIONS: Collection[]`, `export function keyOf(kind: Collection, record: { id: string; day?: string }): string`, `export function stamp(previous: Database, next: Database, now: Date): Database`.

- [ ] **Step 1: Write the failing tests** (`src/domain/sync.test.ts`)

```ts
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
```

- [ ] **Step 2: Run** `npx vitest run src/domain/sync.test.ts` — expected FAIL: cannot resolve `./sync`.

- [ ] **Step 3: Implement** `src/domain/sync.ts`

```ts
import { daysBetween } from './dates';
import type { Collection, Database, Deletion } from './types';

/** US-99. What sync merges, and how each record is known. */
export const COLLECTIONS: Collection[] = [
  'items',
  'goals',
  'courses',
  'reflections',
  'notes',
  'tasks',
];

/** A reflection is one per day; everything else has an id. */
export function keyOf(
  kind: Collection,
  record: { id: string; day?: string },
): string {
  return kind === 'reflections' ? record.day! : record.id;
}

/** AC-99.3. Long enough for any device to have synced since. */
const KEEP_MARKERS_DAYS = 60;

type Keyed = { id: string; day?: string; changedAt: string };

/**
 * US-99. `next`, with every record that is not the very object it was in
 * `previous` dated `now`, and every record that went missing marked deleted.
 * Actions only rebuild what they change, so identity is the change.
 */
export function stamp(previous: Database, next: Database, now: Date): Database {
  const at = now.toISOString();
  const out = { ...next } as Record<Collection, Keyed[]> & Database;
  const marks: Deletion[] = [];
  const present = new Set<string>();

  for (const kind of COLLECTIONS) {
    const before = new Map(
      (previous[kind] as Keyed[]).map((r) => [keyOf(kind, r), r]),
    );
    out[kind] = (next[kind] as Keyed[]).map((record) => {
      const key = keyOf(kind, record);
      present.add(`${kind}:${key}`);
      return before.get(key) === record ? record : { ...record, changedAt: at };
    });
    for (const key of before.keys()) {
      if (!present.has(`${kind}:${key}`)) marks.push({ kind, id: key, at });
    }
  }

  out.deleted = [
    ...next.deleted.filter(
      (mark) =>
        !present.has(`${mark.kind}:${mark.id}`) &&
        daysBetween(mark.at, now) <= KEEP_MARKERS_DAYS,
    ),
    ...marks,
  ];
  out.lock =
    next.lock && next.lock !== previous.lock
      ? { ...next.lock, changedAt: at }
      : next.lock;
  return out;
}
```

- [ ] **Step 4: Run** — expected PASS. Format: `npx prettier --write src/domain/sync.ts src/domain/sync.test.ts`.

- [ ] **Step 5: Commit** — `US-99 stamp: date changed records and mark deletions (AC-99.1, 99.2, 99.3)`

---

### Task 3: Every write goes through `stamp`

**Files:**

- Modify: `src/state/useDatabase.ts` (`commit`)
- Test: `src/state/useDatabase.test.ts`
- Create: `e2e/us-99-change-tracking.spec.ts`

**Interfaces:**

- Consumes: `stamp` from Task 2.
- Produces: `commit(next: Database, adopt = false)`; `adopt` skips stamping and is used by US-101 for data that arrived from sync.

- [ ] **Step 1: Failing hook tests** (append to `src/state/useDatabase.test.ts`)

```ts
describe('US-99 every write dated', () => {
  test('AC-99.1 pinning a note changes changedAt but not its edit time', () => {
    const hook = renderHook(() => useDatabase());
    let id = '';
    act(() => {
      id = hook.result.current.actions.addNote('Pin me')!;
    });
    const before = hook.result.current.db!.notes[0]!;
    vi.setSystemTime(new Date(2026, 8, 15, 11));
    act(() => hook.result.current.actions.togglePin(id));
    const after = hook.result.current.db!.notes[0]!;
    expect(after.updatedAt).toBe(before.updatedAt);
    expect(after.changedAt).toBe(new Date(2026, 8, 15, 11).toISOString());
  });

  test('AC-99.2 deleting a note marks it, and Undo unmarks it', () => {
    const hook = renderHook(() => useDatabase());
    let id = '';
    act(() => {
      id = hook.result.current.actions.addNote('Bye')!;
    });
    act(() => hook.result.current.actions.removeNote(id));
    expect(hook.result.current.db!.deleted.map((d) => d.id)).toEqual([id]);
    act(() => hook.result.current.undo());
    expect(hook.result.current.db!.deleted).toEqual([]);
  });
});
```

(`src/test-setup.ts` fakes Date only, so `vi.setSystemTime` moves the clock; check it restores between tests, as AC-84 set it up.)

- [ ] **Step 2: Run** — expected FAIL: changedAt unchanged.

- [ ] **Step 3: Implement** in `src/state/useDatabase.ts`:

```ts
function commit(next: Database, adopt = false): boolean {
  // US-99. Dated here, once, rather than in every action. Data that came
  // from sync (US-101) is adopted as it is: its dates are the other device's.
  const stamped =
    adopt || !latest.current ? next : stamp(latest.current, next, now());
  if (!save(stamped)) {
    setStorageError(STORAGE_FULL);
    return false;
  }
  setStorageError('');
  latest.current = stamped;
  setDb(stamped);
  return true;
}
```

and `import { stamp } from '../domain/sync';`.

- [ ] **Step 4: Run** `npx vitest run src/state` — expected PASS. Then the whole unit suite: actions that return records built from scratch (`addItem`, `markDone`, `copyItem`, `recordToday`) now get `changedAt` from `stamp`; `itemFrom`, `addGoal`, `addCourse`, `addNote`, `addTask` must still type-check, so give them `changedAt: now().toISOString()` (stamp overwrites it anyway).

- [ ] **Step 5: Playwright** `e2e/us-99-change-tracking.spec.ts`

```ts
import { test, expect } from './clock';
import { add } from './helpers';

test('AC-99.2 a deleted item leaves a marker that survives a reload', async ({
  page,
}) => {
  await page.goto('/');
  await add(page, 'Rent');
  await page.getByRole('button', { name: 'Rent', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Rent', exact: true }).click();
  await page.reload();
  const db = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('personal-tracker/v1') ?? '{}'),
  );
  expect(db.version).toBe(11);
  expect(db.deleted).toHaveLength(1);
  expect(db.deleted[0].kind).toBe('items');
});
```

(Check the delete control's real name in `src/components/ItemRow.tsx` first; it may need confirming.)

- [ ] **Step 6: Run** `npx playwright test e2e/us-99-change-tracking.spec.ts` — PASS; then confirm it fails with `commit`'s stamping removed, and restore.

- [ ] **Step 7: Docs.** `CLAUDE.md`: version 11, "every record carries changedAt, set only by commit's stamp (US-99)". `docs/engineering/extending.md`, step 6: "changedAt is set by `stamp` in `commit`; a new action needs nothing, but must rebuild only the records it changes."

- [ ] **Step 8: Full checks** (typecheck, lint, format:check, test, Playwright local and UTC).

- [ ] **Step 9: Commit** — `US-99 date every write in commit (AC-99.1, 99.2)` and `US-99 story and docs`.

---

### Task 4: Import under sync, and a guard on `stamp` (council, 13 October)

**Files:** Modify `src/state/useDatabase.ts` (`replaceAll`, `merge`); test `src/state/useDatabase.test.ts`.

**Interfaces:** Consumes `commit(next, adopt)` (Task 3).

- [ ] **Step 1: Failing tests**

```ts
test("AC-99.6 Merge import keeps the file records' own changedAt", () => {
  const hook = renderHook(() => useDatabase());
  const file = {
    ...hook.result.current.db!,
    notes: [aNote('f', '2026-09-01T00:00:00.000Z')],
  };
  act(() => hook.result.current.actions.merge(file));
  expect(hook.result.current.db!.notes[0]!.changedAt).toBe(
    '2026-09-01T00:00:00.000Z',
  );
});

test('AC-99.6 Replace dates the file now and deletes nothing elsewhere', () => {
  const hook = renderHook(() => useDatabase());
  act(() => {
    hook.result.current.actions.addNote('Kept here');
  });
  const file = {
    ...hook.result.current.db!,
    notes: [aNote('f', '2026-09-01T00:00:00.000Z')],
  };
  act(() => hook.result.current.actions.replaceAll(file));
  expect(hook.result.current.db!.notes[0]!.changedAt).toBe(
    new Date(2026, 8, 15, 10).toISOString(),
  );
  expect(hook.result.current.db!.deleted).toEqual([]);
});

test('AC-99.7 a commit leaves untouched records with their time', () => {
  const hook = renderHook(() => useDatabase());
  act(() => {
    hook.result.current.actions.addNote('One');
  });
  const before = hook.result.current.db!.notes[0]!.changedAt;
  vi.setSystemTime(new Date(2026, 8, 15, 12));
  act(() => {
    hook.result.current.actions.addNote('Two');
  });
  expect(
    hook.result.current.db!.notes.find((n) => n.body === 'One')!.changedAt,
  ).toBe(before);
});
```

(`aNote(id, changedAt)` is a small local helper building a complete version-11 note.)

- [ ] **Step 2: Run** — the first two FAIL (stamp re-dates and marks).

- [ ] **Step 3: Implement.** `merge` commits `{ ...merged }` with `adopt = true`, so the file's times stand (held records keep theirs, being the same objects). `replaceAll(next)`:

```ts
replaceAll(next) {
  // AC-99.6. A restore brings the file back, dated now, and deletes nothing
  // the file never had: on the other device, those stay.
  const at = now().toISOString();
  const dated = { ...next, deleted: latest.current?.deleted ?? [] };
  for (const kind of COLLECTIONS) {
    (dated[kind] as { changedAt: string }[]) = (next[kind] as { changedAt: string }[]).map(
      (record) => ({ ...record, changedAt: at }),
    );
  }
  commit(dated, true);
  setUndoable(null);
},
```

- [ ] **Step 4: Run** — PASS. Commit: `US-99 import under sync: Merge keeps times, Replace deletes nothing (AC-99.6, 99.7)`.

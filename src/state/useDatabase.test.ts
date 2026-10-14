import { act, renderHook } from '@testing-library/react';
import { useDatabase } from './useDatabase';
import { EPOCH } from '../domain/dates';
import type { Lock, Sealed } from '../domain/types';

const OLD: Sealed = { iv: 'AAAAAAAAAAAAAAAA', data: 'b2xk' };
const NEW: Sealed = { iv: 'BBBBBBBBBBBBBBBB', data: 'bmV3' };
const LOCK: Lock = {
  salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
  check: OLD,
  changedAt: EPOCH,
};
const NEXT: Lock = {
  salt: 'BBBBBBBBBBBBBBBBBBBBBB==',
  check: NEW,
  changedAt: EPOCH,
};

/** US-99. A lock set during a test is dated by the commit, at the test's now. */
const NOW = new Date(2026, 8, 15, 10).toISOString();

beforeEach(() => localStorage.clear());

function withLockedNote() {
  const hook = renderHook(() => useDatabase());
  let id = '';
  act(() => {
    id = hook.result.current.actions.addNote('Bank details\nPIN')!;
  });
  act(() =>
    hook.result.current.actions.lockNote(id, 'Bank details', OLD, LOCK),
  );
  return { hook, id };
}

function stored() {
  return JSON.parse(localStorage.getItem('personal-tracker/v1')!) as {
    lock: Lock;
    notes: { sealed: Sealed; updatedAt: string }[];
  };
}

test('AC-86.3 the new lock and every resealed note are written together, edit times kept', () => {
  const { hook, id } = withLockedNote();
  const before = stored().notes[0]!.updatedAt;

  let saved = false;
  act(() => {
    saved = hook.result.current.actions.rekeyNotes(NEXT, [
      { id, was: OLD, sealed: NEW },
    ]);
  });

  expect(saved).toBe(true);
  expect(stored().lock).toEqual({ ...NEXT, changedAt: NOW });
  expect(stored().notes[0]).toMatchObject({ sealed: NEW, updatedAt: before });
});

test('AC-86.4 a note that changed while resealing stops the whole change', () => {
  const { hook, id } = withLockedNote();
  const snapshot = localStorage.getItem('personal-tracker/v1');

  let saved = true;
  act(() => {
    saved = hook.result.current.actions.rekeyNotes(NEXT, [
      // Read before an edit resealed it under a fresh IV.
      { id, was: { ...OLD, iv: 'CCCCCCCCCCCCCCCC' }, sealed: NEW },
    ]);
  });

  expect(saved).toBe(false);
  expect(localStorage.getItem('personal-tracker/v1')).toBe(snapshot);
});

test('AC-86.4 a note locked while resealing, and so missed, stops it too', () => {
  const { hook, id } = withLockedNote();
  let other = '';
  act(() => {
    other = hook.result.current.actions.addNote('Wifi')!;
  });
  act(() => hook.result.current.actions.lockNote(other, 'Wifi', OLD));

  let saved = true;
  act(() => {
    saved = hook.result.current.actions.rekeyNotes(NEXT, [
      { id, was: OLD, sealed: NEW },
    ]);
  });

  expect(saved).toBe(false);
  expect(stored().lock).toEqual({ ...LOCK, changedAt: NOW });
});

describe('US-94 merging a file with a lock', () => {
  const file = (notes: { id: string; sealed: Sealed | null }[]) => ({
    version: 11 as const,
    items: [],
    goals: [],
    courses: [],
    reflections: [],
    notes: notes.map(({ id, sealed }) => ({
      id,
      body: id,
      createdAt: '2026-09-14T17:00:00.000Z',
      updatedAt: '2026-09-14T17:00:00.000Z',
      changedAt: '2026-09-14T17:00:00.000Z',
      pinned: false,
      sealed,
    })),
    lastBackupAt: null,
    lock: LOCK,
    tasks: [],
    deleted: [],
  });

  test('AC-94.8 a file with no locked notes brings no lock', () => {
    const hook = renderHook(() => useDatabase());
    act(() =>
      hook.result.current.actions.merge(file([{ id: 'n', sealed: null }])),
    );
    expect(hook.result.current.db?.lock).toBeNull();
  });

  test('AC-94.8 a file bringing a locked note brings the lock that opens it', () => {
    const hook = renderHook(() => useDatabase());
    act(() =>
      hook.result.current.actions.merge(file([{ id: 'n', sealed: OLD }])),
    );
    expect(hook.result.current.db?.lock).toEqual(LOCK);
  });
});

test('AC-94.9 a save from another tab is taken up here, not written over', () => {
  const hook = renderHook(() => useDatabase());
  act(() => {
    hook.result.current.actions.addNote('Mine');
  });

  // Another tab writes its own copy, then the browser says so.
  const theirs = { ...stored(), notes: [] };
  act(() => {
    localStorage.setItem('personal-tracker/v1', JSON.stringify(theirs));
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'personal-tracker/v1' }),
    );
  });
  expect(hook.result.current.db?.notes).toEqual([]);

  // What this tab does next builds on theirs.
  act(() => {
    hook.result.current.actions.addNote('Next');
  });
  expect(stored().notes).toHaveLength(1);
});

describe('US-97 passcode edges', () => {
  test('AC-97.1 after the passcode changes, Undo does not bring back a locked note deleted before', () => {
    const { hook, id } = withLockedNote();
    act(() => hook.result.current.actions.removeNote(id));
    expect(hook.result.current.undoMessage).not.toBeNull();

    act(() => {
      hook.result.current.actions.rekeyNotes(NEXT, []);
    });
    act(() => hook.result.current.undo());

    expect(hook.result.current.undoMessage).toBeNull();
    expect(hook.result.current.db?.notes.some((note) => note.id === id)).toBe(
      false,
    );
  });

  test('AC-97.2 a first passcode from another window does not replace the one already set', () => {
    const { hook } = withLockedNote();
    let other = '';
    act(() => {
      other = hook.result.current.actions.addNote('Wifi\npassword')!;
    });

    // This window set up its own lock without knowing one now exists.
    let locked = true;
    act(() => {
      locked = hook.result.current.actions.lockNote(other, 'Wifi', NEW, NEXT);
    });

    expect(locked).toBe(false);
    expect(stored().lock).toEqual({ ...LOCK, changedAt: NOW });
    expect(
      hook.result.current.db?.notes.find((note) => note.id === other)?.sealed,
    ).toBeNull();
  });
});

describe('US-98', () => {
  test('AC-98.1 and AC-98.2 a goal is marked achieved, and back', () => {
    const hook = renderHook(() => useDatabase());
    act(() =>
      hook.result.current.actions.addGoal({
        name: 'AWS',
        description: '',
        targetAt: '2026-10-01T00:00:00.000Z',
      }),
    );
    const id = hook.result.current.db!.goals[0]!.id;

    act(() => hook.result.current.actions.setGoalAchieved(id, true));
    expect(hook.result.current.db!.goals[0]!.achievedAt).toBe(
      new Date(2026, 8, 15, 10).toISOString(),
    );

    act(() => hook.result.current.actions.setGoalAchieved(id, false));
    expect(hook.result.current.db!.goals[0]!.achievedAt).toBeNull();
  });

  const BEFORE = 'personal-tracker/before-upgrade';

  test('AC-98.4 locking a note deletes the copy kept before the last upgrade', () => {
    localStorage.setItem(BEFORE, '{"version":9,"notes":["readable"]}');
    withLockedNote();
    expect(localStorage.getItem(BEFORE)).toBeNull();
  });

  test('AC-98.4 changing the passcode deletes it too', () => {
    const { hook, id } = withLockedNote();
    localStorage.setItem(BEFORE, '{"version":9,"lock":"old"}');
    act(() => {
      hook.result.current.actions.rekeyNotes(NEXT, [
        { id, was: OLD, sealed: NEW },
      ]);
    });
    expect(localStorage.getItem(BEFORE)).toBeNull();
  });
});

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

  test('AC-99.1 a record an action did not touch keeps its date', () => {
    const hook = renderHook(() => useDatabase());
    let id = '';
    act(() => {
      hook.result.current.actions.addNote('Other');
      id = hook.result.current.actions.addNote('Pin me')!;
    });
    const other = hook.result.current.db!.notes[0]!;
    vi.setSystemTime(new Date(2026, 8, 15, 11));
    act(() => hook.result.current.actions.togglePin(id));
    expect(hook.result.current.db!.notes[0]!.changedAt).toBe(other.changedAt);
  });
});

describe('US-99 a stored version 10 database', () => {
  test('AC-99.4 AC-99.7 one action re-dates only that note; the lock stays at EPOCH', () => {
    const then = '2026-09-01T00:00:00.000Z';
    const note = (id: string) => ({
      id,
      body: id,
      createdAt: then,
      updatedAt: then,
      pinned: false,
      sealed: null,
    });
    localStorage.setItem(
      'personal-tracker/v1',
      JSON.stringify({
        version: 10,
        items: [],
        goals: [],
        courses: [],
        reflections: [],
        notes: [note('a'), note('b')],
        lastBackupAt: null,
        lock: { salt: LOCK.salt, check: LOCK.check },
        tasks: [],
      }),
    );
    const hook = renderHook(() => useDatabase());
    act(() => hook.result.current.actions.togglePin('a'));

    const { notes, lock, deleted } = hook.result.current.db!;
    expect(notes.find((n) => n.id === 'a')!.changedAt).toBe(NOW);
    expect(notes.find((n) => n.id === 'b')!.changedAt).toBe(then);
    expect(lock!.changedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(deleted).toEqual([]);
    expect(
      localStorage.getItem('personal-tracker/before-upgrade'),
    ).not.toBeNull();
  });
});

describe('US-99 import under sync', () => {
  const aNote = (id: string, changedAt: string) => ({
    id,
    body: id,
    createdAt: changedAt,
    updatedAt: changedAt,
    changedAt,
    pinned: false,
    sealed: null,
  });

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

  test('AC-99.6 Replace dates the file lock at import time', () => {
    const hook = renderHook(() => useDatabase());
    const file = { ...hook.result.current.db!, lock: LOCK };
    act(() => hook.result.current.actions.replaceAll(file));
    expect(hook.result.current.db!.lock!.changedAt).toBe(NOW);
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
});

describe('US-101 sync', () => {
  test('AC-101.2 synced data is adopted with its own dates, and Undo is kept', () => {
    const hook = renderHook(() => useDatabase());
    let gone = '';
    act(() => {
      hook.result.current.actions.addNote('Mine');
      gone = hook.result.current.actions.addNote('Gone')!;
    });
    // Only a delete leaves an Undo to keep; a plain add does not.
    act(() => hook.result.current.actions.removeNote(gone));
    const theirs = {
      ...hook.result.current.db!,
      notes: [
        {
          ...hook.result.current.db!.notes[0]!,
          body: 'Theirs',
          changedAt: '2026-09-15T18:00:00.000Z',
        },
      ],
    };
    act(() => {
      hook.result.current.actions.adoptSynced(theirs);
    });
    expect(hook.result.current.db!.notes[0]!.changedAt).toBe(
      '2026-09-15T18:00:00.000Z',
    );
    expect(hook.result.current.undoMessage).not.toBeNull();
  });

  test('AC-101.2 delete, sync, Undo', () => {
    const hook = renderHook(() => useDatabase());
    let a = '';
    let b = '';
    act(() => {
      a = hook.result.current.actions.addNote('A')!;
      b = hook.result.current.actions.addNote('B')!;
    });
    act(() => hook.result.current.actions.removeNote(a));
    expect(hook.result.current.db!.deleted).toEqual([
      expect.objectContaining({ kind: 'notes', id: a }),
    ]);

    // The other device still holds A's marker, lacks A, and has edited B later.
    const local = hook.result.current.db!;
    const shared = {
      ...local,
      notes: [
        {
          ...local.notes.find((note) => note.id === b)!,
          body: 'B, edited there',
          changedAt: '2026-09-15T18:00:00.000Z',
        },
      ],
      deleted: local.deleted,
    };
    act(() => {
      hook.result.current.actions.adoptSynced(shared);
    });
    expect(hook.result.current.undoMessage).not.toBeNull();

    act(() => hook.result.current.undo());
    expect(hook.result.current.db!.notes.map((note) => note.id).sort()).toEqual(
      [a, b].sort(),
    );
    expect(
      hook.result.current.db!.notes.find((note) => note.id === a),
    ).toMatchObject({ body: 'A' });
    expect(
      hook.result.current.db!.notes.find((note) => note.id === b),
    ).toMatchObject({
      body: 'B, edited there',
      changedAt: '2026-09-15T18:00:00.000Z',
    });
    expect(hook.result.current.db!.deleted).toEqual([]);
  });

  test('AC-101.2 a note deleted, then synced back edited, is in the list once after Undo', () => {
    const hook = renderHook(() => useDatabase());
    act(() => {
      hook.result.current.actions.addNote('A');
    });
    const before = hook.result.current.db!.notes[0]!;
    act(() => hook.result.current.actions.removeNote(before.id));

    // The other device edited A after the delete, so the sync brings it back.
    const local = hook.result.current.db!;
    const shared = {
      ...local,
      notes: [
        {
          ...before,
          body: 'A, edited there',
          changedAt: '2026-09-15T18:00:00.000Z',
        },
      ],
      deleted: local.deleted,
    };
    act(() => {
      hook.result.current.actions.adoptSynced(shared);
    });
    act(() => hook.result.current.undo());

    const held = hook.result.current.db!.notes.filter(
      (note) => note.id === before.id,
    );
    expect(held).toHaveLength(1);
    expect(held[0]!.body).toBe('A, edited there');
  });

  test('AC-101.2 an item deleted, then synced back edited, is in the list once after Undo', () => {
    const hook = renderHook(() => useDatabase());
    act(() => {
      hook.result.current.actions.addItem({
        title: 'Essay',
        dueAt: new Date(2026, 9, 3, 12).toISOString(),
        category: 'academic',
        priority: 'normal',
        repeat: 'none',
      });
    });
    const before = hook.result.current.db!.items[0]!;
    act(() => hook.result.current.actions.removeItem(before.id));

    const local = hook.result.current.db!;
    const shared = {
      ...local,
      items: [
        {
          ...before,
          title: 'Essay, edited there',
          changedAt: '2026-09-15T18:00:00.000Z',
        },
      ],
      deleted: local.deleted,
    };
    act(() => {
      hook.result.current.actions.adoptSynced(shared);
    });
    act(() => hook.result.current.undo());

    const held = hook.result.current.db!.items.filter(
      (item) => item.id === before.id,
    );
    expect(held).toHaveLength(1);
    expect(held[0]!.title).toBe('Essay, edited there');
  });

  test('AC-101.2 a delete fired before the re-render does not delete what a sync just brought', () => {
    const hook = renderHook(() => useDatabase());
    let a = '';
    act(() => {
      a = hook.result.current.actions.addNote('A')!;
    });
    const actions = hook.result.current.actions;
    const base = hook.result.current.db!;
    const synced = {
      ...base,
      notes: [
        ...base.notes,
        { ...base.notes[0]!, id: 'from-sync', body: 'Brought by sync' },
      ],
    };
    // Same act, so no render between: `actions` still holds the old render.
    act(() => {
      actions.adoptSynced(synced);
      actions.removeNote(a);
    });
    const db = hook.result.current.db!;
    expect(db.notes.map((n) => n.id)).toEqual(['from-sync']);
    expect(db.deleted.map((d) => d.id)).toEqual([a]);
  });
});

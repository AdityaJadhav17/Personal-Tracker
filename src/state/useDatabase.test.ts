import { act, renderHook } from '@testing-library/react';
import { useDatabase } from './useDatabase';
import type { Lock, Sealed } from '../domain/types';

const OLD: Sealed = { iv: 'AAAAAAAAAAAAAAAA', data: 'b2xk' };
const NEW: Sealed = { iv: 'BBBBBBBBBBBBBBBB', data: 'bmV3' };
const LOCK: Lock = { salt: 'AAAAAAAAAAAAAAAAAAAAAA==', check: OLD };
const NEXT: Lock = { salt: 'BBBBBBBBBBBBBBBBBBBBBB==', check: NEW };

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
  expect(stored().lock).toEqual(NEXT);
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
  expect(stored().lock).toEqual(LOCK);
});

describe('US-94 merging a file with a lock', () => {
  const file = (notes: { id: string; sealed: Sealed | null }[]) => ({
    version: 9 as const,
    items: [],
    goals: [],
    courses: [],
    reflections: [],
    notes: notes.map(({ id, sealed }) => ({
      id,
      body: id,
      createdAt: '2026-09-14T17:00:00.000Z',
      updatedAt: '2026-09-14T17:00:00.000Z',
      pinned: false,
      sealed,
    })),
    lastBackupAt: null,
    lock: LOCK,
    tasks: [],
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
    expect(stored().lock).toEqual(LOCK);
    expect(
      hook.result.current.db?.notes.find((note) => note.id === other)?.sealed,
    ).toBeNull();
  });
});

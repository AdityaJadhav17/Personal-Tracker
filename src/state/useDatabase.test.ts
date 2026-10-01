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

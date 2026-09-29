import { useEffect, useState } from 'react';
import { deleteCourse } from '../domain/courses';
import { dayOfMonth, nextOccurrence, now, toDateValue } from '../domain/dates';
import { deleteGoal } from '../domain/goals';
import { titleOf } from '../domain/notes';
import { recordReflection } from '../domain/reflections';
import type {
  Course,
  CourseDraft,
  Database,
  Goal,
  GoalDraft,
  Item,
  ItemDraft,
  Note,
  Reflection,
  Repeat,
} from '../domain/types';
import { load, save } from '../storage/db';

export interface DatabaseActions {
  /** False when storage refused it, so the form can keep what was typed. */
  addItem: (draft: ItemDraft) => boolean;
  /** US-26. One commit, because fifty addItem calls would all see one stale
      database and only the last would survive. */
  addItems: (drafts: ItemDraft[], courseId?: string | null) => void;
  markDone: (id: string) => void;
  setNote: (id: string, note: string) => void;
  /** US-25. Rename an item or move its deadline. */
  editItem: (id: string, title: string, dueAt: string, repeat: Repeat) => void;
  /** US-25. Gone for good; goal progress is derived, so it corrects itself.
      US-45: its steps go with it. */
  removeItem: (id: string) => void;
  /** AC-79.2. A new, open, one-off copy of an item, due at `dueAt`. */
  copyItem: (id: string, dueAt: string) => void;
  /** US-45. A dated step under an item, inheriting its course, goal and kind. */
  addStep: (parentId: string, title: string, dueAt: string) => void;
  setCourse: (id: string, courseId: string | null) => void;
  setGoal: (id: string, goalId: string | null) => void;
  addCourse: (draft: CourseDraft) => void;
  /** AC-77.2. New details for the same course: same id, so same items. */
  editCourse: (id: string, draft: CourseDraft) => void;
  removeCourse: (id: string) => void;
  addGoal: (draft: GoalDraft) => void;
  removeGoal: (id: string) => void;
  recordToday: (score: Reflection['score'], note: string) => void;
  /** AC-80.2. A note from its first text: its id, or null if not stored. */
  addNote: (body: string) => string | null;
  /** AC-80.3. Called per keystroke; the edit time moves with it. */
  editNote: (id: string, body: string) => void;
  /** AC-80.6. Gone, with Undo to bring it back. */
  removeNote: (id: string) => void;
  /** US-40. An export was just taken at this instant. */
  recordBackup: (at: string) => void;
  /** Import chose to replace. */
  replaceAll: (next: Database) => void;
  /** Import chose to keep both, in every collection. What we hold wins. */
  merge: (next: Database) => void;
}

/** A draft becomes an item: an id, a creation time, and nothing attached yet. */
function itemFrom(draft: ItemDraft): Item {
  return {
    id: crypto.randomUUID(),
    title: draft.title,
    dueAt: draft.dueAt,
    category: draft.category,
    priority: draft.priority,
    repeat: draft.repeat,
    status: 'open',
    note: '',
    createdAt: now().toISOString(),
    completedAt: null,
    goalId: null,
    courseId: draft.courseId ?? null,
    repeatDay: null,
    parentId: null,
  };
}

/** Said when the browser refuses a write, which the quota and a private window both do. */
const STORAGE_FULL =
  'That change could not be saved. This browser will not store any more, ' +
  'so nothing was changed. Export a backup, then remove some finished items.';

/** Everything in `held`, then whatever in `incoming` has a key not held. */
function keepBoth<T>(
  held: T[],
  incoming: T[],
  key: (record: T) => string,
): T[] {
  const keys = new Set(held.map(key));
  return [...held, ...incoming.filter((record) => !keys.has(key(record)))];
}

/** Undo is a plain letter, so it must not fire while you are typing. */
function isTyping(element: Element | null): boolean {
  if (!element) return false;
  // AC-80.3. A note's editor is an editable element, not a form field.
  if (element.closest('[contenteditable]')) return true;
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

/**
 * Everything that reads or writes the database, and nothing else.
 *
 * The line is whether a thing would still make sense with no browser at all.
 * Marking an item done would. Clicking a download anchor would not, so export
 * and the file input stay in the component.
 *
 * Undo lives here rather than in the component because it only exists as the
 * inverse of `markDone` and `removeItem`, and they drift if kept apart.
 */
export function useDatabase(): {
  /** Null only when storage itself cannot be read, which is AC-11.2. */
  db: Database | null;
  /** What Undo would reverse, "Marked Rent done." or "Deleted Rent." */
  undoMessage: string | null;
  /** AC-64.1. What u does, for the Undo button. */
  undo: () => void;
  /** Empty unless the last write was refused. */
  storageError: string;
  actions: DatabaseActions;
} {
  // A corrupt or absent key is not the null case: load() returns an empty
  // database for that. Null means the browser refused to hand over storage.
  const [db, setDb] = useState<Database | null>(() => {
    try {
      return load();
    } catch {
      return null;
    }
  });
  const [storageError, setStorageError] = useState('');
  /**
   * What the last done or delete did, so `u` can be its exact inverse. US-28
   * made finishing something able to create a second item, and undo that
   * only reopens the first would leave a duplicate behind. AC-67.3 added a
   * delete, whose inverse is putting back what went, steps included.
   */
  const [undoable, setUndoable] = useState<
    | { kind: 'done'; title: string; doneId: string; spawnedId: string | null }
    | { kind: 'deleted'; title: string; removed: Item[] }
    | { kind: 'copied'; title: string; copyId: string }
    | { kind: 'note'; title: string; note: Note }
    | null
  >(null);

  /**
   * Write first, then show. If storage refuses the write, the change is not
   * applied and the caller is told, because a screen that shows an item the
   * browser never stored is a lie that only surfaces on the next reload.
   */
  function commit(next: Database): boolean {
    if (!save(next)) {
      setStorageError(STORAGE_FULL);
      return false;
    }
    setStorageError('');
    setDb(next);
    return true;
  }

  /**
   * The one place that guards the null database. Every action goes through it,
   * so none of them repeats the check and none of them can forget it.
   */
  function update(change: (current: Database) => Database): boolean {
    if (!db) return false;
    return commit(change(db));
  }

  function mapItems(id: string, change: (item: Item) => Item) {
    update((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? change(item) : item,
      ),
    }));
  }

  /** AC-05.2, AC-64.1 and AC-67.3. The inverse of the last done or delete. */
  function undo() {
    if (!db || !undoable) return;

    if (undoable.kind === 'deleted') {
      commit({ ...db, items: [...db.items, ...undoable.removed] });
      setUndoable(null);
      return;
    }

    // AC-80.6. A deleted note goes back as it was, edit time included.
    if (undoable.kind === 'note') {
      commit({ ...db, notes: [...db.notes, undoable.note] });
      setUndoable(null);
      return;
    }

    // AC-79.3. A copy's inverse is simply to be gone again.
    if (undoable.kind === 'copied') {
      const { copyId } = undoable;
      commit({ ...db, items: db.items.filter((item) => item.id !== copyId) });
      setUndoable(null);
      return;
    }

    const { doneId, spawnedId } = undoable;
    commit({
      ...db,
      items: db.items
        // AC-28.4. The one it created goes with it.
        .filter((item) => item.id !== spawnedId)
        .map((item) =>
          item.id === doneId
            ? { ...item, status: 'open', completedAt: null }
            : item,
        ),
    });
    setUndoable(null);
  }

  // AC-05.2. Re-attached every render so it always closes over the current
  // database rather than a stale one.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'u') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(document.activeElement)) return;
      undo();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const actions: DatabaseActions = {
    addItem(draft) {
      const item = itemFrom(draft);
      return update((current) => ({
        ...current,
        items: [...current.items, item],
      }));
    },

    addItems(drafts, courseId = null) {
      // US-43 files a whole calendar under one course in the same commit.
      const items = drafts.map((draft) => ({ ...itemFrom(draft), courseId }));
      update((current) => ({
        ...current,
        items: [...current.items, ...items],
      }));
    },

    markDone(id) {
      update((current) => {
        const finished = current.items.find((item) => item.id === id);
        if (!finished) return current;

        const done = {
          ...finished,
          status: 'done' as const,
          completedAt: now().toISOString(),
        };

        // AC-28.1. The next one is created when the last is finished, rather
        // than a year of them up front: twelve rent rows would bury the list
        // and fill the calendar with work nobody has done.
        const next =
          finished.repeat === 'none'
            ? null
            : {
                ...finished,
                id: crypto.randomUUID(),
                dueAt: nextOccurrence(
                  finished.dueAt,
                  finished.repeat,
                  finished.repeatDay ?? undefined,
                ),
                // AC-40.6. Remember the day the series aims for, so a clamp
                // into a short month does not become the new normal.
                repeatDay:
                  finished.repeat === 'monthly'
                    ? (finished.repeatDay ?? dayOfMonth(finished.dueAt))
                    : null,
                status: 'open' as const,
                completedAt: null,
                createdAt: now().toISOString(),
              };

        setUndoable({
          kind: 'done',
          title: finished.title,
          doneId: id,
          spawnedId: next?.id ?? null,
        });

        const items = current.items.map((item) =>
          item.id === id ? done : item,
        );
        return { ...current, items: next ? [...items, next] : items };
      });
    },

    setNote(id, note) {
      mapItems(id, (item) => ({ ...item, note }));
    },

    editItem(id, title, dueAt, repeat) {
      mapItems(id, (item) => ({
        ...item,
        title,
        dueAt,
        repeat,
        // A deadline moved by hand sets a new day for the series to aim for.
        repeatDay: dueAt === item.dueAt ? item.repeatDay : null,
      }));
    },

    copyItem(id, dueAt) {
      if (!db) return;
      const source = db.items.find((item) => item.id === id);
      if (!source) return;
      // AC-79.2. Everything that says what it is, on a new day. Open, since
      // it is a new piece of work, and never repeating, or copying a weekly
      // item would start a second series. Its steps stay with the original.
      const copy: Item = {
        ...source,
        id: crypto.randomUUID(),
        dueAt,
        repeat: 'none',
        repeatDay: null,
        status: 'open',
        completedAt: null,
        createdAt: now().toISOString(),
      };
      if (!commit({ ...db, items: [...db.items, copy] })) return;
      setUndoable({ kind: 'copied', title: source.title, copyId: copy.id });
    },

    removeItem(id) {
      if (!db) return;
      // AC-45.4. A step without its project has nothing to be a step of.
      const goes = (item: Item) => item.id === id || item.parentId === id;
      const removed = db.items.filter(goes);
      const title = removed.find((item) => item.id === id)?.title;
      if (!title) return;
      if (!commit({ ...db, items: db.items.filter((item) => !goes(item)) })) {
        return;
      }
      // AC-67.3. No question first; putting it back is the way out instead.
      setUndoable({ kind: 'deleted', title, removed });
    },

    addStep(parentId, title, dueAt) {
      update((current) => {
        const parent = current.items.find((item) => item.id === parentId);
        if (!parent) return current;
        const step: Item = {
          ...itemFrom({
            title,
            dueAt,
            category: parent.category,
            priority: 'normal',
            repeat: 'none',
          }),
          // AC-45.2. Filters and goal progress count it without being told.
          courseId: parent.courseId,
          goalId: parent.goalId,
          parentId,
        };
        return { ...current, items: [...current.items, step] };
      });
    },

    setCourse(id, courseId) {
      mapItems(id, (item) => ({ ...item, courseId }));
    },

    setGoal(id, goalId) {
      mapItems(id, (item) => ({ ...item, goalId }));
    },

    addCourse(draft) {
      const course: Course = {
        id: crypto.randomUUID(),
        ...draft,
        createdAt: now().toISOString(),
      };
      update((current) => ({
        ...current,
        courses: [...current.courses, course],
      }));
    },

    editCourse(id, draft) {
      update((current) => ({
        ...current,
        courses: current.courses.map((course) =>
          course.id === id ? { ...course, ...draft } : course,
        ),
      }));
    },

    removeCourse(id) {
      update((current) => deleteCourse(current, id));
    },

    addGoal(draft) {
      const goal: Goal = {
        id: crypto.randomUUID(),
        ...draft,
        createdAt: now().toISOString(),
      };
      update((current) => ({ ...current, goals: [...current.goals, goal] }));
    },

    removeGoal(id) {
      update((current) => deleteGoal(current, id));
    },

    recordToday(score, note) {
      update((current) =>
        recordReflection(current, toDateValue(now()), score, note, now()),
      );
    },

    addNote(body) {
      const at = now().toISOString();
      const note: Note = {
        id: crypto.randomUUID(),
        body,
        createdAt: at,
        updatedAt: at,
      };
      const stored = update((current) => ({
        ...current,
        notes: [...current.notes, note],
      }));
      return stored ? note.id : null;
    },

    editNote(id, body) {
      update((current) => ({
        ...current,
        notes: current.notes.map((note) =>
          note.id === id
            ? { ...note, body, updatedAt: now().toISOString() }
            : note,
        ),
      }));
    },

    removeNote(id) {
      if (!db) return;
      const note = db.notes.find((one) => one.id === id);
      if (!note) return;
      if (!commit({ ...db, notes: db.notes.filter((one) => one !== note) })) {
        return;
      }
      setUndoable({ kind: 'note', title: titleOf(note.body), note });
    },

    recordBackup(at) {
      update((current) => ({ ...current, lastBackupAt: at }));
    },

    replaceAll(next) {
      update(() => next);
      setUndoable(null);
    },

    merge(next) {
      // Keep everything held, and add what the file has that is not. Dropping
      // what we already hold is what makes importing your own export twice a
      // no-op rather than a way to duplicate everything. Reflections are one
      // per day, so on a clash the one already here wins.
      update((current) => ({
        ...current,
        items: keepBoth(current.items, next.items, (item) => item.id),
        goals: keepBoth(current.goals, next.goals, (goal) => goal.id),
        courses: keepBoth(current.courses, next.courses, (c) => c.id),
        reflections: keepBoth(
          current.reflections,
          next.reflections,
          (r) => r.day,
        ),
        notes: keepBoth(current.notes, next.notes, (note) => note.id),
      }));
      setUndoable(null);
    },
  };

  return {
    db,
    storageError,
    undoMessage:
      undoable === null
        ? null
        : undoable.kind === 'done'
          ? `Marked ${undoable.title} done.`
          : undoable.kind === 'copied'
            ? `Copied ${undoable.title}.`
            : `Deleted ${undoable.title}.`,
    undo,
    actions,
  };
}

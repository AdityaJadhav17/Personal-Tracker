import { useEffect, useState } from 'react';
import { deleteCourse } from '../domain/courses';
import { dayOfMonth, nextOccurrence, now, toDateValue } from '../domain/dates';
import { deleteGoal } from '../domain/goals';
import { recordReflection } from '../domain/reflections';
import type {
  Course,
  CourseDraft,
  Database,
  Goal,
  GoalDraft,
  Item,
  ItemDraft,
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
  /** US-25. Gone for good; goal progress is derived, so it corrects itself. */
  removeItem: (id: string) => void;
  setCourse: (id: string, courseId: string | null) => void;
  setGoal: (id: string, goalId: string | null) => void;
  addCourse: (draft: CourseDraft) => void;
  removeCourse: (id: string) => void;
  addGoal: (draft: GoalDraft) => void;
  removeGoal: (id: string) => void;
  recordToday: (score: Reflection['score'], note: string) => void;
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
    courseId: null,
    repeatDay: null,
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
 * inverse of `markDone`, and the two drift if they are kept apart.
 */
export function useDatabase(): {
  /** Null only when storage itself cannot be read, which is AC-11.2. */
  db: Database | null;
  /** The item most recently finished, for the undo prompt. */
  undoableTitle: string | null;
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
  /**
   * What the last "done" did, so `u` can be its exact inverse. US-28 made
   * finishing something able to create a second item, and undo that only
   * reopens the first would leave a duplicate behind.
   */
  const [storageError, setStorageError] = useState('');
  const [undoable, setUndoable] = useState<{
    doneId: string;
    spawnedId: string | null;
  } | null>(null);

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

  // AC-05.2. The handler lives inside the effect so it always closes over the
  // current database rather than a stale one.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'u') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(document.activeElement)) return;
      if (!db || !undoable) return;

      commit({
        ...db,
        items: db.items
          // AC-28.4. The one it created goes with it.
          .filter((item) => item.id !== undoable.spawnedId)
          .map((item) =>
            item.id === undoable.doneId
              ? { ...item, status: 'open', completedAt: null }
              : item,
          ),
      });
      setUndoable(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [db, undoable]);

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

        setUndoable({ doneId: id, spawnedId: next?.id ?? null });

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

    removeItem(id) {
      update((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== id),
      }));
      // An item that no longer exists cannot be un-finished.
      setUndoable(null);
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
      }));
      setUndoable(null);
    },
  };

  return {
    db,
    storageError,
    undoableTitle:
      db?.items.find((item) => item.id === undoable?.doneId)?.title ?? null,
    actions,
  };
}

import { useEffect, useState } from 'react';
import { deleteCourse } from '../domain/courses';
import { now, toDateValue } from '../domain/dates';
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
} from '../domain/types';
import { load, save } from '../storage/db';

export interface DatabaseActions {
  addItem: (draft: ItemDraft) => void;
  markDone: (id: string) => void;
  setNote: (id: string, note: string) => void;
  /** US-25. Rename an item or move its deadline. */
  editItem: (id: string, title: string, dueAt: string) => void;
  /** US-25. Gone for good; goal progress is derived, so it corrects itself. */
  removeItem: (id: string) => void;
  setCourse: (id: string, courseId: string | null) => void;
  setGoal: (id: string, goalId: string | null) => void;
  addCourse: (draft: CourseDraft) => void;
  removeCourse: (id: string) => void;
  addGoal: (draft: GoalDraft) => void;
  removeGoal: (id: string) => void;
  recordToday: (score: Reflection['score'], note: string) => void;
  /** Import chose to replace. */
  replaceAll: (next: Database) => void;
  /** Import chose to keep both. Incoming ids we already hold are dropped. */
  merge: (next: Database) => void;
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
  const [undoable, setUndoable] = useState<string | null>(null);

  function commit(next: Database) {
    setDb(next);
    save(next);
  }

  /**
   * The one place that guards the null database. Every action goes through it,
   * so none of them repeats the check and none of them can forget it.
   */
  function update(change: (current: Database) => Database) {
    if (!db) return;
    commit(change(db));
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
        items: db.items.map((item) =>
          item.id === undoable
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
      const item: Item = {
        id: crypto.randomUUID(),
        title: draft.title,
        dueAt: draft.dueAt,
        category: draft.category,
        priority: draft.priority,
        status: 'open',
        note: '',
        createdAt: now().toISOString(),
        completedAt: null,
        goalId: null,
        courseId: null,
      };
      update((current) => ({ ...current, items: [...current.items, item] }));
    },

    markDone(id) {
      mapItems(id, (item) => ({
        ...item,
        status: 'done',
        completedAt: now().toISOString(),
      }));
      setUndoable(id);
    },

    setNote(id, note) {
      mapItems(id, (item) => ({ ...item, note }));
    },

    editItem(id, title, dueAt) {
      mapItems(id, (item) => ({ ...item, title, dueAt }));
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

    replaceAll(next) {
      update(() => next);
      setUndoable(null);
    },

    merge(next) {
      update((current) => {
        const existing = new Set(current.items.map((item) => item.id));
        return {
          ...next,
          items: [
            ...current.items,
            // Dropping ids we already hold is what makes importing your own
            // export twice a no-op rather than a way to duplicate everything.
            ...next.items.filter((item) => !existing.has(item.id)),
          ],
        };
      });
      setUndoable(null);
    },
  };

  return {
    db,
    undoableTitle:
      db?.items.find((item) => item.id === undoable)?.title ?? null,
    actions,
  };
}

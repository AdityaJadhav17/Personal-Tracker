import { useEffect, useRef, useState } from 'react';
import AddItemForm from './components/AddItemForm';
import Dashboard from './components/Dashboard';
import CourseList from './components/CourseList';
import EmptyState from './components/EmptyState';
import GoalList from './components/GoalList';
import ReflectionView from './components/ReflectionView';
import StatRow from './components/StatRow';
import ErrorState from './components/ErrorState';
import Shell from './components/Shell';
import type { View } from './components/Shell';
import { deleteCourse } from './domain/courses';
import { now, toDateValue } from './domain/dates';
import { deleteGoal } from './domain/goals';
import { recordReflection } from './domain/reflections';
import { exportFilename, parseImport, serialize } from './domain/transfer';
import type {
  Course,
  CourseDraft,
  Goal,
  GoalDraft,
  Reflection,
  Database,
  Item,
  ItemDraft,
} from './domain/types';
import { load, save } from './storage/db';

/** Undo is a plain letter, so it must not fire while you are typing. */
function isTyping(element: Element | null): boolean {
  if (!element) return false;
  return ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);
}

export default function App() {
  // null means storage itself could not be read, which is AC-11.2. A corrupt
  // or absent key is not this case: load() returns an empty database for that.
  const [db, setDb] = useState<Database | null>(() => {
    try {
      return load();
    } catch {
      return null;
    }
  });
  const [undoable, setUndoable] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<Database | null>(null);
  const [importError, setImportError] = useState('');
  // Which view is showing. No router: one piece of state, and a reload puts
  // you back on Home, which is the view you want on open. AC-13.4.
  const [view, setView] = useState<View>('home');
  const titleRef = useRef<HTMLInputElement>(null);

  function commit(next: Database) {
    setDb(next);
    save(next);
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

  if (db === null) {
    return (
      <Shell view={view} onNavigate={setView}>
        <ErrorState />
      </Shell>
    );
  }

  // Narrowed once here: a function declared below does not keep the narrowing
  // from the null check above, because it could be called at any time.
  const data: Database = db;

  function handleAdd(draft: ItemDraft) {
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

    commit({ ...data, items: [...data.items, item] });
  }

  function handleDone(id: string) {
    commit({
      ...data,
      items: data.items.map((item) =>
        item.id === id
          ? { ...item, status: 'done', completedAt: now().toISOString() }
          : item,
      ),
    });
    setUndoable(id);
  }

  function handleNoteChange(id: string, note: string) {
    commit({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, note } : item,
      ),
    });
  }

  function handleExport() {
    const blob = new Blob([serialize(data)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);

    // The anchor is appended before clicking because some browsers ignore a
    // click on an element that is not in the document.
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(now());
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function applyImport(next: Database) {
    commit(next);
    setPendingImport(null);
    setUndoable(null);
  }

  function mergeImport(next: Database) {
    const existing = new Set(data.items.map((item) => item.id));
    applyImport({
      ...next,
      items: [
        ...data.items,
        // Dropping ids we already hold is what makes importing your own
        // export twice a no-op rather than a way to duplicate everything.
        ...next.items.filter((item) => !existing.has(item.id)),
      ],
    });
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change.
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseImport(String(reader.result));
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setImportError('');
      // AC-10.4. Nothing is written while there is data that could be lost.
      if (data.items.length > 0) setPendingImport(result.db);
      else applyImport(result.db);
    };
    reader.onerror = () => setImportError('That file could not be read.');
    reader.readAsText(file);
  }

  function handleAddCourse(draft: CourseDraft) {
    const course: Course = {
      id: crypto.randomUUID(),
      ...draft,
      createdAt: now().toISOString(),
    };
    commit({ ...data, courses: [...data.courses, course] });
  }

  function handleDeleteCourse(id: string) {
    commit(deleteCourse(data, id));
  }

  function handleCourseChange(id: string, courseId: string | null) {
    commit({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, courseId } : item,
      ),
    });
  }

  function handleAddGoal(draft: GoalDraft) {
    const goal: Goal = {
      id: crypto.randomUUID(),
      ...draft,
      createdAt: now().toISOString(),
    };
    commit({ ...data, goals: [...data.goals, goal] });
  }

  function handleDeleteGoal(id: string) {
    commit(deleteGoal(data, id));
  }

  function handleGoalChange(id: string, goalId: string | null) {
    commit({
      ...data,
      items: data.items.map((item) =>
        item.id === id ? { ...item, goalId } : item,
      ),
    });
  }

  function handleRecordReflection(score: Reflection['score'], note: string) {
    commit(recordReflection(data, toDateValue(now()), score, note, now()));
  }

  const current = now();
  const undoableTitle = db.items.find((item) => item.id === undoable)?.title;

  // Based on open items rather than on the array being empty, so finishing
  // everything shows the empty state instead of a blank page.
  const hasOpen = db.items.some((item) => item.status === 'open');

  return (
    <Shell view={view} onNavigate={setView}>
      {view === 'reflections' ? (
        <ReflectionView
          today={toDateValue(current)}
          reflections={data.reflections}
          onRecord={handleRecordReflection}
        />
      ) : view === 'goals' ? (
        <GoalList
          goals={data.goals}
          items={data.items}
          onAdd={handleAddGoal}
          onDelete={handleDeleteGoal}
        />
      ) : view === 'courses' ? (
        <CourseList
          courses={data.courses}
          onAdd={handleAddCourse}
          onDelete={handleDeleteCourse}
        />
      ) : (
        <>
          <StatRow items={data.items} now={current} />

          <AddItemForm onAdd={handleAdd} titleRef={titleRef} />

          <p className="status" role="status">
            {undoableTitle
              ? `Marked ${undoableTitle} done. Press u to undo.`
              : ''}
          </p>

          {hasOpen ? (
            <Dashboard
              items={db.items}
              now={current}
              onDone={handleDone}
              onNoteChange={handleNoteChange}
              courses={data.courses}
              onCourseChange={handleCourseChange}
              goals={data.goals}
              onGoalChange={handleGoalChange}
            />
          ) : (
            <EmptyState onAddFirst={() => titleRef.current?.focus()} />
          )}
        </>
      )}

      {/*
        Export sits after the list so it stays out of the add-then-finish
        keyboard path, which is the one used every day.
      */}
      <div className="data">
        <button className="data__button" type="button" onClick={handleExport}>
          Export
        </button>

        <span className="data__import">
          <label htmlFor="import-file">Import</label>
          <input
            id="import-file"
            type="file"
            accept="application/json"
            onChange={handleImportFile}
          />
        </span>
      </div>

      {importError && (
        <p className="alert" role="alert">
          {importError}
        </p>
      )}

      {pendingImport && (
        <section className="prompt">
          <p>
            You already have {db.items.length} saved. Replace everything with
            the file, or keep both?
          </p>
          <div className="prompt__actions">
            <button
              className="prompt__button"
              type="button"
              onClick={() => applyImport(pendingImport)}
            >
              Replace
            </button>
            <button
              className="prompt__button"
              type="button"
              onClick={() => mergeImport(pendingImport)}
            >
              Merge
            </button>
            <button
              className="prompt__button prompt__button--quiet"
              type="button"
              onClick={() => setPendingImport(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </Shell>
  );
}

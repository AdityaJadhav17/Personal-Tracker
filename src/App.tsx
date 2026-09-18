import { useRef, useState } from 'react';
import AddItemForm from './components/AddItemForm';
import CalendarView from './components/CalendarView';
import CourseList from './components/CourseList';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import GoalList from './components/GoalList';
import ReflectionView from './components/ReflectionView';
import Shell from './components/Shell';
import type { View } from './components/Shell';
import StatRow from './components/StatRow';
import TrendsView from './components/TrendsView';
import { now, toDateValue } from './domain/dates';
import { calendarFilename, toCalendar } from './domain/ics';
import { exportFilename, parseImport, serialize } from './domain/transfer';
import { dailySeries } from './domain/trends';
import type { Database } from './domain/types';
import { useDatabase } from './state/useDatabase';

export default function App() {
  const { db, undoableTitle, actions } = useDatabase();

  // Which view is showing. No router: one piece of state, and a reload puts
  // you back on Home, which is the view you want on open. AC-13.4.
  const [view, setView] = useState<View>('home');
  // Import flow, which is about what is on screen rather than about the data.
  const [pendingImport, setPendingImport] = useState<Database | null>(null);
  const [importError, setImportError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

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

  /**
   * Hand the browser a file to save.
   *
   * The anchor is appended before clicking because some browsers ignore a
   * click on an element that is not in the document.
   */
  function download(text: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }));

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    download(serialize(data), exportFilename(now()), 'application/json');
  }

  /** US-24. The backup is for you; this one is for your phone. */
  function handleCalendarExport() {
    const at = now();
    download(toCalendar(data.items, at), calendarFilename(at), 'text/calendar');
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
      else actions.replaceAll(result.db);
    };
    reader.onerror = () => setImportError('That file could not be read.');
    reader.readAsText(file);
  }

  const current = now();

  // Based on open items rather than on the array being empty, so finishing
  // everything shows the empty state instead of a blank page.
  const hasOpen = db.items.some((item) => item.status === 'open');

  return (
    <Shell view={view} onNavigate={setView}>
      {view === 'calendar' ? (
        <CalendarView items={db.items} now={current} />
      ) : view === 'trends' ? (
        <TrendsView series={dailySeries(db.items, db.reflections)} />
      ) : view === 'reflections' ? (
        <ReflectionView
          today={toDateValue(current)}
          reflections={db.reflections}
          onRecord={actions.recordToday}
        />
      ) : view === 'goals' ? (
        <GoalList
          goals={db.goals}
          items={db.items}
          onAdd={actions.addGoal}
          onDelete={actions.removeGoal}
        />
      ) : view === 'courses' ? (
        <CourseList
          courses={db.courses}
          onAdd={actions.addCourse}
          onDelete={actions.removeCourse}
        />
      ) : (
        <>
          <StatRow items={db.items} now={current} />

          <AddItemForm onAdd={actions.addItem} titleRef={titleRef} />

          <p className="status" role="status">
            {undoableTitle
              ? `Marked ${undoableTitle} done. Press u to undo.`
              : ''}
          </p>

          {hasOpen ? (
            <Dashboard
              items={db.items}
              now={current}
              onDone={actions.markDone}
              onNoteChange={actions.setNote}
              courses={db.courses}
              onCourseChange={actions.setCourse}
              goals={db.goals}
              onGoalChange={actions.setGoal}
              onEdit={actions.editItem}
              onDelete={actions.removeItem}
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

        <button
          className="data__button"
          type="button"
          onClick={handleCalendarExport}
        >
          Export calendar
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
              onClick={() => {
                actions.replaceAll(pendingImport);
                setPendingImport(null);
              }}
            >
              Replace
            </button>
            <button
              className="prompt__button"
              type="button"
              onClick={() => {
                actions.merge(pendingImport);
                setPendingImport(null);
              }}
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

import { useRef, useState } from 'react';
import AddItemForm from './components/AddItemForm';
import BulkAdd from './components/BulkAdd';
import CalendarFileImport from './components/CalendarFileImport';
import CalendarView from './components/CalendarView';
import CategoryFilter from './components/CategoryFilter';
import type { Filter } from './components/CategoryFilter';
import CourseFilter from './components/CourseFilter';
import CourseList from './components/CourseList';
import Dashboard from './components/Dashboard';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import GoalList from './components/GoalList';
import ItemRow from './components/ItemRow';
import { stepsOf } from './domain/steps';
import ReflectionView from './components/ReflectionView';
import Shell from './components/Shell';
import type { View } from './components/Shell';
import StatRow from './components/StatRow';
import TrendsView from './components/TrendsView';
import { backupNotice } from './domain/backup';
import { now, toDateValue } from './domain/dates';
import { calendarFilename, toCalendar } from './domain/ics';
import { exportFilename, parseImport, serialize } from './domain/transfer';
import { dailySeries } from './domain/trends';
import type { Database } from './domain/types';
import { useDatabase } from './state/useDatabase';

export default function App() {
  const { db, undoableTitle, storageError, actions } = useDatabase();

  // Which view is showing. No router: one piece of state, and a reload puts
  // you back on Home, which is the view you want on open. AC-13.4.
  const [view, setView] = useState<View>('home');
  // Import flow, which is about what is on screen rather than about the data.
  const [pendingImport, setPendingImport] = useState<Database | null>(null);
  const [importError, setImportError] = useState('');
  // US-26. A term-start action, so it stays folded away until asked for.
  const [pasting, setPasting] = useState(false);
  // US-08. Not stored: AC-08.2 wants a reload to show everything again, and a
  // filter you forgot you set is a list that is lying to you.
  const [filter, setFilter] = useState<Filter>('all');
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
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

  /** AC-40.4. The file records its own export, and so does the app. */
  function handleExport() {
    const at = now();
    const stamp = at.toISOString();
    download(
      serialize({ ...data, lastBackupAt: stamp }),
      exportFilename(at),
      'application/json',
    );
    actions.recordBackup(stamp);
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
  const backup = backupNotice(db.lastBackupAt, db.items.length > 0, current);

  // Based on open items rather than on the array being empty, so finishing
  // everything shows the empty state instead of a blank page.
  const hasOpen = db.items.some((item) => item.status === 'open');

  // AC-27.7. deleteCourse clears the link on the items, so a filter still
  // pointing at a course that is gone would match nothing and show an empty
  // list naming something that no longer exists.
  const course = db.courses.find((one) => one.id === courseFilter) ?? null;

  const shown = db.items.filter(
    (item) =>
      (filter === 'all' || item.category === filter) &&
      (course === null || item.courseId === course.id),
  );

  // AC-08.3 and AC-27.6. There is work, the filters are just hiding all of it,
  // which is a different thing to say than "nothing due yet". The sentence is
  // composed so the category-only wording is unchanged from US-08.
  const hiddenByFilter = hasOpen && !shown.some((i) => i.status === 'open');
  const hiding = [
    'Nothing',
    filter === 'all' ? '' : filter,
    course ? `for ${course.name}` : '',
    'is open right now.',
  ]
    .filter((part) => part !== '')
    .join(' ');

  function showEverything() {
    setFilter('all');
    setCourseFilter(null);
  }

  return (
    <Shell view={view} onNavigate={setView} backupDue={backup !== null}>
      {view === 'calendar' ? (
        <CalendarView
          items={db.items}
          now={current}
          onMove={(item, dueAt) =>
            actions.editItem(item.id, item.title, dueAt, item.repeat)
          }
          goals={db.goals}
          onAdd={actions.addItem}
          renderDay={(dayItems) => (
            <ul className="group__list">
              {dayItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  now={current}
                  onDone={actions.markDone}
                  onNoteChange={actions.setNote}
                  courses={db.courses}
                  onCourseChange={actions.setCourse}
                  goals={db.goals}
                  onGoalChange={actions.setGoal}
                  onEdit={actions.editItem}
                  onDelete={actions.removeItem}
                  steps={stepsOf(item.id, db.items)}
                  parentTitle={
                    db.items.find((one) => one.id === item.parentId)?.title ??
                    null
                  }
                  onAddStep={actions.addStep}
                />
              ))}
            </ul>
          )}
        />
      ) : view === 'trends' ? (
        <TrendsView series={dailySeries(db.items, db.reflections)} />
      ) : view === 'reflections' ? (
        <>
          <h1 className="page-title">Reflections</h1>
          <ReflectionView
            today={toDateValue(current)}
            reflections={db.reflections}
            onRecord={actions.recordToday}
          />
        </>
      ) : view === 'goals' ? (
        <>
          <h1 className="page-title">Goals</h1>
          <GoalList
            goals={db.goals}
            items={db.items}
            onAdd={actions.addGoal}
            onDelete={actions.removeGoal}
          />
        </>
      ) : view === 'courses' ? (
        <>
          <h1 className="page-title">Courses</h1>
          <CourseList
            courses={db.courses}
            onAdd={actions.addCourse}
            onDelete={actions.removeCourse}
          />
        </>
      ) : view === 'data' ? (
        // US-58. Every tool that moves data in or out, in one place instead
        // of at the foot of every view. Each says what it is for, because
        // they are used a few times a term and not remembered in between.
        <>
          <h1 className="page-title">Data</h1>

          <section className="data" aria-labelledby="data-out">
            <h2 className="data__heading" id="data-out">
              Keep a copy
            </h2>
            {/* US-40. Beside Export, because that is what fixes it. */}
            {backup && <p className="data__backup">{backup}</p>}
            <div className="data__tool">
              <button
                className="data__button"
                type="button"
                onClick={handleExport}
              >
                Export
              </button>
              <p className="data__what">
                Everything, as a file you keep. Import brings it back, here or
                on another laptop.
              </p>
            </div>
            <div className="data__tool">
              <button
                className="data__button"
                type="button"
                onClick={handleCalendarExport}
              >
                Export calendar
              </button>
              <p className="data__what">
                Your open deadlines as an .ics for your phone, whose calendar
                then does the reminding.
              </p>
            </div>
          </section>

          <section className="data" aria-labelledby="data-in">
            <h2 className="data__heading" id="data-in">
              Bring things in
            </h2>
            <div className="data__tool">
              {/* The file input is the labelled control; the label is what
                  you see, dressed as a button. */}
              <label className="data__button data__file">
                Import
                <input
                  className="visually-hidden"
                  type="file"
                  accept="application/json"
                  onChange={handleImportFile}
                />
              </label>
              <p className="data__what">A file made by Export.</p>
            </div>
            <CalendarFileImport
              items={db.items}
              courses={db.courses}
              now={current}
              onAdd={actions.addItems}
            />
            <div className="data__tool">
              <button
                className="data__button"
                type="button"
                onClick={() => setPasting(!pasting)}
              >
                Paste a list
              </button>
              <p className="data__what">
                One line each: a date, an optional time, then the title.
              </p>
            </div>
            {pasting && (
              <BulkAdd
                onAdd={actions.addItems}
                onClose={() => setPasting(false)}
              />
            )}

            {importError && (
              <p className="alert" role="alert">
                {importError}
              </p>
            )}

            {pendingImport && (
              <section className="prompt">
                <p>
                  You already have {db.items.length} saved. Replace everything
                  with the file, or keep both?
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
          </section>
        </>
      ) : (
        <>
          <StatRow items={db.items} now={current} />

          {/*
            Above the form, not between it and the list: US-05 wants Tab to go
            from Add straight to the first item, and US-26 already broke that
            once by putting a control in between.
          */}
          <div className="filters">
            <CategoryFilter value={filter} onChange={setFilter} />
            <CourseFilter
              courses={db.courses}
              value={courseFilter}
              onChange={setCourseFilter}
            />
          </div>

          <AddItemForm
            onAdd={actions.addItem}
            titleRef={titleRef}
            quickFrom={toDateValue(current)}
          />

          {/* The region stays put so it is announced; the message inside is
              re-inserted per item so it enters (AC-48.2). */}
          <p className="status" role="status">
            {undoableTitle && (
              <span className="status__message" key={undoableTitle}>
                Marked {undoableTitle} done. Press u to undo.
              </span>
            )}
          </p>

          {hiddenByFilter ? (
            <section className="empty">
              <p>{hiding}</p>
              <button
                className="prompt__button"
                type="button"
                onClick={showEverything}
              >
                Show everything
              </button>
            </section>
          ) : hasOpen ? (
            <Dashboard
              items={shown}
              now={current}
              onDone={actions.markDone}
              onNoteChange={actions.setNote}
              courses={db.courses}
              onCourseChange={actions.setCourse}
              goals={db.goals}
              onGoalChange={actions.setGoal}
              onEdit={actions.editItem}
              onDelete={actions.removeItem}
              allItems={db.items}
              onAddStep={actions.addStep}
            />
          ) : (
            <EmptyState onAddFirst={() => titleRef.current?.focus()} />
          )}
        </>
      )}

      {storageError && (
        <p className="alert" role="alert">
          {storageError}
        </p>
      )}
    </Shell>
  );
}

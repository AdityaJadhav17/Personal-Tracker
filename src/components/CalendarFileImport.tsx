import { useState } from 'react';
import { formatDue } from '../domain/dates';
import { newOnly, parseCalendar } from '../domain/icsImport';
import type { Course, Item, ItemDraft } from '../domain/types';

interface CalendarFileImportProps {
  items: Item[];
  courses: Course[];
  now: Date;
  /** Nothing reaches this until the list has been seen and confirmed. */
  onAdd: (drafts: ItemDraft[], courseId: string | null) => void;
}

interface Pending {
  fresh: ItemDraft[];
  duplicates: number;
  past: number;
}

/**
 * US-43. Add deadlines from a calendar file, after seeing what they are.
 *
 * Canvas and some course sites hand out an `.ics` of every assignment. You
 * download it; this reads it on the device, shows what it found and what it
 * left out, and adds nothing until you press Add. The app itself still makes
 * no network request.
 */
export default function CalendarFileImport({
  items,
  courses,
  now,
  onAdd,
}: CalendarFileImportProps) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [courseId, setCourseId] = useState('');
  const [error, setError] = useState('');

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires a change.
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCalendar(String(reader.result), now);
      if (!result.ok) {
        setError(result.error);
        setPending(null);
        return;
      }
      setError('');
      setCourseId('');
      setPending({ ...newOnly(result.drafts, items), past: result.past });
    };
    reader.onerror = () => setError('That file could not be read.');
    reader.readAsText(file);
  }

  const leftOut = pending
    ? [
        pending.duplicates > 0 && `${pending.duplicates} already in your list`,
        pending.past > 0 && `${pending.past} already past`,
      ].filter(Boolean)
    : [];

  return (
    <>
      <span className="data__import">
        <label htmlFor="calendar-file">Add from calendar file</label>
        <input
          id="calendar-file"
          type="file"
          accept=".ics,text/calendar"
          onChange={handleFile}
        />
      </span>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {pending && (
        <section className="prompt" aria-labelledby="calendar-file-heading">
          <h2 className="prompt__title" id="calendar-file-heading">
            Deadlines from the file
          </h2>

          {pending.fresh.length > 0 ? (
            <ul className="prompt__list">
              {pending.fresh.map((draft) => (
                <li key={`${draft.title}-${draft.dueAt}`}>
                  {draft.title}, {formatDue(draft.dueAt)}
                  {draft.repeat !== 'none' && `, ${draft.repeat}`}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing new to add.</p>
          )}

          {leftOut.length > 0 && <p>{leftOut.join(' and ')} are left out.</p>}

          {pending.fresh.length > 0 && courses.length > 0 && (
            <select
              className="form__select"
              aria-label="Course for these"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">No course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          )}

          <div className="prompt__actions">
            {pending.fresh.length > 0 && (
              <button
                className="prompt__button"
                type="button"
                onClick={() => {
                  onAdd(pending.fresh, courseId === '' ? null : courseId);
                  setPending(null);
                }}
              >
                Add {pending.fresh.length}
              </button>
            )}
            <button
              className="prompt__button prompt__button--quiet"
              type="button"
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </>
  );
}

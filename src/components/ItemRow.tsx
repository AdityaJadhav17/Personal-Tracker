import { useState } from 'react';
import {
  formatDue,
  isUpcoming,
  toDateValue,
  toDueAt,
  toTimeValue,
} from '../domain/dates';
import type { Course, Goal, Item, Repeat } from '../domain/types';

/** Same words the add form uses, so there is one definition of the message. */
const TITLE_REQUIRED = 'Give it a title.';
const DUE_REQUIRED = 'Pick a date.';

interface ItemRowProps {
  item: Item;
  courses: Course[];
  goals: Goal[];
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
  onDone: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onCourseChange: (id: string, courseId: string | null) => void;
  onGoalChange: (id: string, goalId: string | null) => void;
  onEdit: (id: string, title: string, dueAt: string, repeat: Repeat) => void;
  onDelete: (id: string) => void;
}

/**
 * One item, readable closed and editable open.
 *
 * Closed, the row says what the thing is: what it is called, when it is due,
 * which course and goal it belongs to, and anything written about it. Open, it
 * adds the controls that change those. US-22: scanning the list should be
 * reading, not editing, and two dropdowns on every row made it editing.
 *
 * Done is deliberately outside the disclosure. US-05 says finishing something
 * takes no mouse and no detour, so Tab reaches it without opening anything.
 */
export default function ItemRow({
  item,
  courses,
  goals,
  now,
  onDone,
  onNoteChange,
  onCourseChange,
  onGoalChange,
  onEdit,
  onDelete,
}: ItemRowProps) {
  // The note is held locally while you type and reported on blur, so a save
  // does not run on every keystroke. See the storage note in docs/plan.md.
  const [note, setNote] = useState(item.note);
  const [open, setOpen] = useState(false);

  // US-25. The edit fields start from what the item already says, so opening
  // the row and saving without touching anything changes nothing.
  const due = new Date(item.dueAt);
  const [title, setTitle] = useState(item.title);
  const [dueDate, setDueDate] = useState(toDateValue(due));
  const [dueTime, setDueTime] = useState(toTimeValue(due));
  const [repeat, setRepeat] = useState<Repeat>(item.repeat);
  const [titleError, setTitleError] = useState('');
  const [dueError, setDueError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const course = courses.find((one) => one.id === item.courseId);
  const goal = goals.find((one) => one.id === item.goalId);

  function handleSave() {
    const trimmed = title.trim();
    const at = toDueAt(dueDate, dueTime);

    setTitleError(trimmed ? '' : TITLE_REQUIRED);
    setDueError(at ? '' : DUE_REQUIRED);
    // AC-25.3. Nothing is written while either half is unusable.
    if (!trimmed || !at) return;

    onEdit(item.id, trimmed, at, repeat);
  }

  return (
    // The priority modifier drives a coloured bar on the left edge. Position
    // in the sorted list is the primary signal; the bar only confirms it.
    <li className={`item item--${item.priority}`}>
      {/*
        The done control comes first so Tab walks the list in the order it is
        displayed. Its label carries the title, because "Done" on its own says
        nothing out of context.
      */}
      <button
        className="item__done"
        type="button"
        aria-label={`Mark ${item.title} done`}
        onClick={() => onDone(item.id)}
      >
        Done
      </button>{' '}
      {/*
        The title is the disclosure rather than a separate chevron, which would
        be one more thing on a row that already had too many.
      */}
      <button
        className="item__title"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {item.title}
      </button>{' '}
      <span className="item__due">{formatDue(item.dueAt)}</span>
      {isUpcoming(item.dueAt, now) && <span className="item__soon"> Soon</span>}
      <span className="item__tag">{item.category}</span>
      {/* A link it does not have costs no width and no tab stop. */}
      {course && <span className="item__chip">{course.name}</span>}
      {goal && <span className="item__chip item__chip--goal">{goal.name}</span>}
      {/* AC-28.6. A thing that comes back should say so where you read it. */}
      {item.repeat !== 'none' && (
        <span className="item__chip item__chip--repeat">
          {item.repeat === 'weekly' ? 'Weekly' : 'Monthly'}
        </span>
      )}
      {/*
        The note stays visible when the row is closed. Hiding something you
        wrote behind a click would trade one problem for a worse one.
      */}
      {!open && item.note !== '' && (
        <span className="item__written">{item.note}</span>
      )}
      {open && (
        <div className="item__edit">
          {/*
            The visible words are a span, not a <label htmlFor>, so each input
            has exactly one source for its accessible name: the aria-label,
            which carries the item's title and makes twenty open rows
            individually addressable. Sighted users still read "Title", and
            WCAG 2.5.3 holds because the accessible name contains that word.
          */}
          <div className="form__field form__field--title">
            <span className="form__label" aria-hidden="true">
              Title
            </span>
            <input
              className="form__input"
              id={`title-${item.id}`}
              aria-label={`Title for ${item.title}`}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              aria-describedby={
                titleError ? `title-error-${item.id}` : undefined
              }
            />
            {titleError && (
              <p className="form__error" id={`title-error-${item.id}`}>
                {titleError}
              </p>
            )}
          </div>

          <div className="form__field">
            <span className="form__label" aria-hidden="true">
              Due
            </span>
            <input
              className="form__input"
              id={`due-${item.id}`}
              type="date"
              aria-label={`Due for ${item.title}`}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              aria-describedby={dueError ? `due-error-${item.id}` : undefined}
            />
            {dueError && (
              <p className="form__error" id={`due-error-${item.id}`}>
                {dueError}
              </p>
            )}
          </div>

          <div className="form__field">
            <span className="form__label" aria-hidden="true">
              Time
            </span>
            <input
              className="form__input"
              id={`time-${item.id}`}
              type="time"
              aria-label={`Time for ${item.title}`}
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </div>

          {/*
            US-29. A feature that creates work on a schedule needs an off
            switch, and until this existed the off switch was deleting the item.
          */}
          <div className="form__field">
            <span className="form__label" aria-hidden="true">
              Repeat
            </span>
            <select
              className="form__input"
              id={`repeat-${item.id}`}
              aria-label={`Repeat for ${item.title}`}
              value={repeat}
              onChange={(event) => setRepeat(event.target.value as Repeat)}
            >
              <option value="none">Never</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/*
            Each select is only rendered once there is something to choose, so
            an empty one never joins the tab order.
          */}
          {courses.length > 0 && (
            <select
              className="item__course"
              aria-label={`Course for ${item.title}`}
              value={item.courseId ?? ''}
              onChange={(event) =>
                onCourseChange(item.id, event.target.value || null)
              }
            >
              <option value="">No course</option>
              {courses.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                </option>
              ))}
            </select>
          )}

          {goals.length > 0 && (
            <select
              className="item__course"
              aria-label={`Goal for ${item.title}`}
              value={item.goalId ?? ''}
              onChange={(event) =>
                onGoalChange(item.id, event.target.value || null)
              }
            >
              <option value="">No goal</option>
              {goals.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                </option>
              ))}
            </select>
          )}

          <textarea
            className="item__note"
            aria-label={`Note for ${item.title}`}
            placeholder="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => onNoteChange(item.id, note)}
          />

          <div className="item__actions">
            <button
              className="prompt__button"
              type="button"
              aria-label={`Save ${item.title}`}
              onClick={handleSave}
            >
              Save
            </button>
            {/*
              Delete lives inside the disclosure, so a row you are only reading
              never shows a control that destroys it.
            */}
            <button
              className="prompt__button prompt__button--quiet"
              type="button"
              aria-label={`Delete ${item.title}`}
              onClick={() => setConfirming(true)}
            >
              Delete
            </button>
          </div>

          {confirming && (
            <div className="item__confirm">
              {/*
                Blunter than the course and goal wording, which can promise the
                items survive. Nothing survives this one, so it says so.
              */}
              <p className="status" role="status">
                Delete {item.title}? It is gone for good.
              </p>
              <div className="prompt__actions">
                <button
                  className="prompt__button"
                  type="button"
                  onClick={() => onDelete(item.id)}
                >
                  Yes, delete
                </button>
                <button
                  className="prompt__button prompt__button--quiet"
                  type="button"
                  onClick={() => setConfirming(false)}
                >
                  Keep
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

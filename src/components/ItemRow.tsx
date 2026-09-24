import { useState } from 'react';
import {
  formatDue,
  groupOf,
  lateBy,
  moveToDay,
  toDateValue,
  timeOf,
  toDueAt,
  toTimeValue,
  tomorrowOf,
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
  /** US-45. This item's steps, in date order; empty for most items. */
  steps: Item[];
  /** US-45. The title of the item this is a step of, or null. */
  parentTitle: string | null;
  onAddStep: (parentId: string, title: string, dueAt: string) => void;
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
  steps,
  parentTitle,
  onAddStep,
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
  // US-45. The add-a-step form, held until Add step.
  const [stepTitle, setStepTitle] = useState('');
  const [stepDate, setStepDate] = useState('');
  const [stepError, setStepError] = useState('');
  const stepsDone = steps.filter((step) => step.status === 'done').length;

  function handleAddStep() {
    const trimmed = stepTitle.trim();
    const at = toDueAt(stepDate, '');
    if (!trimmed || !at) {
      setStepError('A step needs a title and a date.');
      return;
    }
    setStepError('');
    onAddStep(item.id, trimmed, at);
    setStepTitle('');
    setStepDate('');
  }

  // US-44. Dropping from the overdue list asks first, like Delete does.
  const [dropping, setDropping] = useState(false);
  const overdue = groupOf(item.dueAt, now) === 'overdue';

  const course = courses.find((one) => one.id === item.courseId);
  const goal = goals.find((one) => one.id === item.goalId);
  const time = timeOf(item.dueAt);

  // AC-57.6. What the item belongs to and anything written about it, on one
  // quiet line under the title. A link it does not have costs nothing.
  const meta = [
    course && (
      <span className="item__course-tag" key="course">
        {/* AC-57.8. Colour by the order courses were added, never cycled
            mid-list: the first course is always the first colour. */}
        <span
          className={`item__dot item__dot--${(courses.indexOf(course) % 4) + 1}`}
          aria-hidden="true"
        />
        {course.name}
      </span>
    ),
    goal && <span key="goal">{goal.name}</span>,
    // AC-28.6. A thing that comes back should say so where you read it.
    item.repeat !== 'none' && <span key="repeat">Repeats {item.repeat}</span>,
    // AC-45.2 and AC-45.3: where a step belongs, how a project is going.
    parentTitle && <span key="parent">Step of {parentTitle}</span>,
    steps.length > 0 && (
      <span key="steps">
        {stepsDone} of {steps.length} steps done
      </span>
    ),
    // The note stays visible when the row is closed. Hiding something you
    // wrote behind a click would trade one problem for a worse one.
    !open && item.note !== '' && (
      <span className="item__written" key="note">
        {item.note}
      </span>
    ),
  ].filter((part) => part !== false && part !== null && part !== undefined);

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
    // AC-57.7. The priority modifier makes a high item's title bold. Position
    // in the sorted list is the primary signal; the weight only confirms it.
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
      {/*
        AC-57.3 and AC-57.5. The day is the heading above, so a row says only
        what the day does not: how late it is, and a time unless it is the
        11:59pm a bare date means. No category tag and no Soon marker (US-12):
        the day column already says how close it is.
      */}
      {(overdue || time) && (
        <span className="item__due">
          {overdue && (
            <span className="item__late">{lateBy(item.dueAt, now)}</span>
          )}
          {time && <span>{time}</span>}
        </span>
      )}
      {meta.length > 0 && (
        <span className="item__meta">
          {meta.flatMap((part, index) =>
            index === 0
              ? [part]
              : [
                  <span className="item__sep" aria-hidden="true" key={index}>
                    ·
                  </span>,
                  part,
                ],
          )}
        </span>
      )}
      {/*
        US-44. An overdue item gets a decision, not a guilt trip: finish it,
        give it tomorrow, open it for another date, or drop it. Only the two
        that are not already on the row are added here.
      */}
      {overdue && (
        <span className="item__triage">
          <button
            className="data__button"
            type="button"
            aria-label={`Move ${item.title} to tomorrow`}
            onClick={() =>
              onEdit(
                item.id,
                item.title,
                moveToDay(item.dueAt, tomorrowOf(now)),
                item.repeat,
              )
            }
          >
            Tomorrow
          </button>
          <button
            className="data__button"
            type="button"
            aria-label={`Drop ${item.title}`}
            onClick={() => setDropping(true)}
          >
            Drop
          </button>
        </span>
      )}
      {dropping && (
        <div className="item__confirm">
          <p className="status" role="status">
            Drop {item.title}? It is gone for good.
          </p>
          <div className="prompt__actions">
            <button
              className="prompt__button"
              type="button"
              onClick={() => onDelete(item.id)}
            >
              Yes, drop it
            </button>
            <button
              className="prompt__button prompt__button--quiet"
              type="button"
              onClick={() => setDropping(false)}
            >
              Keep
            </button>
          </div>
        </div>
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

          {/*
            AC-45.1. Steps belong to a project, and only one level down: a
            step's own panel does not offer this.
          */}
          {item.parentId === null && (
            <div className="item__steps">
              <span className="form__label">Steps</span>
              {steps.length > 0 && (
                <ul className="item__step-list">
                  {steps.map((step) => (
                    <li key={step.id}>
                      {step.status === 'done' ? 'Done: ' : ''}
                      {step.title}, {formatDue(step.dueAt)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="item__step-add">
                <input
                  className="form__input"
                  aria-label={`New step for ${item.title}`}
                  placeholder="Next step"
                  value={stepTitle}
                  onChange={(e) => setStepTitle(e.target.value)}
                />
                <input
                  className="form__input"
                  type="date"
                  aria-label={`Step date for ${item.title}`}
                  value={stepDate}
                  onChange={(e) => setStepDate(e.target.value)}
                />
                <button
                  className="data__button"
                  type="button"
                  aria-label={`Add step to ${item.title}`}
                  onClick={handleAddStep}
                >
                  Add step
                </button>
              </div>
              {stepError && <p className="form__error">{stepError}</p>}
            </div>
          )}

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
                {steps.length === 0
                  ? `Delete ${item.title}? It is gone for good.`
                  : `Delete ${item.title} and its ${steps.length} ${
                      steps.length === 1 ? 'step' : 'steps'
                    }? They are gone for good.`}
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

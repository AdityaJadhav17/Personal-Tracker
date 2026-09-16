import { useState } from 'react';
import { formatDue, isUpcoming } from '../domain/dates';
import type { Course, Goal, Item } from '../domain/types';

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
}: ItemRowProps) {
  // The note is held locally while you type and reported on blur, so a save
  // does not run on every keystroke. See the storage note in docs/plan.md.
  const [note, setNote] = useState(item.note);
  const [open, setOpen] = useState(false);

  const course = courses.find((one) => one.id === item.courseId);
  const goal = goals.find((one) => one.id === item.goalId);

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
        </div>
      )}
    </li>
  );
}

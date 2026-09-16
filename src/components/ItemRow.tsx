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

  return (
    // The priority modifier drives a coloured bar on the left edge. Position
    // in the sorted list is the primary signal; the bar only confirms it.
    <li className={`item item--${item.priority}`}>
      {/*
        The done control comes first so Tab walks the list in the order it is
        displayed. Both labels carry the title, because "Done" and "Note" on
        their own say nothing out of context.
      */}
      <button
        className="item__done"
        type="button"
        aria-label={`Mark ${item.title} done`}
        onClick={() => onDone(item.id)}
      >
        Done
      </button>{' '}
      <span className="item__title">{item.title}</span>{' '}
      <span className="item__due">{formatDue(item.dueAt)}</span>
      {isUpcoming(item.dueAt, now) && <span className="item__soon"> Soon</span>}
      <span className="item__tag">{item.category}</span>
      {/*
        Only rendered once courses exist, so an empty select never joins the
        tab order for someone who does not use them.
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
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
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
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
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
    </li>
  );
}

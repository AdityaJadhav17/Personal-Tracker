import { groupOf } from '../domain/dates';
import type { Group } from '../domain/dates';
import { sortWithinGroup } from '../domain/ordering';
import type { Course, Goal, Item } from '../domain/types';
import ItemRow from './ItemRow';

/** Render order. Overdue sits above everything, which is AC-03.1. */
const GROUPS: { key: Group; heading: string }[] = [
  { key: 'overdue', heading: 'Overdue' },
  { key: 'today', heading: 'Today' },
  { key: 'week', heading: 'This week' },
  { key: 'later', heading: 'Later' },
];

interface DashboardProps {
  items: Item[];
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
  onDone: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  courses: Course[];
  onCourseChange: (id: string, courseId: string | null) => void;
  goals: Goal[];
  onGoalChange: (id: string, goalId: string | null) => void;
  onEdit: (id: string, title: string, dueAt: string) => void;
  onDelete: (id: string) => void;
}

export default function Dashboard({
  items,
  now,
  onDone,
  onNoteChange,
  courses,
  onCourseChange,
  goals,
  onGoalChange,
  onEdit,
  onDelete,
}: DashboardProps) {
  const open = items.filter((item) => item.status === 'open');

  return (
    <>
      {GROUPS.map(({ key, heading }) => {
        const inGroup = open.filter((item) => groupOf(item.dueAt, now) === key);
        if (inGroup.length === 0) return null;

        const ordered = sortWithinGroup(inGroup);

        return (
          <section className={`group group--${key}`} key={key}>
            <div className="group__head">
              <h2 className="group__title">{heading}</h2>
              {/*
                The count sits beside the heading rather than inside it, so the
                heading's accessible name and text stay exactly "Overdue".
                Hidden from assistive tech because a screen reader can count
                the list itself.
              */}
              <span className="group__count" aria-hidden="true">
                {ordered.length}
              </span>
            </div>
            <ul className="group__list">
              {ordered.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  now={now}
                  onDone={onDone}
                  onNoteChange={onNoteChange}
                  courses={courses}
                  onCourseChange={onCourseChange}
                  goals={goals}
                  onGoalChange={onGoalChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

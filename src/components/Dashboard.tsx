import { useState } from 'react';
import { groupOf } from '../domain/dates';
import type { Group } from '../domain/dates';
import { sortWithinGroup } from '../domain/ordering';
import { stepsOf } from '../domain/steps';
import type { Course, Goal, Item, Repeat } from '../domain/types';
import ItemRow from './ItemRow';

/** Render order. Overdue sits above everything, which is AC-03.1. */
const GROUPS: { key: Group; heading: string }[] = [
  { key: 'overdue', heading: 'Overdue' },
  { key: 'today', heading: 'Today' },
  { key: 'week', heading: 'This week' },
  { key: 'later', heading: 'Later' },
];

/**
 * AC-54.1. How many upcoming items Home shows before it starts counting. The
 * whole term at once was overwhelming; ten is about two weeks of a busy one.
 */
const UPCOMING = 10;

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
  onEdit: (id: string, title: string, dueAt: string, repeat: Repeat) => void;
  onDelete: (id: string) => void;
  /**
   * US-45. Every item, not only the filtered ones shown, so a step's parent
   * and a parent's steps are found even when a filter hides one of them.
   */
  allItems: Item[];
  onAddStep: (parentId: string, title: string, dueAt: string) => void;
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
  allItems,
  onAddStep,
}: DashboardProps) {
  const open = items.filter((item) => item.status === 'open');
  // AC-54.3. Not remembered, like the filters: a reload shows ten again.
  const [showAll, setShowAll] = useState(false);

  const grouped = GROUPS.map((group) => ({
    ...group,
    ordered: sortWithinGroup(
      open.filter((item) => groupOf(item.dueAt, now) === group.key),
    ),
  }));
  const upcoming = grouped
    .filter(({ key }) => key !== 'overdue')
    .reduce((total, { ordered }) => total + ordered.length, 0);

  // AC-54.2. Overdue is always whole and uses none of the ten: a missed
  // deadline hidden behind "more" is the pile US-44 exists to empty.
  let room = showAll ? upcoming : UPCOMING;
  const shown = grouped.map((group) => {
    if (group.key === 'overdue') return { ...group, rows: group.ordered };
    const rows = group.ordered.slice(0, room);
    room -= rows.length;
    return { ...group, rows };
  });

  return (
    <>
      {shown.map(({ key, heading, ordered, rows }) => {
        if (rows.length === 0) return null;

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
            {/* US-44. Each overdue row carries the choices; this names them. */}
            {key === 'overdue' && (
              <p className="group__hint">
                Decide each one: done, tomorrow, a new date, or drop it.
              </p>
            )}
            <ul className="group__list">
              {rows.map((item) => (
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
                  steps={stepsOf(item.id, allItems)}
                  parentTitle={
                    allItems.find((one) => one.id === item.parentId)?.title ??
                    null
                  }
                  onAddStep={onAddStep}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {upcoming > UPCOMING && (
        <p className="group__more">
          {showAll
            ? `Showing all ${upcoming} upcoming.`
            : `Showing ${UPCOMING} of ${upcoming} upcoming.`}{' '}
          <button
            className="prompt__button prompt__button--quiet"
            type="button"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show fewer' : `Show ${upcoming - UPCOMING} more`}
          </button>
        </p>
      )}
    </>
  );
}

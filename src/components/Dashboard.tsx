import { useState } from 'react';
import {
  dayLabel,
  groupOf,
  localDay,
  monthLabel,
  monthValue,
  toDateValue,
  tomorrowOf,
  weekdayOf,
} from '../domain/dates';
import type { Group } from '../domain/dates';
import { sortWithinGroup } from '../domain/ordering';
import { stepsOf } from '../domain/steps';
import type { Course, Goal, Item, Repeat } from '../domain/types';
import ItemRow from './ItemRow';

/**
 * Overdue first, which is AC-03.1, then the rest in time order. US-57 took
 * the headings off Today, This week and Later, but the buckets still decide
 * what is overdue and where the ten stop.
 */
const GROUPS: Group[] = ['overdue', 'today', 'week', 'later'];

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

/**
 * Home as a timeline, US-57: what needs a decision, then each day with what
 * is due on it, like a calendar's agenda. The date is a column on the left,
 * so "what is on Sunday" reads straight down instead of along every row.
 */
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

  const [overdue, ...ahead] = GROUPS.map((group) =>
    sortWithinGroup(open.filter((item) => groupOf(item.dueAt, now) === group)),
  );
  const coming = ahead.flat();
  // AC-54.2. Overdue is always whole and uses none of the ten: a missed
  // deadline hidden behind "more" is the pile US-44 exists to empty.
  const shown = showAll ? coming : coming.slice(0, UPCOMING);

  const days = new Map<string, Item[]>();
  for (const item of shown) {
    const day = localDay(item.dueAt);
    days.set(day, [...(days.get(day) ?? []), item]);
  }

  const today = toDateValue(now);
  const tomorrow = tomorrowOf(now);

  const row = (item: Item) => (
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
        allItems.find((one) => one.id === item.parentId)?.title ?? null
      }
      onAddStep={onAddStep}
    />
  );

  return (
    <>
      {overdue!.length > 0 && (
        <section className="overdue" aria-labelledby="overdue-title">
          <h2 className="overdue__title" id="overdue-title">
            Overdue
          </h2>
          <ul className="overdue__list">{overdue!.map(row)}</ul>
        </section>
      )}

      {days.size > 0 && (
        <ol className="days">
          {[...days].map(([day, rows], index, all) => {
            // AC-57.4. The month is named where it changes, including before
            // the first day when that is already next month.
            const month = day.slice(0, 7);
            const before =
              index === 0 ? monthValue(now) : all[index - 1]![0].slice(0, 7);
            return (
              <li className="day" key={day}>
                {month !== before && (
                  <p className="day__month" aria-hidden="true">
                    {monthLabel(month)}
                  </p>
                )}
                <div className="day__row">
                  {/* Read in full, seen as a number and a weekday. */}
                  <h2 className="day__label">
                    <span className="visually-hidden">{dayLabel(day)}</span>
                    <span className="day__number" aria-hidden="true">
                      {Number(day.slice(-2))}
                    </span>
                    <span className="day__weekday" aria-hidden="true">
                      {day === today
                        ? 'Today'
                        : day === tomorrow
                          ? 'Tomorrow'
                          : weekdayOf(day)}
                    </span>
                  </h2>
                  <ul className="day__items">{rows.map(row)}</ul>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {coming.length > UPCOMING && (
        <p className="group__more">
          {showAll
            ? `Showing all ${coming.length} upcoming.`
            : `Showing ${UPCOMING} of ${coming.length} upcoming.`}{' '}
          <button
            className="prompt__button prompt__button--quiet"
            type="button"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show fewer' : `Show ${coming.length - UPCOMING} more`}
          </button>
        </p>
      )}
    </>
  );
}

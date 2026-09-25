import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { HEAVY_WEEK, monthGrid, weekLoad } from '../domain/calendar';
import type { DayCell } from '../domain/calendar';
import {
  dayLabel,
  monthLabel,
  monthValue,
  moveToDay,
  shiftMonth,
  toDateValue,
} from '../domain/dates';
import type { Course, Goal, Item, ItemDraft } from '../domain/types';
import AddItemForm from './AddItemForm';

/** Sunday first, matching the date control the add form already uses. */
const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * How many titles a cell prints before it starts counting.
 *
 * Two is what fits in a seventh of the width without the titles shrinking to
 * the point of being unreadable. Past that the cell says how many more there
 * are, which is AC-21.4: a day never loses items silently.
 */
const SHOWN = 2;

interface CalendarViewProps {
  items: Item[];
  now: Date;
  /** US-39. An item was dropped on another day; `dueAt` is its new deadline. */
  onMove: (item: Item, dueAt: string) => void;
  /** AC-41.1. Shown on their target day. */
  goals: Goal[];
  /**
   * US-41. The open day's items, drawn the way the dashboard draws them, so
   * everything a row can do, including changing its date, works from here.
   */
  renderDay: (items: Item[]) => ReactNode;
  /** US-53. Adds to the open day. False when storage refused it. */
  onAdd: (draft: ItemDraft) => boolean;
  /** AC-60.4. In the order added, which is what picks each one's colour. */
  courses: Course[];
}

/**
 * The same items as the dashboard, laid out as a month.
 *
 * The dashboard answers "what do I do next" and cannot answer "what does
 * October look like", which is the question you ask while planning a term.
 * Nothing new is stored: this reads the items already there.
 *
 * One piece of state, the month on screen, and it starts on the current one
 * every time. That matches the sidebar, which also forgets where you were
 * after a reload, and it means opening the calendar never strands you in a
 * month you visited last week.
 */
export default function CalendarView({
  items,
  now,
  onMove,
  goals,
  renderDay,
  onAdd,
  courses,
}: CalendarViewProps) {
  const [month, setMonth] = useState(() => monthValue(now));
  // AC-39.3. There is no undo, so a drop that lands on the wrong day has to
  // at least be said out loud, to eyes and to screen readers alike.
  const [moved, setMoved] = useState('');
  // US-41. The open day, if any. US-53 made it a popover beside its cell, so
  // it closes when the month turns: its cell is no longer on screen.
  const [opened, setOpened] = useState<string | null>(null);
  const pop = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // AC-48.1. The day a dragged item would land on, lit while it is over it.
  // apple-design: feedback during a gesture, not only at its end.
  const [target, setTarget] = useState<string | null>(null);
  // Drag events fire on every child a pointer crosses, and Chrome leaves
  // relatedTarget empty on them, so leaving the grid is counted instead:
  // every enter is matched by a leave, and zero means the pointer is out.
  const inside = useRef(0);

  function clearTarget() {
    inside.current = 0;
    setTarget(null);
  }

  const today = toDateValue(now);
  const cells = monthGrid(month, items, goals);

  // AC-60.4. An item's bar takes its course's colour, the one Home and the
  // Courses view show; an item with no course keeps the accent.
  const hueOf = (item: Item) => {
    const index = courses.findIndex((one) => one.id === item.courseId);
    return index === -1 ? '' : `calendar__item--course-${(index % 4) + 1}`;
  };
  const openCell = cells.find((cell) => cell?.day === opened);

  function turn(by: number) {
    setOpened(null);
    setMonth(shiftMonth(month, by));
  }

  // AC-53.1. Native popover: the top layer, Escape and a click outside for
  // free, and CSS anchor positioning keeps it by its cell. React 18 does not
  // know the attribute, so it is set here. Focus goes to the title, so "click
  // a day, type, Enter" is the whole gesture, and comes back to what opened
  // it when the popover closes with nothing else chosen.
  useLayoutEffect(() => {
    const el = pop.current;
    if (!el) return;
    const opener = document.activeElement;
    el.setAttribute('popover', 'auto');
    el.showPopover();
    titleRef.current?.focus();

    const closed = (event: Event) => {
      if ((event as ToggleEvent).newState === 'closed') setOpened(null);
    };
    el.addEventListener('toggle', closed);
    return () => {
      el.removeEventListener('toggle', closed);
      const lost = document.activeElement;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        (lost === document.body || el.contains(lost))
      ) {
        opener.focus();
      }
    };
  }, [opened]);

  function drop(id: string, day: string) {
    clearTarget();
    const item = items.find((one) => one.id === id);
    if (!item) return;
    const dueAt = moveToDay(item.dueAt, day);
    // AC-39.4. Back where it started is not a move.
    if (dueAt === item.dueAt) return;
    onMove(item, dueAt);
    setMoved(`${item.title} moved to ${dayLabel(day)}`);
  }

  return (
    <section className="calendar">
      <div className="calendar__bar">
        <h1 className="page-title">{monthLabel(month)}</h1>

        <div className="calendar__moves">
          <button
            className="calendar__move"
            type="button"
            onClick={() => turn(-1)}
            // AC-39.6. Hovering here mid-drag turns the page, so an item can
            // be dropped in a month that was not on screen when it was picked up.
            onDragEnter={() => turn(-1)}
          >
            Previous month
          </button>
          <button
            className="calendar__move"
            type="button"
            onClick={() => turn(1)}
            onDragEnter={() => turn(1)}
          >
            Next month
          </button>
        </div>
      </div>

      {/* The region stays put so it is announced; the message inside is
          re-inserted per move so it enters (AC-48.2). */}
      <p className="calendar__moved" role="status">
        {moved && (
          <span className="status__message" key={moved}>
            {moved}
          </span>
        )}
      </p>

      <table
        className="calendar__grid"
        onDragEnter={() => {
          inside.current += 1;
        }}
        onDragLeave={() => {
          inside.current -= 1;
          if (inside.current <= 0) clearTarget();
        }}
      >
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th className="calendar__weekday" key={weekday} scope="col">
                <span aria-hidden="true">{weekday.slice(0, 3)}</span>
                <span className="visually-hidden">{weekday}</span>
              </th>
            ))}
            {/* AC-45.6. How much lands in each week, seen a month ahead. */}
            <th className="calendar__weekday" scope="col">
              <span aria-hidden="true">Load</span>
              <span className="visually-hidden">Deadlines that week</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {weeks(cells).map((week, index) => (
            // Weeks have no id of their own and never reorder, so their
            // position is a stable key.
            <tr key={index}>
              {week.map((cell, position) =>
                cell === null ? (
                  <td
                    className="calendar__cell calendar__cell--outside"
                    key={position}
                    role="presentation"
                  />
                ) : (
                  <Cell
                    cell={cell}
                    key={cell.day}
                    isToday={cell.day === today}
                    isOpen={cell.day === opened}
                    onDrop={drop}
                    onOpen={setOpened}
                    isTarget={cell.day === target}
                    onTarget={setTarget}
                    onDragEnd={clearTarget}
                    hueOf={hueOf}
                  />
                ),
              )}
              <LoadCell count={weekLoad(week)} />
            </tr>
          ))}
        </tbody>
      </table>

      {openCell && (
        <section
          className="calendar__day"
          ref={pop}
          role="dialog"
          aria-labelledby="calendar-day"
          // A new day is a new popover: its entrance runs again and the form
          // starts empty.
          key={openCell.day}
        >
          <div className="calendar__day-bar">
            <h3 className="calendar__day-title" id="calendar-day">
              {dayLabel(openCell.day)}
            </h3>
            <button
              className="calendar__move"
              type="button"
              onClick={() => setOpened(null)}
            >
              Close
            </button>
          </div>
          {openCell.goals.map((goal) => (
            <p className="calendar__day-goal" key={goal.id}>
              Goal: {goal.name}
            </p>
          ))}
          {openCell.items.length > 0 && renderDay(openCell.items)}
          {/* AC-52.7. A preview says why it cannot be ticked off yet. */}
          {openCell.repeats.map((item) => (
            <p className="calendar__day-repeat" key={item.id}>
              {item.title} repeats {item.repeat}. It joins your list when you
              finish the one before it.
            </p>
          ))}
          {openCell.items.length + openCell.repeats.length === 0 && (
            <p className="calendar__day-empty">Nothing due this day.</p>
          )}
          <AddItemForm onAdd={onAdd} titleRef={titleRef} day={openCell.day} />
        </section>
      )}
    </section>
  );
}

/**
 * AC-45.6. A week's count, in words, so "heavy" never rests on colour alone.
 */
function LoadCell({ count }: { count: number }) {
  const heavy = count >= HEAVY_WEEK;
  return (
    <td className={`calendar__load ${heavy ? 'calendar__load--heavy' : ''}`}>
      {count} due{heavy && ', heavy'}
    </td>
  );
}

/** Chunk the flat grid into rows of seven. */
function weeks(cells: (DayCell | null)[]): (DayCell | null)[][] {
  const rows: (DayCell | null)[][] = [];
  for (let start = 0; start < cells.length; start += WEEKDAYS.length) {
    rows.push(cells.slice(start, start + WEEKDAYS.length));
  }
  return rows;
}

function Cell({
  cell,
  isToday,
  isOpen,
  onDrop,
  onOpen,
  isTarget,
  onTarget,
  onDragEnd,
  hueOf,
}: {
  cell: DayCell;
  isToday: boolean;
  isOpen: boolean;
  onDrop: (id: string, day: string) => void;
  onOpen: (day: string) => void;
  isTarget: boolean;
  onTarget: (day: string) => void;
  onDragEnd: () => void;
  hueOf: (item: Item) => string;
}) {
  const shown = cell.items.slice(0, SHOWN);
  const repeats = cell.repeats.slice(0, SHOWN - shown.length);
  const extra = cell.items.length + cell.repeats.length - SHOWN;

  return (
    <td
      className={`calendar__cell ${isToday ? 'calendar__cell--today' : ''} ${
        isTarget ? 'calendar__cell--target' : ''
      } ${isOpen ? 'calendar__cell--open' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      // AC-53.1. Anywhere in the day opens it, the empty part included. The
      // date, items and "more" are buttons inside it, so a keyboard reaches
      // the same place and their clicks arrive here.
      onClick={() => onOpen(cell.day)}
      // A cell only accepts a drop if dragover is cancelled. It fires
      // continuously, and setting the same day again renders nothing.
      onDragOver={(event) => {
        event.preventDefault();
        onTarget(cell.day);
      }}
      // Entering fires before the first dragover, so the day lights up the
      // moment the pointer arrives, not on its next movement.
      onDragEnter={() => onTarget(cell.day)}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.getData('text/plain'), cell.day);
      }}
    >
      {/* The full date is read, the bare number is seen. Without it a screen
          reader announces "16" with nothing saying which month. US-41 made it
          the way into the day, including one with nothing due yet. */}
      <button className="calendar__date" type="button">
        <time dateTime={cell.day}>
          <span className="visually-hidden">Open {dayLabel(cell.day)}</span>
          <span aria-hidden="true">{cell.date}</span>
        </time>
      </button>

      {cell.goals.map((goal) => (
        <span className="calendar__goal" key={goal.id}>
          Goal: {goal.name}
        </span>
      ))}

      {shown.map((item) => (
        <button
          className={`calendar__item calendar__item--${item.priority} ${hueOf(item)}`}
          key={item.id}
          type="button"
          draggable
          onDragStart={(event) =>
            event.dataTransfer.setData('text/plain', item.id)
          }
          // A drag cancelled with Escape, or dropped outside the grid.
          onDragEnd={onDragEnd}
        >
          {item.title}
        </button>
      ))}

      {/* AC-52.6. Not draggable: moving a preview would move nothing. Move the
          real one and its repeats follow. */}
      {repeats.map((item) => (
        <button
          className={`calendar__item calendar__item--${item.priority} ${hueOf(item)} calendar__item--repeat`}
          key={item.id}
          type="button"
          // Starts with the visible title, so voice control still finds it.
          aria-label={`${item.title}, repeats ${item.repeat}`}
        >
          {item.title}
        </button>
      ))}

      {/* AC-41.2. A count you cannot open is a dead end. */}
      {extra > 0 && (
        <button className="calendar__more" type="button">
          {extra} more
        </button>
      )}
    </td>
  );
}

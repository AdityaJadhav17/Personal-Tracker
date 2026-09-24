import { useState } from 'react';
import { monthGrid } from '../domain/calendar';
import type { DayCell } from '../domain/calendar';
import {
  dayLabel,
  monthLabel,
  monthValue,
  moveToDay,
  shiftMonth,
  toDateValue,
} from '../domain/dates';
import type { Item } from '../domain/types';

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
}: CalendarViewProps) {
  const [month, setMonth] = useState(() => monthValue(now));
  // AC-39.3. There is no undo, so a drop that lands on the wrong day has to
  // at least be said out loud, to eyes and to screen readers alike.
  const [moved, setMoved] = useState('');

  const today = toDateValue(now);
  const cells = monthGrid(month, items);

  function drop(id: string, day: string) {
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
        <h2 className="calendar__title">{monthLabel(month)}</h2>

        <div className="calendar__moves">
          <button
            className="calendar__move"
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            // AC-39.6. Hovering here mid-drag turns the page, so an item can
            // be dropped in a month that was not on screen when it was picked up.
            onDragEnter={() => setMonth(shiftMonth(month, -1))}
          >
            Previous month
          </button>
          <button
            className="calendar__move"
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            onDragEnter={() => setMonth(shiftMonth(month, 1))}
          >
            Next month
          </button>
        </div>
      </div>

      <p className="calendar__moved" role="status">
        {moved}
      </p>

      <table className="calendar__grid">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th className="calendar__weekday" key={weekday} scope="col">
                <span aria-hidden="true">{weekday.slice(0, 3)}</span>
                <span className="visually-hidden">{weekday}</span>
              </th>
            ))}
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
                    onDrop={drop}
                  />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
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
  onDrop,
}: {
  cell: DayCell;
  isToday: boolean;
  onDrop: (id: string, day: string) => void;
}) {
  const extra = cell.items.length - SHOWN;

  return (
    <td
      className={`calendar__cell ${isToday ? 'calendar__cell--today' : ''}`}
      aria-current={isToday ? 'date' : undefined}
      // A cell only accepts a drop if dragover is cancelled.
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(event.dataTransfer.getData('text/plain'), cell.day);
      }}
    >
      {/* The full date is read, the bare number is seen. Without it a screen
          reader announces "16" with nothing saying which month. */}
      <time className="calendar__date" dateTime={cell.day}>
        <span className="visually-hidden">{dayLabel(cell.day)}</span>
        <span aria-hidden="true">{cell.date}</span>
      </time>

      {cell.items.slice(0, SHOWN).map((item) => (
        <span
          className={`calendar__item calendar__item--${item.priority}`}
          key={item.id}
          draggable
          onDragStart={(event) =>
            event.dataTransfer.setData('text/plain', item.id)
          }
        >
          {item.title}
        </span>
      ))}

      {extra > 0 && <span className="calendar__more">{extra} more</span>}
    </td>
  );
}

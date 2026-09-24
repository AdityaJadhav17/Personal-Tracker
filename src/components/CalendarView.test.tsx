import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarView from './CalendarView';
import type { Item } from '../domain/types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

let nextId = 0;

function dueOn(
  day: string,
  title: string,
  overrides: Partial<Item> = {},
): Item {
  nextId += 1;
  const [year, month, date] = day.split('-').map(Number);
  return {
    id: `item-${nextId}`,
    title,
    dueAt: new Date(year!, month! - 1, date!, 12).toISOString(),
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    repeat: 'none',
    ...overrides,
  };
}

/** The grid cell for a day, found by its accessible name. */
function cell(day: string) {
  return screen.getByRole('cell', { name: new RegExp(day, 'i') });
}

test('AC-21.1 an item shows in the cell for the day it is due', () => {
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'CSE 110 midterm')]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  expect(
    within(cell('September 16')).getByText('CSE 110 midterm'),
  ).toBeVisible();
});

test('AC-21.1 an item due another day is not in this day', () => {
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'Midterm')]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  expect(within(cell('September 17')).queryByText('Midterm')).toBeNull();
});

test('AC-21.2 today is marked as today', () => {
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  expect(cell('September 15')).toHaveAttribute('aria-current', 'date');
  expect(cell('September 16')).not.toHaveAttribute('aria-current');
});

test('AC-21.3 the calendar opens on the current month', () => {
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-21.3 moving to the next month shows that month and its items', async () => {
  const user = userEvent.setup();
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'Midterm'), dueOn('2026-10-01', 'Rent')]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  await user.click(screen.getByRole('button', { name: /next month/i }));

  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeVisible();
  expect(screen.getByText('Rent')).toBeVisible();
  expect(screen.queryByText('Midterm')).toBeNull();
});

test('AC-21.3 moving back returns to the month you came from', async () => {
  const user = userEvent.setup();
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  await user.click(screen.getByRole('button', { name: /next month/i }));
  await user.click(screen.getByRole('button', { name: /previous month/i }));

  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-21.2 today is only marked in the month it falls in', async () => {
  const user = userEvent.setup();
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  await user.click(screen.getByRole('button', { name: /next month/i }));

  expect(screen.queryByRole('cell', { current: 'date' })).toBeNull();
});

test('AC-21.4 a day with more items than fit says how many more', () => {
  render(
    <CalendarView
      items={[
        dueOn('2026-09-16', 'First'),
        dueOn('2026-09-16', 'Second'),
        dueOn('2026-09-16', 'Third'),
        dueOn('2026-09-16', 'Fourth'),
      ]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  expect(within(cell('September 16')).getByText('2 more')).toBeVisible();
});

test('AC-21.4 a day that fits says nothing about more', () => {
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'First'), dueOn('2026-09-16', 'Second')]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  expect(within(cell('September 16')).queryByText(/more/)).toBeNull();
});

test('AC-21.5 a month with nothing in it still draws the grid', () => {
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  expect(screen.getAllByRole('cell')).toHaveLength(30);
  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-21.6 a done item is not on the calendar', () => {
  render(
    <CalendarView
      items={[
        dueOn('2026-09-16', 'Finished', {
          status: 'done',
          completedAt: '2026-09-16T12:00:00.000Z',
        }),
      ]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  expect(screen.queryByText('Finished')).toBeNull();
});

test('the weekday headings name the columns', () => {
  render(<CalendarView items={[]} now={NOW} onMove={() => {}} />);

  expect(screen.getByRole('columnheader', { name: 'Sunday' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Saturday' })).toBeVisible();
});

/** Drag an item's title onto a day, the way a browser hands data across. */
function drag(title: string, day: string) {
  const data = new Map<string, string>();
  const dataTransfer = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
  };
  fireEvent.dragStart(screen.getByText(title), { dataTransfer });
  fireEvent.dragOver(cell(day), { dataTransfer });
  fireEvent.drop(cell(day), { dataTransfer });
}

test('AC-39.1 dropping an item on another day moves it there at the same time', () => {
  const onMove = vi.fn();
  const homework = dueOn('2026-09-16', 'CSE 123 HW 1');
  render(<CalendarView items={[homework]} now={NOW} onMove={onMove} />);

  drag('CSE 123 HW 1', 'September 18, 2026');

  expect(onMove).toHaveBeenCalledWith(
    homework,
    new Date(2026, 8, 18, 12).toISOString(),
  );
});

test('AC-39.3 a line says what moved and where it went', () => {
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'CSE 123 HW 1')]}
      now={NOW}
      onMove={() => {}}
    />,
  );

  drag('CSE 123 HW 1', 'September 18, 2026');

  expect(screen.getByRole('status')).toHaveTextContent(
    'CSE 123 HW 1 moved to September 18, 2026',
  );
});

test('AC-39.4 dropping an item back on its own day changes nothing', () => {
  const onMove = vi.fn();
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'CSE 123 HW 1')]}
      now={NOW}
      onMove={onMove}
    />,
  );

  drag('CSE 123 HW 1', 'September 16, 2026');

  expect(onMove).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('AC-39.6 dragging over Next month turns the page, and the drop lands there', () => {
  const onMove = vi.fn();
  const booking = dueOn('2026-09-25', 'MGT 18 Book midterm');
  render(<CalendarView items={[booking]} now={NOW} onMove={onMove} />);

  const data = new Map<string, string>();
  const dataTransfer = {
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
  };
  fireEvent.dragStart(screen.getByText('MGT 18 Book midterm'), {
    dataTransfer,
  });
  fireEvent.dragEnter(screen.getByRole('button', { name: 'Next month' }), {
    dataTransfer,
  });

  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeVisible();

  fireEvent.dragOver(cell('October 21, 2026'), { dataTransfer });
  fireEvent.drop(cell('October 21, 2026'), { dataTransfer });

  expect(onMove).toHaveBeenCalledWith(
    booking,
    new Date(2026, 9, 21, 12).toISOString(),
  );
});

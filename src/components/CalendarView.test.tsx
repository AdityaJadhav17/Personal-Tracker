import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarView from './CalendarView';
import type { Goal, Item, ItemDraft } from '../domain/types';

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
    parentId: null,
    repeat: 'none',
    ...overrides,
  };
}

/** What App hands in for an open day: the titles, as a list. */
function listTitles(items: Item[]) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  expect(within(cell('September 17')).queryByText('Midterm')).toBeNull();
});

test('AC-21.2 today is marked as today', () => {
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  expect(cell('September 15')).toHaveAttribute('aria-current', 'date');
  expect(cell('September 16')).not.toHaveAttribute('aria-current');
});

test('AC-21.3 the calendar opens on the current month', () => {
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-21.3 moving to the next month shows that month and its items', async () => {
  const user = userEvent.setup();
  render(
    <CalendarView
      items={[dueOn('2026-09-16', 'Midterm'), dueOn('2026-10-01', 'Rent')]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  await user.click(screen.getByRole('button', { name: /next month/i }));

  expect(screen.getByRole('heading', { name: 'October 2026' })).toBeVisible();
  expect(screen.getByText('Rent')).toBeVisible();
  expect(screen.queryByText('Midterm')).toBeNull();
});

test('AC-21.3 moving back returns to the month you came from', async () => {
  const user = userEvent.setup();
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  await user.click(screen.getByRole('button', { name: /next month/i }));
  await user.click(screen.getByRole('button', { name: /previous month/i }));

  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-21.2 today is only marked in the month it falls in', async () => {
  const user = userEvent.setup();
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  expect(within(cell('September 16')).queryByText(/more/)).toBeNull();
});

test('AC-21.5 a month with nothing in it still draws the grid', () => {
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  // Day cells only: AC-45.6 added a load cell to the end of each week.
  expect(screen.getAllByRole('cell', { name: /^Open / })).toHaveLength(30);
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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  expect(screen.queryByText('Finished')).toBeNull();
});

test('the weekday headings name the columns', () => {
  render(
    <CalendarView
      items={[]}
      now={NOW}
      onMove={() => {}}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

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
  render(
    <CalendarView
      items={[homework]}
      now={NOW}
      onMove={onMove}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
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
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

  drag('CSE 123 HW 1', 'September 16, 2026');

  expect(onMove).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('AC-39.6 dragging over Next month turns the page, and the drop lands there', () => {
  const onMove = vi.fn();
  const booking = dueOn('2026-09-25', 'MGT 18 Book midterm');
  render(
    <CalendarView
      items={[booking]}
      now={NOW}
      onMove={onMove}
      onAdd={() => true}
      courses={[]}
      goals={[]}
      renderDay={listTitles}
    />,
  );

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

function renderWith(
  items: Item[],
  goals: Goal[] = [],
  onAdd: (draft: ItemDraft) => boolean = () => true,
) {
  render(
    <CalendarView
      items={items}
      now={NOW}
      onMove={() => {}}
      onAdd={onAdd}
      courses={[]}
      goals={goals}
      renderDay={listTitles}
    />,
  );
}

test('AC-41.1 a goal shows on its target day, marked as a goal', () => {
  renderWith(
    [],
    [
      {
        id: 'g',
        name: 'AWS certification',
        description: '',
        targetAt: new Date(2026, 8, 20, 12).toISOString(),
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ],
  );

  expect(
    within(cell('September 20, 2026')).getByText('Goal: AWS certification'),
  ).toBeVisible();
});

test('AC-41.2 "more" opens the day and lists everything due on it', async () => {
  const user = userEvent.setup();
  renderWith([
    dueOn('2026-09-16', 'First'),
    dueOn('2026-09-16', 'Second'),
    dueOn('2026-09-16', 'Third'),
  ]);

  await user.click(screen.getByRole('button', { name: '1 more' }));

  const day = screen.getByRole('dialog', { name: 'September 16, 2026' });
  expect(within(day).getByText('Third')).toBeVisible();
  expect(within(day).getAllByRole('listitem')).toHaveLength(3);
});

test('AC-41.3 clicking an item opens its day', async () => {
  const user = userEvent.setup();
  renderWith([dueOn('2026-09-16', 'CSE 123 HW 1')]);

  await user.click(screen.getByRole('button', { name: 'CSE 123 HW 1' }));

  expect(
    within(
      screen.getByRole('dialog', { name: 'September 16, 2026' }),
    ).getByText('CSE 123 HW 1'),
  ).toBeVisible();
});

test('AC-41.4 the date opens an empty day too, and Close shuts it', async () => {
  const user = userEvent.setup();
  renderWith([]);

  await user.click(
    screen.getByRole('button', { name: 'Open September 17, 2026' }),
  );
  const day = screen.getByRole('dialog', { name: 'September 17, 2026' });
  expect(within(day).getByText('Nothing due this day.')).toBeVisible();

  await user.click(within(day).getByRole('button', { name: 'Close' }));
  expect(
    screen.queryByRole('dialog', { name: 'September 17, 2026' }),
  ).toBeNull();
});

test('AC-45.6 each week says how many deadlines fall in it', () => {
  renderWith([
    dueOn('2026-09-14', 'A'),
    dueOn('2026-09-16', 'B'),
    dueOn('2026-09-21', 'C'),
  ]);

  expect(screen.getByRole('cell', { name: '2 due' })).toBeVisible();
  expect(screen.getByRole('cell', { name: '1 due' })).toBeVisible();
});

test('AC-45.6 a week with six or more is marked heavy, in words', () => {
  renderWith(
    Array.from({ length: 6 }, (_, index) =>
      dueOn('2026-09-16', `Thing ${index}`),
    ),
  );

  expect(screen.getByRole('cell', { name: '6 due, heavy' })).toBeVisible();
});

test('AC-52.6 a later round of a repeating item shows as a repeat, and cannot be dragged', () => {
  renderWith([dueOn('2026-08-01', 'Rent', { repeat: 'monthly' })]);

  const repeat = within(cell('September 1,')).getByRole('button', {
    name: 'Rent, repeats monthly',
  });
  expect(repeat).not.toHaveAttribute('draggable', 'true');
  expect(screen.getAllByRole('cell', { name: '1 due' })).toHaveLength(1);
});

test('AC-52.7 opening its day says when it joins the list', async () => {
  const user = userEvent.setup();
  renderWith([dueOn('2026-08-01', 'Rent', { repeat: 'monthly' })]);

  await user.click(
    screen.getByRole('button', { name: 'Rent, repeats monthly' }),
  );

  const day = screen.getByRole('dialog', { name: 'September 1, 2026' });
  expect(
    within(day).getByText(
      'Rent repeats monthly. It joins your list when you finish the one before it.',
    ),
  ).toBeVisible();
  expect(within(day).queryByText('Nothing due this day.')).toBeNull();
});

describe('US-53 adding from the calendar', () => {
  test('AC-53.1 pressing an empty part of a day opens it, ready to type a title', async () => {
    const user = userEvent.setup();
    renderWith([]);

    await user.click(cell('September 17,'));

    expect(
      screen.getByRole('dialog', { name: 'September 17, 2026' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  test('AC-53.2 a title and Enter adds it on that day, due at the end of it', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(() => true);
    renderWith([], [], onAdd);

    await user.click(cell('September 17,'));
    await user.keyboard('Dentist{Enter}');

    expect(onAdd).toHaveBeenCalledWith({
      title: 'Dentist',
      dueAt: new Date(2026, 8, 17, 23, 59).toISOString(),
      category: 'academic',
      priority: 'normal',
      repeat: 'none',
    });
  });

  test('AC-53.3 time, category, priority and repeat work as they do on Home', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(() => true);
    renderWith([], [], onAdd);

    await user.click(cell('September 17,'));
    await user.type(screen.getByLabelText('Title'), 'Rent');
    fireEvent.change(screen.getByLabelText('Time'), {
      target: { value: '17:00' },
    });
    await user.selectOptions(screen.getByLabelText('Category'), 'personal');
    await user.selectOptions(screen.getByLabelText('Priority'), 'high');
    await user.selectOptions(screen.getByLabelText('Repeat'), 'monthly');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith({
      title: 'Rent',
      dueAt: new Date(2026, 8, 17, 17, 0).toISOString(),
      category: 'personal',
      priority: 'high',
      repeat: 'monthly',
    });
  });

  test('AC-53.4 the day is the date, so there is no date field', async () => {
    const user = userEvent.setup();
    renderWith([]);

    await user.click(cell('September 17,'));

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByLabelText('Due')).toBeNull();
  });

  test('AC-53.5 after adding, the title clears and keeps focus for the next one', async () => {
    const user = userEvent.setup();
    renderWith([]);

    await user.click(cell('September 17,'));
    await user.keyboard('Quiz 1{Enter}');

    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  test('AC-53.6 turning the month closes the open day', async () => {
    const user = userEvent.setup();
    renderWith([]);

    await user.click(cell('September 17,'));
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

test('AC-63.1 Today brings back the current month from anywhere', async () => {
  const user = userEvent.setup();
  renderWith([]);
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  expect(screen.getByRole('heading', { name: 'November 2026' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Today' }));

  expect(screen.getByRole('heading', { name: 'September 2026' })).toBeVisible();
});

test('AC-63.3 a week with nothing due shows no count', () => {
  renderWith([dueOn('2026-09-16', 'A')]);

  expect(screen.getByRole('cell', { name: '1 due' })).toBeVisible();
  expect(screen.queryByRole('cell', { name: '0 due' })).toBeNull();
});

test('AC-68.1 the days either side of the month show their dates', () => {
  renderWith([]);

  // September has no 31st: this one is August's, in the padding.
  expect(screen.getByText('31')).toBeInTheDocument();
  // September 1 and October 1.
  expect(screen.getAllByText('1')).toHaveLength(2);
});

test('AC-68.2 a neighbouring day is not a cell you can open', () => {
  renderWith([]);

  expect(screen.queryByRole('cell', { name: /August 31/ })).toBeNull();
  expect(screen.queryByRole('button', { name: /August 31/ })).toBeNull();
});

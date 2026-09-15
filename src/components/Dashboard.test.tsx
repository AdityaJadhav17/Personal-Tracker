import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import type { Item } from '../domain/types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

const noop = () => {};

let nextId = 0;

/** An instant `days` from NOW at a given local hour. */
function hoursOn(days: number, hours: number): string {
  return new Date(2026, 8, 15 + days, hours, 0, 0, 0).toISOString();
}

function anItem(title: string, daysFromNow: number, rest: Partial<Item> = {}) {
  nextId += 1;
  const item: Item = {
    id: `item-${nextId}`,
    title,
    dueAt: new Date(2026, 8, 15 + daysFromNow, 12, 0, 0, 0).toISOString(),
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: NOW.toISOString(),
    completedAt: null,
    goalId: null,
    courseId: null,
    ...rest,
  };
  return item;
}

test('AC-02.1 items land in Overdue, Today, This week, and Later', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('Missed lab', -1),
        anItem('Quiz', 0),
        anItem('Project', 3),
        anItem('Finals', 21),
      ]}
    />,
  );

  for (const heading of ['Overdue', 'Today', 'This week', 'Later']) {
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  }

  const groupFor = (title: string) =>
    screen.getByText(title).closest('section')?.querySelector('h2')
      ?.textContent;

  expect(groupFor('Missed lab')).toBe('Overdue');
  expect(groupFor('Quiz')).toBe('Today');
  expect(groupFor('Project')).toBe('This week');
  expect(groupFor('Finals')).toBe('Later');
});

test('AC-02.2 a group with no items renders no heading', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Quiz', 0)]}
    />,
  );

  expect(screen.getByRole('heading', { name: 'Today' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Overdue' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'This week' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: 'Later' }),
  ).not.toBeInTheDocument();
});

test('AC-02.3 an item marked done is not shown in its group', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('Quiz', 0),
        anItem('Already handed in', 0, {
          status: 'done',
          completedAt: NOW.toISOString(),
        }),
      ]}
    />,
  );

  expect(screen.getByText('Quiz')).toBeVisible();
  expect(screen.queryByText('Already handed in')).not.toBeInTheDocument();
});

test('AC-02.3 a group whose only item is done renders no heading', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Handed in', 0, { status: 'done' })]}
    />,
  );

  expect(
    screen.queryByRole('heading', { name: 'Today' }),
  ).not.toBeInTheDocument();
});

test('AC-02.1 Overdue is rendered above Today', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Quiz', 0), anItem('Missed lab', -1)]}
    />,
  );

  const headings = screen
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent);
  expect(headings).toEqual(['Overdue', 'Today']);
});

test('each item shows its due date', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Quiz', 0)]}
    />,
  );
  expect(screen.getByText('Sep 15, 12:00 PM')).toBeVisible();
});

test('AC-03.1 an overdue open item appears in Overdue, above Today', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Quiz today', 0), anItem('Missed lab', -1)]}
    />,
  );

  const sections = screen.getAllByRole('heading', { level: 2 });
  expect(sections.map((h) => h.textContent)).toEqual(['Overdue', 'Today']);
  expect(
    screen.getByText('Missed lab').closest('section')?.querySelector('h2')
      ?.textContent,
  ).toBe('Overdue');
});

test('AC-03.2 with nothing overdue the Overdue group is not rendered', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Quiz today', 0)]}
    />,
  );

  expect(
    screen.queryByRole('heading', { name: 'Overdue' }),
  ).not.toBeInTheDocument();
});

test('AC-03.2 an overdue item that is done does not bring back the group', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Handed in late', -3, { status: 'done' })]}
    />,
  );

  expect(
    screen.queryByRole('heading', { name: 'Overdue' }),
  ).not.toBeInTheDocument();
});

test('AC-03.3 overdue items render most overdue first', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('one day late', -1),
        anItem('twelve days late', -12),
        anItem('five days late', -5),
      ]}
    />,
  );

  const rendered = screen
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '');

  expect(rendered[0]).toContain('twelve days late');
  expect(rendered[1]).toContain('five days late');
  expect(rendered[2]).toContain('one day late');
});

/**
 * Titles in render order, across every group. Reads the title element rather
 * than slicing textContent, which broke the moment a Done button was added
 * ahead of the text.
 */
function renderedTitles() {
  return screen
    .getAllByRole('listitem')
    .map((li) => li.querySelector('span')?.textContent ?? '');
}

test('AC-04.1 inside a group, high comes before normal before low', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('bb normal', 3, { priority: 'normal' }),
        anItem('cc low', 3, { priority: 'low' }),
        anItem('aa high', 3, { priority: 'high' }),
      ]}
    />,
  );

  expect(renderedTitles()).toEqual(['aa high', 'bb normal', 'cc low']);
});

test('AC-04.2 same priority and day, the 9am item is listed first', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('bb evening', 3, { dueAt: hoursOn(3, 17) }),
        anItem('aa morning', 3, { dueAt: hoursOn(3, 9) }),
      ]}
    />,
  );

  expect(renderedTitles()).toEqual(['aa morning', 'bb evening']);
});

test('AC-04.3 two items due at the same minute are both rendered', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('aa first', 3, { dueAt: hoursOn(3, 9) }),
        anItem('bb second', 3, { dueAt: hoursOn(3, 9) }),
      ]}
    />,
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(renderedTitles()).toEqual(['aa first', 'bb second']);
});

test('AC-04.4 grouping wins over priority', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('Laundry', 0, { priority: 'low' }),
        anItem('Midterm', 6, { priority: 'high' }),
      ]}
    />,
  );

  const groupFor = (title: string) =>
    screen.getByText(title).closest('section')?.querySelector('h2')
      ?.textContent;

  expect(groupFor('Laundry')).toBe('Today');
  expect(groupFor('Midterm')).toBe('This week');
});

test('AC-04.1 priority ordering applies inside Overdue too', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('bb twelve', -12, { priority: 'low' }),
        anItem('aa one', -1, { priority: 'high' }),
      ]}
    />,
  );

  expect(renderedTitles()).toEqual(['aa one', 'bb twelve']);
});

test('AC-05.1 every open item offers a done control naming that item', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Rent', 0), anItem('Midterm', 3)]}
    />,
  );

  expect(screen.getByRole('button', { name: 'Mark Rent done' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Mark Midterm done' }),
  ).toBeVisible();
});

test('AC-05.1 activating the control reports the item id', async () => {
  const user = userEvent.setup();
  const onDone = vi.fn<(id: string) => void>();
  const rent = anItem('Rent', 0);

  render(
    <Dashboard
      now={NOW}
      onDone={onDone}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[rent]}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  expect(onDone).toHaveBeenCalledWith(rent.id);
});

test('AC-05.3 the done controls follow the order the items are displayed', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('cc low', 3, { priority: 'low' }),
        anItem('aa high', 3, { priority: 'high' }),
        anItem('bb normal', 3, { priority: 'normal' }),
      ]}
    />,
  );

  const names = screen
    .getAllByRole('button')
    .map((b) => b.getAttribute('aria-label'));

  expect(names).toEqual([
    'Mark aa high done',
    'Mark bb normal done',
    'Mark cc low done',
  ]);
});

test('AC-06.1 each item offers a note field that names the item', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Rent', 0), anItem('Midterm', 3)]}
    />,
  );

  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toBeVisible();
  expect(
    screen.getByRole('textbox', { name: 'Note for Midterm' }),
  ).toBeVisible();
});

test('AC-06.1 an existing note is shown in the field', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Rent', 0, { note: 'Zelle, not Venmo' })]}
    />,
  );

  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toHaveValue(
    'Zelle, not Venmo',
  );
});

test('AC-06.1 the note is reported on blur, not on every keystroke', async () => {
  const user = userEvent.setup();
  const onNoteChange = vi.fn<(id: string, note: string) => void>();
  const rent = anItem('Rent', 0);

  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={onNoteChange}
      courses={[]}
      onCourseChange={noop}
      items={[rent]}
    />,
  );

  await user.type(
    screen.getByRole('textbox', { name: 'Note for Rent' }),
    'Zelle',
  );
  expect(onNoteChange).not.toHaveBeenCalled();

  await user.tab();
  expect(onNoteChange).toHaveBeenCalledTimes(1);
  expect(onNoteChange).toHaveBeenCalledWith(rent.id, 'Zelle');
});

test('AC-12.1 an item due in two days carries the upcoming marker', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Midterm', 2)]}
    />,
  );

  expect(screen.getByText('Soon')).toBeVisible();
});

test('AC-12.2 an item due in nine days carries no marker', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Finals', 9)]}
    />,
  );

  expect(screen.queryByText('Soon')).not.toBeInTheDocument();
});

test('AC-12.3 priority does not suppress the marker', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Laundry', 2, { priority: 'low' })]}
    />,
  );

  expect(screen.getByText('Soon')).toBeVisible();
});

test('AC-12.1 only the items inside the window are marked', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[
        anItem('Late thing', -2),
        anItem('Today thing', 0),
        anItem('Soon thing', 2),
        anItem('Far thing', 20),
      ]}
    />,
  );

  const markers = screen.getAllByText('Soon');
  expect(markers).toHaveLength(1);
  expect(markers[0]?.closest('li')).toHaveTextContent('Soon thing');
});

const CSE100 = {
  id: 'c1',
  name: 'CSE 100',
  meetingLocation: 'Center Hall 101',
  professorEmail: 'prof@ucsd.edu',
  officeHours: 'Tue 2-4pm',
  createdAt: NOW.toISOString(),
};

test('AC-07.2 an item shows which course it belongs to', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={noop}
      items={[anItem('Project', 3, { courseId: 'c1' })]}
    />,
  );

  expect(screen.getByLabelText('Course for Project')).toHaveValue('c1');
  expect(
    screen.getByRole('option', { name: 'CSE 100', selected: true }),
  ).toBeInTheDocument();
});

test('AC-07.2 an item with no course says so', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={noop}
      items={[anItem('Rent', 3)]}
    />,
  );

  expect(screen.getByLabelText('Course for Rent')).toHaveValue('');
});

test('AC-07.2 choosing a course reports the item and the course', async () => {
  const user = userEvent.setup();
  const onCourseChange = vi.fn<(id: string, courseId: string | null) => void>();
  const project = anItem('Project', 3);

  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={onCourseChange}
      items={[project]}
    />,
  );

  await user.selectOptions(screen.getByLabelText('Course for Project'), 'c1');

  expect(onCourseChange).toHaveBeenCalledWith(project.id, 'c1');
});

test('AC-07.2 clearing the course reports null, not an empty string', async () => {
  const user = userEvent.setup();
  const onCourseChange = vi.fn<(id: string, courseId: string | null) => void>();
  const project = anItem('Project', 3, { courseId: 'c1' });

  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={onCourseChange}
      items={[project]}
    />,
  );

  await user.selectOptions(screen.getByLabelText('Course for Project'), '');

  expect(onCourseChange).toHaveBeenCalledWith(project.id, null);
});

test('AC-07.2 with no courses recorded, the item offers no course control', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      items={[anItem('Rent', 3)]}
    />,
  );

  expect(screen.queryByLabelText('Course for Rent')).not.toBeInTheDocument();
});

import { fireEvent, render, screen } from '@testing-library/react';
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
    repeatDay: null,
    repeat: 'none',
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
 * Titles in render order, across every group.
 *
 * Found by role: the title is the only control on a row that reports whether
 * it is expanded, so this survives anything being added around it. Reading the
 * first span broke the moment US-22 made the title a button.
 */
function renderedTitles() {
  return screen
    .getAllByRole('button', { expanded: false })
    .map((button) => button.textContent ?? '');
}

test('AC-04.1 inside a group, high comes before normal before low', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[
        anItem('cc low', 3, { priority: 'low' }),
        anItem('aa high', 3, { priority: 'high' }),
        anItem('bb normal', 3, { priority: 'normal' }),
      ]}
    />,
  );

  // Named rather than "every button", because US-22 made the title a button
  // too and this test is about the done controls.
  const names = screen
    .getAllByRole('button', { name: /^Mark / })
    .map((b) => b.getAttribute('aria-label'));

  expect(names).toEqual([
    'Mark aa high done',
    'Mark bb normal done',
    'Mark cc low done',
  ]);
});

test('AC-06.1 each item offers a note field that names the item', async () => {
  const user = userEvent.setup();
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Rent', 0), anItem('Midterm', 3)]}
    />,
  );

  await openItem(user, 'Rent');
  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toBeVisible();

  await openItem(user, 'Midterm');
  expect(
    screen.getByRole('textbox', { name: 'Note for Midterm' }),
  ).toBeVisible();
});

test('AC-06.1 an existing note is shown in the field', async () => {
  const user = userEvent.setup();
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Rent', 0, { note: 'Zelle, not Venmo' })]}
    />,
  );

  // AC-22.7: a note you wrote is readable without opening anything.
  expect(screen.getByText('Zelle, not Venmo')).toBeVisible();

  await openItem(user, 'Rent');
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[rent]}
    />,
  );

  await openItem(user, 'Rent');
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
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

/**
 * Open an item's controls. US-22 put the selects and the note behind the
 * title, so anything that edits an item clicks it open first.
 */
async function openItem(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(
    screen.getByRole('button', { name: title, expanded: false }),
  );
}

test('AC-07.2 an item shows which course it belongs to', () => {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Project', 3, { courseId: 'c1' })]}
    />,
  );

  // US-22: closed, the row names the course rather than offering a control.
  expect(screen.getByText('CSE 100')).toBeVisible();
});

test('AC-07.2 an item with no course says so', async () => {
  const user = userEvent.setup();
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE100]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Rent', 3)]}
    />,
  );

  // Closed it says nothing, which is AC-22.2: no course means no empty control.
  expect(screen.queryByText('CSE 100')).toBeNull();

  await openItem(user, 'Rent');
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[project]}
    />,
  );

  await openItem(user, 'Project');
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[project]}
    />,
  );

  await openItem(user, 'Project');
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
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Rent', 3)]}
    />,
  );

  expect(screen.queryByLabelText('Course for Rent')).not.toBeInTheDocument();
});

/** A course and a goal to attach things to. */
const CSE110 = {
  id: 'course-1',
  name: 'CSE 110',
  meetingLocation: '',
  professorEmail: '',
  officeHours: '',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const GOAL = {
  id: 'goal-1',
  name: 'Finish the quarter strong',
  description: '',
  targetAt: '2026-12-11T07:59:00.000Z',
  createdAt: '2026-09-01T00:00:00.000Z',
};

/** A dashboard with one item, courses and goals available. */
function renderOne(
  rest: Partial<Item> = {},
  handlers: Partial<{
    onDone: (id: string) => void;
    onNoteChange: (id: string, note: string) => void;
    onCourseChange: (id: string, courseId: string | null) => void;
    onGoalChange: (id: string, goalId: string | null) => void;
  }> = {},
) {
  render(
    <Dashboard
      now={NOW}
      onDone={handlers.onDone ?? noop}
      onNoteChange={handlers.onNoteChange ?? noop}
      courses={[CSE110]}
      onCourseChange={handlers.onCourseChange ?? noop}
      goals={[GOAL]}
      onGoalChange={handlers.onGoalChange ?? noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Midterm', 1, rest)]}
    />,
  );
}

/** The title, which is also the control that opens the item. */
function title() {
  return screen.getByRole('button', { name: /^Midterm/ });
}

test('AC-22.1 an item shows the course it belongs to', () => {
  renderOne({ courseId: CSE110.id });

  expect(screen.getByText('CSE 110')).toBeVisible();
});

test('AC-22.1 an item shows the goal it belongs to', () => {
  renderOne({ goalId: GOAL.id });

  expect(screen.getByText('Finish the quarter strong')).toBeVisible();
});

test('AC-22.2 an item with no course shows no course, and no empty control', () => {
  renderOne();

  expect(screen.queryByText('CSE 110')).toBeNull();
  expect(screen.queryByText('No course')).toBeNull();
});

test('AC-22.3 a closed item shows no select and no note field', () => {
  renderOne({ courseId: CSE110.id });

  expect(screen.queryByLabelText('Course for Midterm')).toBeNull();
  expect(screen.queryByLabelText('Goal for Midterm')).toBeNull();
  expect(screen.queryByLabelText('Note for Midterm')).toBeNull();
});

test('AC-22.4 clicking the title reveals the two selects and the note', async () => {
  const user = userEvent.setup();
  renderOne();

  await user.click(title());

  expect(screen.getByLabelText('Course for Midterm')).toBeVisible();
  expect(screen.getByLabelText('Goal for Midterm')).toBeVisible();
  expect(screen.getByLabelText('Note for Midterm')).toBeVisible();
});

test('AC-22.5 clicking the title again hides them', async () => {
  const user = userEvent.setup();
  renderOne();

  await user.click(title());
  await user.click(title());

  expect(screen.queryByLabelText('Course for Midterm')).toBeNull();
});

test('AC-22.6 the title says whether the item is open', async () => {
  const user = userEvent.setup();
  renderOne();

  expect(title()).toHaveAttribute('aria-expanded', 'false');
  await user.click(title());
  expect(title()).toHaveAttribute('aria-expanded', 'true');
});

test('AC-22.7 a note that was written is still shown when the item is closed', () => {
  renderOne({ note: 'Chapters 4 to 7' });

  expect(screen.getByText('Chapters 4 to 7')).toBeVisible();
});

test('AC-22.7 an item with no note shows nothing where the note would be', () => {
  renderOne();

  expect(screen.queryByText('Chapters 4 to 7')).toBeNull();
});

test('AC-22.8 done is still reachable without opening anything', async () => {
  const user = userEvent.setup();
  const done: string[] = [];
  renderOne({}, { onDone: (id) => done.push(id) });

  await user.click(screen.getByRole('button', { name: 'Mark Midterm done' }));

  expect(done).toHaveLength(1);
});

test('AC-22.4 the course can still be changed once the item is open', async () => {
  const user = userEvent.setup();
  const changed: (string | null)[] = [];
  renderOne({}, { onCourseChange: (_id, courseId) => changed.push(courseId) });

  await user.click(title());
  await user.selectOptions(
    screen.getByLabelText('Course for Midterm'),
    CSE110.id,
  );

  expect(changed).toEqual([CSE110.id]);
});

test('AC-22.4 the note can still be written once the item is open', async () => {
  const user = userEvent.setup();
  const notes: string[] = [];
  renderOne({}, { onNoteChange: (_id, note) => notes.push(note) });

  await user.click(title());
  await user.type(screen.getByLabelText('Note for Midterm'), 'Bring a pencil');
  await user.tab();

  expect(notes).toEqual(['Bring a pencil']);
});

test('AC-22.3 opening one item does not open another', async () => {
  const user = userEvent.setup();
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[CSE110]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={noop}
      onDelete={noop}
      items={[anItem('Midterm', 1), anItem('Rent', 2)]}
    />,
  );

  await user.click(screen.getByRole('button', { name: /^Midterm/ }));

  expect(screen.getByLabelText('Course for Midterm')).toBeVisible();
  expect(screen.queryByLabelText('Course for Rent')).toBeNull();
});

/** Render one item with the edit and delete handlers wired. */
function renderEditable(
  rest: Partial<Item> = {},
  handlers: Partial<{
    onEdit: (
      id: string,
      title: string,
      dueAt: string,
      repeat: Item['repeat'],
    ) => void;
    onDelete: (id: string) => void;
  }> = {},
) {
  render(
    <Dashboard
      now={NOW}
      onDone={noop}
      onNoteChange={noop}
      courses={[]}
      onCourseChange={noop}
      goals={[]}
      onGoalChange={noop}
      onEdit={handlers.onEdit ?? noop}
      onDelete={handlers.onDelete ?? noop}
      items={[anItem('Midterm', 1, rest)]}
    />,
  );
}

test('AC-25.1 the title can be changed, and the new one is reported', async () => {
  const user = userEvent.setup();
  const edits: string[] = [];
  renderEditable({}, { onEdit: (_id, title) => edits.push(title) });

  await openItem(user, 'Midterm');
  const field = screen.getByLabelText('Title for Midterm');
  await user.clear(field);
  await user.type(field, 'CSE 110 midterm');
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(edits).toEqual(['CSE 110 midterm']);
});

test('AC-25.1 the edit form opens holding what the item already says', async () => {
  const user = userEvent.setup();
  renderEditable();

  await openItem(user, 'Midterm');

  expect(screen.getByLabelText('Title for Midterm')).toHaveValue('Midterm');
});

test('AC-25.2 the due date can be moved, and comes back as an instant', async () => {
  const user = userEvent.setup();
  const dues: string[] = [];
  renderEditable({}, { onEdit: (_id, _title, dueAt) => dues.push(dueAt) });

  await openItem(user, 'Midterm');
  fireEvent.change(screen.getByLabelText('Due for Midterm'), {
    target: { value: '2026-10-03' },
  });
  fireEvent.change(screen.getByLabelText('Time for Midterm'), {
    target: { value: '17:00' },
  });
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(dues).toHaveLength(1);
  const moved = new Date(dues[0]!);
  expect(moved.getFullYear()).toBe(2026);
  expect(moved.getMonth()).toBe(9);
  expect(moved.getDate()).toBe(3);
  expect(moved.getHours()).toBe(17);
});

test('AC-25.3 an empty title saves nothing and says why', async () => {
  const user = userEvent.setup();
  const edits: string[] = [];
  renderEditable({}, { onEdit: (_id, title) => edits.push(title) });

  await openItem(user, 'Midterm');
  await user.clear(screen.getByLabelText('Title for Midterm'));
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(edits).toEqual([]);
  expect(screen.getByText('Give it a title.')).toBeVisible();
});

test('AC-25.4 deleting asks first and removes nothing yet', async () => {
  const user = userEvent.setup();
  const deleted: string[] = [];
  renderEditable({}, { onDelete: (id) => deleted.push(id) });

  await openItem(user, 'Midterm');
  await user.click(screen.getByRole('button', { name: 'Delete Midterm' }));

  expect(
    screen.getByText('Delete Midterm? It is gone for good.'),
  ).toBeVisible();
  expect(deleted).toEqual([]);
});

test('AC-25.5 confirming reports the deletion', async () => {
  const user = userEvent.setup();
  const deleted: string[] = [];
  renderEditable({}, { onDelete: (id) => deleted.push(id) });

  await openItem(user, 'Midterm');
  await user.click(screen.getByRole('button', { name: 'Delete Midterm' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

  expect(deleted).toHaveLength(1);
});

test('AC-25.8 declining removes nothing', async () => {
  const user = userEvent.setup();
  const deleted: string[] = [];
  renderEditable({}, { onDelete: (id) => deleted.push(id) });

  await openItem(user, 'Midterm');
  await user.click(screen.getByRole('button', { name: 'Delete Midterm' }));
  await user.click(screen.getByRole('button', { name: 'Keep' }));

  expect(deleted).toEqual([]);
  expect(screen.queryByText(/gone for good/)).toBeNull();
});

test('AC-25.4 a closed row offers no delete, so it cannot be hit by accident', () => {
  renderEditable();

  expect(screen.queryByRole('button', { name: 'Delete Midterm' })).toBeNull();
});

test('AC-29.1 the repeat control opens showing what the item does', async () => {
  const user = userEvent.setup();
  renderEditable({ repeat: 'monthly' });

  await openItem(user, 'Midterm');

  expect(screen.getByLabelText('Repeat for Midterm')).toHaveValue('monthly');
});

test('AC-29.1 an item that does not repeat shows never', async () => {
  const user = userEvent.setup();
  renderEditable();

  await openItem(user, 'Midterm');

  expect(screen.getByLabelText('Repeat for Midterm')).toHaveValue('none');
});

test('AC-29.2 setting a repeat reports it with the rest of the edit', async () => {
  const user = userEvent.setup();
  const edits: string[] = [];
  renderEditable(
    {},
    { onEdit: (_id, _title, _dueAt, repeat) => edits.push(repeat) },
  );

  await openItem(user, 'Midterm');
  await user.selectOptions(
    screen.getByLabelText('Repeat for Midterm'),
    'monthly',
  );
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(edits).toEqual(['monthly']);
});

test('AC-29.3 clearing a repeat reports never', async () => {
  const user = userEvent.setup();
  const edits: string[] = [];
  renderEditable(
    { repeat: 'weekly' },
    { onEdit: (_id, _title, _dueAt, repeat) => edits.push(repeat) },
  );

  await openItem(user, 'Midterm');
  await user.selectOptions(screen.getByLabelText('Repeat for Midterm'), 'none');
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(edits).toEqual(['none']);
});

test('AC-29.6 changing only the repeat leaves the title and date alone', async () => {
  const user = userEvent.setup();
  const saved: { title: string; dueAt: string }[] = [];
  renderEditable(
    { repeat: 'none' },
    { onEdit: (_id, title, dueAt) => saved.push({ title, dueAt }) },
  );

  await openItem(user, 'Midterm');
  const before = screen.getByLabelText('Due for Midterm') as HTMLInputElement;
  const dueBefore = before.value;

  await user.selectOptions(
    screen.getByLabelText('Repeat for Midterm'),
    'weekly',
  );
  await user.click(screen.getByRole('button', { name: 'Save Midterm' }));

  expect(saved[0]?.title).toBe('Midterm');
  expect(saved[0]?.dueAt).toBe(anItem('Midterm', 1).dueAt);
  expect(dueBefore).not.toBe('');
});

import { fireEvent, render, screen, within } from '@testing-library/react';
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
    parentId: null,
    repeat: 'none',
    ...rest,
  };
  return item;
}

// US-57 replaced the Today, This week and Later headings with days.
test('AC-57.4 (was AC-02.1) items land in Overdue, or under the day they are due', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[
        anItem('Missed lab', -1),
        anItem('Quiz', 0),
        anItem('Project', 3),
        anItem('Finals', 21),
      ]}
    />,
  );

  expect(headingOver('Missed lab')).toHaveAccessibleName('Overdue');
  expect(headingOver('Quiz')).toHaveAccessibleName('September 15, 2026');
  expect(headingOver('Project')).toHaveAccessibleName('September 18, 2026');
  expect(headingOver('Finals')).toHaveAccessibleName('October 6, 2026');
});

test('AC-57.4 (was AC-02.2) only days with something due get a heading', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[anItem('Quiz', 0)]}
    />,
  );

  const headings = screen.getAllByRole('heading', { level: 2 });
  expect(headings).toHaveLength(1);
  expect(headings[0]).toHaveAccessibleName('September 15, 2026');
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
      allItems={[]}
      onAddStep={noop}
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

test('AC-02.3 a day whose only item is done gets no heading', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[anItem('Handed in', 0, { status: 'done' })]}
    />,
  );

  expect(screen.queryAllByRole('heading')).toHaveLength(0);
});

test('AC-02.1 Overdue is rendered above today', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[anItem('Quiz', 0), anItem('Missed lab', -1)]}
    />,
  );

  const headings = screen.getAllByRole('heading', { level: 2 });
  expect(headings[0]).toHaveAccessibleName('Overdue');
  expect(headings[1]).toHaveAccessibleName('September 15, 2026');
});

test('AC-57.5 each item shows its time, the day being its heading', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[anItem('Quiz', 0)]}
    />,
  );
  expect(screen.getByText('12:00 PM')).toBeVisible();
});

test('AC-03.1 an overdue open item appears in Overdue, above today', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[anItem('Quiz today', 0), anItem('Missed lab', -1)]}
    />,
  );

  const headings = screen.getAllByRole('heading', { level: 2 });
  expect(headings[0]).toHaveAccessibleName('Overdue');
  expect(headings[1]).toHaveAccessibleName('September 15, 2026');
  expect(headingOver('Missed lab')).toHaveAccessibleName('Overdue');
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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

/** US-57. The heading an item sits under: Overdue, or its day. */
function headingOver(title: string) {
  const holder = screen
    .getByText(title)
    .closest<HTMLElement>('section, ol > li')!;
  return within(holder).getAllByRole('heading', { level: 2 })[0];
}

/** One per item: the done control, named for its item. */
function doneControls() {
  return screen.getAllByRole('button', { name: /^Mark .+ done$/ });
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
      items={[
        anItem('aa first', 3, { dueAt: hoursOn(3, 9) }),
        anItem('bb second', 3, { dueAt: hoursOn(3, 9) }),
      ]}
    />,
  );

  expect(doneControls()).toHaveLength(2);
  expect(renderedTitles()).toEqual(['aa first', 'bb second']);
});

test('AC-04.4 the day wins over priority', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[
        anItem('Laundry', 0, { priority: 'low' }),
        anItem('Midterm', 6, { priority: 'high' }),
      ]}
    />,
  );

  expect(headingOver('Laundry')).toHaveAccessibleName('September 15, 2026');
  expect(headingOver('Midterm')).toHaveAccessibleName('September 21, 2026');
  expect(renderedTitles()).toEqual(['Laundry', 'Midterm']);
});

// US-55 supersedes this for items on different days: the most overdue leads.
test('AC-55.3 inside Overdue, the most overdue comes first whatever its priority', () => {
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
      allItems={[]}
      onAddStep={noop}
      items={[
        anItem('bb twelve', -12, { priority: 'low' }),
        anItem('aa one', -1, { priority: 'high' }),
      ]}
    />,
  );

  expect(renderedTitles()).toEqual(['bb twelve', 'aa one']);
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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
      allItems={[]}
      onAddStep={noop}
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

test('AC-25.5 and AC-67.3 Delete reports the deletion at once, with no question', async () => {
  const user = userEvent.setup();
  const deleted: string[] = [];
  renderEditable({}, { onDelete: (id) => deleted.push(id) });

  await openItem(user, 'Midterm');
  await user.click(screen.getByRole('button', { name: 'Delete Midterm' }));

  expect(deleted).toHaveLength(1);
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

function renderTriage(
  items: Item[],
  handlers: { onEdit?: () => void; onDelete?: () => void } = {},
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
      allItems={items}
      onAddStep={noop}
      items={items}
    />,
  );
}

test('AC-44.1 an overdue row offers Tomorrow and Drop, and a current one does not', () => {
  renderTriage([anItem('Missed lab', -2), anItem('Quiz', 0)]);

  expect(
    screen.getByRole('button', { name: 'Move Missed lab to tomorrow' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Drop Missed lab' })).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Move Quiz to tomorrow' }),
  ).toBeNull();
  expect(screen.queryByRole('button', { name: 'Drop Quiz' })).toBeNull();
});

test('AC-44.2 Tomorrow moves the deadline to tomorrow at the time it had', async () => {
  const user = userEvent.setup();
  const onEdit = vi.fn();
  const lab = anItem('Missed lab', -2, { dueAt: hoursOn(-2, 17) });
  renderTriage([lab], { onEdit });

  await user.click(
    screen.getByRole('button', { name: 'Move Missed lab to tomorrow' }),
  );

  expect(onEdit).toHaveBeenCalledWith(
    lab.id,
    'Missed lab',
    hoursOn(1, 17),
    'none',
  );
});

test('AC-44.3 and AC-67.3 Drop deletes at once; Undo is the way back', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();
  const lab = anItem('Missed lab', -2);
  renderTriage([lab], { onDelete });

  await user.click(screen.getByRole('button', { name: 'Drop Missed lab' }));

  expect(onDelete).toHaveBeenCalledWith(lab.id);
});

describe('US-54 ten upcoming at a time', () => {
  function renderItems(items: Item[]) {
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
        allItems={items}
        onAddStep={noop}
        items={items}
      />,
    );
  }

  /** Twelve upcoming items, one a day from today, "Day 0" to "Day 11". */
  const twelve = () =>
    Array.from({ length: 12 }, (_, day) => anItem(`Day ${day}`, day));

  test('AC-54.1 with more than ten upcoming, the first ten in order are shown and the rest counted', () => {
    renderItems(twelve());

    expect(doneControls()).toHaveLength(10);
    expect(screen.getByText('Day 9')).toBeVisible();
    expect(screen.queryByText('Day 10')).toBeNull();
    expect(screen.getByText('Showing 10 of 12 upcoming.')).toBeVisible();
  });

  test('AC-54.2 overdue items are all shown and do not use up the ten', () => {
    renderItems([
      anItem('Missed 1', -1),
      anItem('Missed 2', -2),
      anItem('Missed 3', -3),
      ...twelve(),
    ]);

    expect(doneControls()).toHaveLength(13);
    expect(screen.getByText('Missed 3')).toBeVisible();
  });

  test('AC-54.3 Show more reveals the rest, and Show fewer goes back to ten', async () => {
    const user = userEvent.setup();
    renderItems(twelve());

    await user.click(screen.getByRole('button', { name: 'Show 2 more' }));
    expect(doneControls()).toHaveLength(12);
    expect(screen.getByText('Day 11')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(doneControls()).toHaveLength(10);
  });

  test('AC-55.4 the ten shown are the ten soonest, even with a high one due later', () => {
    renderItems([
      ...twelve().slice(0, 11),
      anItem('Final exam', 30, { priority: 'high' }),
    ]);

    expect(screen.queryByText('Final exam')).toBeNull();
    expect(screen.getByText('Day 9')).toBeVisible();
  });

  test('AC-54.4 ten or fewer upcoming shows everything and no count', () => {
    renderItems(twelve().slice(0, 10));

    expect(doneControls()).toHaveLength(10);
    expect(screen.queryByText(/upcoming\./)).toBeNull();
    expect(screen.queryByRole('button', { name: /more|fewer/ })).toBeNull();
  });
});

describe('US-57 Home as a timeline', () => {
  const COURSES = [
    {
      id: 'c123',
      name: 'CSE 123',
      meetingLocation: '',
      professorEmail: '',
      officeHours: '',
      createdAt: NOW.toISOString(),
    },
  ];
  const GOALS = [
    {
      id: 'aws',
      name: 'AWS cert',
      description: '',
      targetAt: NOW.toISOString(),
      createdAt: NOW.toISOString(),
    },
  ];

  function show(items: Item[]) {
    render(
      <Dashboard
        now={NOW}
        onDone={noop}
        onNoteChange={noop}
        courses={COURSES}
        onCourseChange={noop}
        goals={GOALS}
        onGoalChange={noop}
        onEdit={noop}
        onDelete={noop}
        allItems={items}
        onAddStep={noop}
        items={items}
      />,
    );
  }

  const day = (name: string) =>
    screen.getByRole('heading', { level: 2, name }).closest('li')!;

  test('AC-57.4 each upcoming item sits under its day, named in full', () => {
    show([anItem('Quiz', 0), anItem('Lab', 1), anItem('Essay', 5)]);

    expect(within(day('September 15, 2026')).getByText('Quiz')).toBeVisible();
    expect(within(day('September 16, 2026')).getByText('Lab')).toBeVisible();
    expect(within(day('September 20, 2026')).getByText('Essay')).toBeVisible();
  });

  test('AC-57.4 the nearest days say Today and Tomorrow, the rest their weekday', () => {
    show([anItem('Quiz', 0), anItem('Lab', 1), anItem('Essay', 5)]);

    expect(within(day('September 15, 2026')).getByText('Today')).toBeVisible();
    expect(
      within(day('September 16, 2026')).getByText('Tomorrow'),
    ).toBeVisible();
    expect(within(day('September 20, 2026')).getByText('Sun')).toBeVisible();
  });

  test('AC-57.4 the month is named where it changes, and the old headings are gone', () => {
    show([anItem('Essay', 5), anItem('Midterm', 20)]);

    expect(screen.getByText('October 2026')).toBeVisible();
    for (const old of ['Today', 'This week', 'Later']) {
      expect(screen.queryByRole('heading', { name: old })).toBeNull();
    }
  });

  test('AC-57.3 overdue items keep their own group and say how late they are', () => {
    show([anItem('Reading quiz', -1), anItem('Old lab', -3)]);

    const overdue = screen
      .getByRole('heading', { name: 'Overdue' })
      .closest('section')!;
    expect(within(overdue).getByText('Yesterday')).toBeVisible();
    expect(within(overdue).getByText('3 days ago')).toBeVisible();
  });

  test('AC-57.5 a row shows its time only when it is not 11:59pm, and no tag or Soon marker', () => {
    show([
      anItem('Dentist', 2, { category: 'personal', dueAt: hoursOn(2, 8) }),
      anItem('Essay', 2, {
        dueAt: new Date(2026, 8, 17, 23, 59).toISOString(),
      }),
    ]);

    expect(screen.getByText('8:00 AM')).toBeVisible();
    expect(screen.queryByText(/11:59/)).toBeNull();
    expect(screen.queryByText(/^personal$/i)).toBeNull();
    expect(screen.queryByText(/^academic$/i)).toBeNull();
    expect(screen.queryByText('Soon')).toBeNull();
  });

  test('AC-57.6 under the title: course, goal, repeat and note', () => {
    show([
      anItem('HW 1', 3, {
        courseId: 'c123',
        goalId: 'aws',
        repeat: 'weekly',
        note: 'Submit on Gradescope',
      }),
    ]);

    const row = screen.getByText('HW 1').closest('li')!;
    for (const words of [
      'CSE 123',
      'AWS cert',
      'Repeats weekly',
      'Submit on Gradescope',
    ]) {
      expect(within(row).getByText(words)).toBeVisible();
    }
  });
});

describe('US-59 the opened row', () => {
  test('AC-59.1 every field in the open row is named in visible text', async () => {
    const user = userEvent.setup();
    const item = anItem('HW 1', 3, { courseId: CSE100.id });
    render(
      <Dashboard
        now={NOW}
        onDone={noop}
        onNoteChange={noop}
        courses={[CSE100]}
        onCourseChange={noop}
        goals={[
          {
            id: 'g',
            name: 'AWS cert',
            description: '',
            targetAt: NOW.toISOString(),
            createdAt: NOW.toISOString(),
          },
        ]}
        onGoalChange={noop}
        onEdit={noop}
        onDelete={noop}
        allItems={[item]}
        onAddStep={noop}
        items={[item]}
      />,
    );

    await openItem(user, 'HW 1');

    const row = screen.getByRole('button', { name: 'HW 1' }).closest('li')!;
    for (const words of [
      'Title',
      'Due',
      'Time',
      'Repeat',
      'Course',
      'Goal',
      'Note',
      'Steps',
    ]) {
      expect(within(row).getByText(words, { exact: true })).toBeVisible();
    }
  });
});

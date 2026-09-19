import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

async function addItem(title: string, due: string, time = '') {
  const user = userEvent.setup();
  // user-event rejects an empty string, so an omitted field is just not typed.
  if (title) await user.type(screen.getByLabelText('Title'), title);
  // Date and time inputs take a value rather than keystrokes.
  if (due) {
    fireEvent.change(screen.getByLabelText('Due'), { target: { value: due } });
  }
  if (time) {
    fireEvent.change(screen.getByLabelText('Time'), {
      target: { value: time },
    });
  }
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

test('renders the app name', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Personal Tracker' }),
  ).toBeVisible();
});

test('AC-01.1 an added item appears in the list', async () => {
  render(<App />);
  await addItem('CSE 100 project', '2026-10-03');

  expect(screen.getByText('CSE 100 project')).toBeVisible();
  expect(screen.getByText('Oct 3, 11:59 PM')).toBeVisible();
});

test('AC-01.1 school and life items sit in the same list', async () => {
  render(<App />);
  await addItem('CSE 100 project', '2026-10-03');
  await addItem('Rent', '2026-10-01');

  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
});

test('AC-01.1 an added item is still there after a reload', async () => {
  const first = render(<App />);
  await addItem('Dentist', '2026-10-09');
  first.unmount();

  render(<App />);
  expect(screen.getByText('Dentist')).toBeVisible();
});

test('AC-01.2 a rejected submit adds nothing to the list', async () => {
  render(<App />);
  await addItem('', '2026-10-03');

  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
});

test('a title containing markup renders as text, not as HTML', async () => {
  render(<App />);
  await addItem('<img src=x onerror=alert(1)>', '2026-10-03');

  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  expect(document.querySelector('img')).toBeNull();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('AC-11.1 on first launch no group headings are rendered', () => {
  render(<App />);
  expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
});

test('AC-11.1 an empty state with an add action is shown', () => {
  render(<App />);

  expect(screen.getByText('Nothing due yet.')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Add your first item' }),
  ).toBeVisible();
});

test('AC-11.1 the add action moves focus to the title field', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Add your first item' }));

  expect(screen.getByLabelText('Title')).toHaveFocus();
});

test('AC-11.1 the empty state goes away once an item exists', async () => {
  render(<App />);
  await addItem('Rent', '2026-10-01');

  expect(screen.queryByText('Nothing due yet.')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2 })).toBeVisible();
});

test('AC-11.2 when storage cannot be read, an error state explains it', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });

  render(<App />);

  expect(screen.getByText('Your data could not be loaded.')).toBeVisible();
  expect(screen.getByText(/site data is probably blocked/i)).toBeVisible();
});

test('AC-11.2 the add form is not offered when storage cannot be read', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });

  render(<App />);

  expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  expect(screen.queryByText('Nothing due yet.')).not.toBeInTheDocument();
});

test('AC-11.1 the app name is still shown in both empty and error states', () => {
  const { unmount } = render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Personal Tracker', level: 1 }),
  ).toBeVisible();
  unmount();

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Personal Tracker', level: 1 }),
  ).toBeVisible();
});

/** Today at 23:59, so it lands in the Today group whenever the suite runs. */
function todayIso() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

test('AC-05.1 marking an item done takes it out of its group', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await addItem('Laundry', todayIso());

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  expect(screen.queryByText('Rent')).not.toBeInTheDocument();
  expect(screen.getByText('Laundry')).toBeVisible();
});

test('AC-05.1 the done state survives a reload', async () => {
  const user = userEvent.setup();
  const first = render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));
  first.unmount();

  render(<App />);
  expect(screen.queryByText('Rent')).not.toBeInTheDocument();
});

test('AC-05.1 finishing everything shows the empty state, not a blank page', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  expect(screen.getByText('Nothing due yet.')).toBeVisible();
});

test('AC-05.2 pressing u brings back the item just marked done', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  await user.keyboard('u');

  expect(screen.getByText('Rent')).toBeVisible();
});

test('AC-05.2 the restored item goes back to the group it came from', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  await user.keyboard('u');

  expect(
    screen.getByText('Rent').closest('section')?.querySelector('h2')
      ?.textContent,
  ).toBe('Today');
});

test('AC-05.2 undo only reaches back one step', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));
  await user.keyboard('u');
  await user.keyboard('u');

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('AC-05.2 pressing u with nothing recently done changes nothing', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  await user.keyboard('u');

  expect(screen.getByText('Rent')).toBeVisible();
});

test('AC-05.2 typing u into the title field does not undo', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  await user.type(screen.getByLabelText('Title'), 'Tuesday');

  expect(screen.queryByText('Rent')).not.toBeInTheDocument();
});

test('AC-05.2 the undo shortcut is announced, not hidden', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  expect(screen.getByRole('status')).toHaveTextContent(
    'Marked Rent done. Press u to undo.',
  );
});

/**
 * Open an item's controls. US-22 put the selects and the note behind the
 * title, so anything that edits an item clicks it open first. A fresh render
 * starts closed, so a test that reloads opens it again.
 */
async function openItem(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
) {
  await user.click(
    screen.getByRole('button', { name: title, expanded: false }),
  );
}

test('AC-05.3 Tab reaches each item control in display order', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('aa first', todayIso());
  await addItem('bb second', todayIso());

  screen.getByRole('button', { name: 'Add' }).focus();

  // Each item contributes its done control then its title, and the items
  // themselves follow display order. US-22 moved the note behind the title, so
  // the sequence is still two stops per item and finishing something is still
  // the first of them.
  const expected = [
    'Mark aa first done',
    'aa first',
    'Mark bb second done',
    'bb second',
  ];

  for (const name of expected) {
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName(name);
  }
});

test('AC-06.1 a note is still attached to its item after a reload', async () => {
  const user = userEvent.setup();
  const first = render(<App />);
  await addItem('Rent', todayIso());

  await openItem(user, 'Rent');
  await user.type(
    screen.getByRole('textbox', { name: 'Note for Rent' }),
    'Zelle, not Venmo',
  );
  await user.tab();
  first.unmount();

  render(<App />);
  await openItem(user, 'Rent');
  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toHaveValue(
    'Zelle, not Venmo',
  );
});

test('AC-06.1 a note lands on the right item when several exist', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await addItem('Laundry', todayIso());

  await openItem(user, 'Laundry');
  await user.type(
    screen.getByRole('textbox', { name: 'Note for Laundry' }),
    'quarters',
  );
  await user.tab();

  await openItem(user, 'Rent');
  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toHaveValue(
    '',
  );
  expect(screen.getByRole('textbox', { name: 'Note for Laundry' })).toHaveValue(
    'quarters',
  );
});

test('AC-06.3 a 2000 character note is stored and shown in full', async () => {
  const user = userEvent.setup();
  const long = 'x'.repeat(2000);
  const first = render(<App />);
  await addItem('Rent', todayIso());
  await openItem(user, 'Rent');

  // Typed character by character this would take minutes, so the value is set
  // directly and blurred, which is the same path the component takes.
  const field = screen.getByRole('textbox', { name: 'Note for Rent' });
  fireEvent.change(field, { target: { value: long } });
  fireEvent.blur(field);
  first.unmount();

  render(<App />);
  await openItem(user, 'Rent');
  const reloaded = screen.getByRole('textbox', { name: 'Note for Rent' });
  expect(reloaded).toHaveValue(long);
  expect((reloaded as HTMLTextAreaElement).value).toHaveLength(2000);
});

/** jsdom's Blob has no text(), but FileReader is implemented. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/** jsdom has no object URLs, so stand one up and capture what gets handed to it. */
function captureExport() {
  const blobs: Blob[] = [];
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:captured';
    }),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  return blobs;
}

test('AC-09.1 exporting writes every item into one JSON file', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  render(<App />);
  await addItem('Rent', todayIso());
  await addItem('Midterm', todayIso());

  await user.click(screen.getByRole('button', { name: 'Export' }));

  expect(blobs).toHaveLength(1);
  const parsed = JSON.parse(await readBlob(blobs[0]!)) as {
    version: number;
    items: { title: string }[];
  };
  expect(parsed.version).toBe(3);
  expect(parsed.items.map((i) => i.title).sort()).toEqual(['Midterm', 'Rent']);
});

test('AC-09.1 the exported file is offered as JSON', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Export' }));

  expect(blobs[0]!.type).toBe('application/json');
});

test('AC-09.1 items already marked done are included in the export', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  await user.click(screen.getByRole('button', { name: 'Export' }));

  const parsed = JSON.parse(await readBlob(blobs[0]!)) as {
    items: { title: string; status: string }[];
  };
  expect(parsed.items).toHaveLength(1);
  expect(parsed.items[0]?.status).toBe('done');
});

test('AC-09.2 exporting an empty database gives a valid file, not an error', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  render(<App />);
  expect(screen.getByText('Nothing due yet.')).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Export' }));

  expect(JSON.parse(await readBlob(blobs[0]!))).toEqual({
    version: 3,
    items: [],
    goals: [],
    courses: [],
    reflections: [],
  });
});

test('AC-09.2 export is offered even when there is nothing to export', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
});

function jsonFile(text: string, name = 'personal-tracker-2026-09-15.json') {
  return new File([text], name, { type: 'application/json' });
}

async function importFile(file: File) {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Import'), file);
}

function storedItems() {
  const raw = localStorage.getItem('personal-tracker/v1') ?? '{"items":[]}';
  return (JSON.parse(raw) as { items: { title: string }[] }).items;
}

test('AC-10.1 exporting and importing into an empty database restores it exactly', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  const first = render(<App />);
  await addItem('Rent', todayIso());
  await addItem('Midterm', todayIso());
  await openItem(user, 'Rent');
  await user.type(
    screen.getByRole('textbox', { name: 'Note for Rent' }),
    'Zelle',
  );
  await user.tab();
  await user.click(screen.getByRole('button', { name: 'Mark Midterm done' }));

  await user.click(screen.getByRole('button', { name: 'Export' }));
  const exported = await readBlob(blobs[0]!);
  const before = localStorage.getItem('personal-tracker/v1');
  first.unmount();

  localStorage.clear();
  render(<App />);
  await importFile(jsonFile(exported));

  await screen.findByText('Rent');
  expect(JSON.parse(localStorage.getItem('personal-tracker/v1')!)).toEqual(
    JSON.parse(before!),
  );
});

test('AC-10.2 a file that is not JSON changes nothing and says why', async () => {
  render(<App />);
  await addItem('Rent', todayIso());

  await importFile(jsonFile('not json at all'));

  expect(await screen.findByRole('alert')).toHaveTextContent(/not valid JSON/i);
  expect(storedItems()).toHaveLength(1);
  expect(screen.getByText('Rent')).toBeVisible();
});

test('AC-10.3 a file with no items list changes nothing and names items', async () => {
  render(<App />);
  await addItem('Rent', todayIso());

  await importFile(jsonFile('{"version": 1}'));

  expect(await screen.findByRole('alert')).toHaveTextContent(/items/i);
  expect(storedItems()).toHaveLength(1);
});

test('AC-10.4 importing over existing items asks before writing anything', async () => {
  render(<App />);
  await addItem('Rent', todayIso());

  await importFile(jsonFile('{"version": 1, "items": []}'));

  expect(await screen.findByRole('button', { name: 'Replace' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Merge' })).toBeVisible();
  // Nothing written while the question is still on screen.
  expect(storedItems()).toHaveLength(1);
});

test('AC-10.4 choosing Replace swaps the database for the file', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  const incoming = {
    version: 1,
    items: [
      {
        id: 'from-file',
        title: 'Imported thing',
        dueAt: new Date().toISOString(),
        category: 'academic',
        priority: 'normal',
        status: 'open',
        note: '',
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ],
  };
  await importFile(jsonFile(JSON.stringify(incoming)));
  await user.click(await screen.findByRole('button', { name: 'Replace' }));

  expect(storedItems().map((i) => i.title)).toEqual(['Imported thing']);
  expect(screen.queryByText('Rent')).not.toBeInTheDocument();
});

test('AC-10.4 choosing Merge keeps both sets', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  const incoming = {
    version: 1,
    items: [
      {
        id: 'from-file',
        title: 'Imported thing',
        dueAt: new Date().toISOString(),
        category: 'academic',
        priority: 'normal',
        status: 'open',
        note: '',
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ],
  };
  await importFile(jsonFile(JSON.stringify(incoming)));
  await user.click(await screen.findByRole('button', { name: 'Merge' }));

  expect(
    storedItems()
      .map((i) => i.title)
      .sort(),
  ).toEqual(['Imported thing', 'Rent']);
});

test('AC-10.4 merging your own export twice does not duplicate anything', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();

  render(<App />);
  await addItem('Rent', todayIso());
  await user.click(screen.getByRole('button', { name: 'Export' }));
  const exported = await readBlob(blobs[0]!);

  await importFile(jsonFile(exported));
  await user.click(await screen.findByRole('button', { name: 'Merge' }));

  expect(storedItems()).toHaveLength(1);
});

test('AC-10.4 Cancel writes nothing', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());

  await importFile(jsonFile('{"version": 1, "items": []}'));
  await user.click(await screen.findByRole('button', { name: 'Cancel' }));

  expect(storedItems()).toHaveLength(1);
  expect(
    screen.queryByRole('button', { name: 'Replace' }),
  ).not.toBeInTheDocument();
});

test('AC-10.4 importing into an empty database does not ask', async () => {
  render(<App />);

  const incoming = {
    version: 1,
    items: [
      {
        id: 'from-file',
        title: 'Imported thing',
        dueAt: new Date().toISOString(),
        category: 'academic',
        priority: 'normal',
        status: 'open',
        note: '',
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
    ],
  };
  await importFile(jsonFile(JSON.stringify(incoming)));

  expect(await screen.findByText('Imported thing')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Replace' }),
  ).not.toBeInTheDocument();
});

async function goTo(view: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: view }));
}

async function addCourse(name: string, location = '', email = '', hours = '') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Course name'), name);
  if (location) await user.type(screen.getByLabelText('Location'), location);
  if (email) await user.type(screen.getByLabelText('Professor email'), email);
  if (hours) await user.type(screen.getByLabelText('Office hours'), hours);
  await user.click(screen.getByRole('button', { name: 'Add course' }));
}

test('AC-07.1 a course keeps all four details across a reload', async () => {
  const first = render(<App />);
  await goTo('Courses');
  await addCourse(
    'CSE 100',
    'Center Hall 101',
    'prof@ucsd.edu',
    'Tue 2-4pm, CSE 3108',
  );
  first.unmount();

  render(<App />);
  await goTo('Courses');

  expect(screen.getByText('CSE 100')).toBeVisible();
  expect(screen.getByText('Center Hall 101')).toBeVisible();
  expect(screen.getByText('prof@ucsd.edu')).toBeVisible();
  expect(screen.getByText('Tue 2-4pm, CSE 3108')).toBeVisible();
});

test('AC-07.2 an item can be given a course, and keeps it across a reload', async () => {
  const user = userEvent.setup();
  const first = render(<App />);
  await goTo('Courses');
  await addCourse('CSE 100');
  await goTo('Home');
  await addItem('Project', todayIso());

  await openItem(user, 'Project');
  const courseSelect = screen.getByLabelText('Course for Project');
  await user.selectOptions(courseSelect, [
    within(courseSelect).getByRole('option', { name: 'CSE 100' }),
  ]);
  first.unmount();

  render(<App />);
  // Closed, the row names the course. Open, the control still holds it.
  // Scoped to the row, because US-27 put the course name in a filter too.
  expect(
    within(screen.getByRole('listitem')).getByText('CSE 100'),
  ).toBeVisible();

  await openItem(user, 'Project');
  expect(screen.getByLabelText('Course for Project')).toHaveDisplayValue(
    'CSE 100',
  );
});

test('AC-07.3 deleting a course keeps its items, without the course', async () => {
  const user = userEvent.setup();
  render(<App />);
  await goTo('Courses');
  await addCourse('CSE 100');
  await goTo('Home');
  await addItem('Project', todayIso());
  await openItem(user, 'Project');
  const courseSelect = screen.getByLabelText('Course for Project');
  await user.selectOptions(courseSelect, [
    within(courseSelect).getByRole('option', { name: 'CSE 100' }),
  ]);

  await goTo('Courses');
  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
  await goTo('Home');

  expect(screen.getByText('Project')).toBeVisible();

  // Opened, because a closed row hides the control either way and the
  // assertion would pass without proving the course had gone.
  await openItem(user, 'Project');
  expect(screen.queryByLabelText('Course for Project')).not.toBeInTheDocument();
});

test('AC-07.1 the courses view starts empty and says so', async () => {
  render(<App />);
  await goTo('Courses');

  expect(screen.getByText('No courses yet.')).toBeVisible();
});

test('moving between views swaps what is shown', async () => {
  render(<App />);
  await addItem('Rent', todayIso());

  await goTo('Courses');
  expect(screen.queryByText('Rent')).not.toBeInTheDocument();

  await goTo('Home');
  expect(screen.getByText('Rent')).toBeVisible();
});

async function addGoal(name: string, description = '', target = '2026-12-15') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Goal name'), name);
  if (description) {
    await user.type(screen.getByLabelText('Description'), description);
  }
  fireEvent.change(screen.getByLabelText('Target date'), {
    target: { value: target },
  });
  await user.click(screen.getByRole('button', { name: 'Add goal' }));
}

test('AC-14.3 a goal survives a reload with its description and target', async () => {
  const first = render(<App />);
  await goTo('Goals');
  await addGoal('Finish the quarter', 'No late work', '2026-12-15');
  first.unmount();

  render(<App />);
  await goTo('Goals');

  expect(
    screen.getByRole('heading', { name: 'Finish the quarter' }),
  ).toBeVisible();
  expect(screen.getByText('No late work')).toBeVisible();
  expect(screen.getByText(/Dec 15/)).toBeVisible();
});

test('AC-15.4 an item shows which goal it belongs to', async () => {
  const user = userEvent.setup();
  render(<App />);
  await goTo('Goals');
  await addGoal('Finish the quarter');
  await goTo('Home');
  await addItem('Project', todayIso());

  await openItem(user, 'Project');
  const goalSelect = screen.getByLabelText('Goal for Project');
  await user.selectOptions(goalSelect, [
    within(goalSelect).getByRole('option', { name: 'Finish the quarter' }),
  ]);

  expect(screen.getByLabelText('Goal for Project')).toHaveDisplayValue(
    'Finish the quarter',
  );
});

test('AC-15.3 finishing an item moves the goal count without a reload', async () => {
  const user = userEvent.setup();
  render(<App />);
  await goTo('Goals');
  await addGoal('Finish the quarter');
  await goTo('Home');
  await addItem('Project', todayIso());
  await openItem(user, 'Project');
  const goalSelect = screen.getByLabelText('Goal for Project');
  await user.selectOptions(goalSelect, [
    within(goalSelect).getByRole('option', { name: 'Finish the quarter' }),
  ]);

  await goTo('Goals');
  expect(screen.getByText('0 of 1 done')).toBeVisible();

  await goTo('Home');
  await user.click(screen.getByRole('button', { name: 'Mark Project done' }));
  await goTo('Goals');

  expect(screen.getByText('1 of 1 done')).toBeVisible();
});

test('AC-20.1 deleting a goal keeps its items, without the goal', async () => {
  const user = userEvent.setup();
  render(<App />);
  await goTo('Goals');
  await addGoal('Finish the quarter');
  await goTo('Home');
  await addItem('Project', todayIso());
  await openItem(user, 'Project');
  const goalSelect = screen.getByLabelText('Goal for Project');
  await user.selectOptions(goalSelect, [
    within(goalSelect).getByRole('option', { name: 'Finish the quarter' }),
  ]);

  await goTo('Goals');
  await user.click(
    screen.getByRole('button', { name: 'Delete Finish the quarter' }),
  );
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
  await goTo('Home');

  expect(screen.getByText('Project')).toBeVisible();
  expect(screen.queryByLabelText('Goal for Project')).not.toBeInTheDocument();
});

test('AC-14.4 the goals view starts empty and says so', async () => {
  render(<App />);
  await goTo('Goals');

  expect(screen.getByText('No goals yet.')).toBeVisible();
});

/** A date the given number of days from today, as the date control wants it. */
function isoDaysFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Add an item in a chosen category. */
async function addIn(title: string, due: string, category: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Title'), title);
  fireEvent.change(screen.getByLabelText('Due'), { target: { value: due } });
  await user.selectOptions(screen.getByLabelText('Category'), category);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

/** Choose what the list shows. */
async function show(label: string) {
  const user = userEvent.setup();
  await user.click(
    within(screen.getByRole('group', { name: 'Show' })).getByRole('button', {
      name: label,
    }),
  );
}

test('AC-08.1 filtering to a category hides the others', async () => {
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');

  await show('Academic');

  expect(screen.getByRole('button', { name: 'CSE 110 midterm' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Dentist' })).toBeNull();
});

test('AC-08.1 the group headings still apply to what is left', async () => {
  render(<App />);
  await addIn('CSE 110 midterm', isoDaysFromToday(1), 'academic');
  await addIn('Dentist', todayIso(), 'personal');

  await show('Academic');

  // The academic item is due tomorrow, so This week survives and Today does
  // not: the filter narrows the list, it does not flatten it.
  expect(screen.getByRole('heading', { name: 'This week' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Today' })).toBeNull();
});

test('AC-08.1 filtering the other way hides the first', async () => {
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');

  await show('Personal');

  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'CSE 110 midterm' })).toBeNull();
});

test('AC-08.1 going back to All brings everything back', async () => {
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');

  await show('Academic');
  await show('All');

  expect(screen.getByRole('button', { name: 'CSE 110 midterm' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
});

test('AC-08.2 a reload clears the filter rather than remembering it', async () => {
  const first = render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');
  await show('Academic');
  expect(screen.queryByRole('button', { name: 'Dentist' })).toBeNull();

  first.unmount();
  render(<App />);

  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
  expect(
    within(screen.getByRole('group', { name: 'Show' })).getByRole('button', {
      name: 'All',
    }),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('AC-08.3 a filter that hides everything says so, and offers a way back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');

  await show('Personal');

  expect(screen.getByText(/Nothing personal/i)).toBeVisible();
  // Not the first-run empty state, which would be a lie: there is an item.
  expect(screen.queryByText(/Nothing due yet/)).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Show everything' }));
  expect(screen.getByRole('button', { name: 'CSE 110 midterm' })).toBeVisible();
});

test('AC-08.3 with no items at all the first-run empty state still shows', async () => {
  render(<App />);

  expect(screen.getByText(/Nothing due yet/)).toBeVisible();
});

test('AC-08.1 the stat row counts the whole day, not the filtered view', async () => {
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');

  await show('Academic');

  // Two remain due today. The filter narrows the list you read, not the day
  // you are having.
  expect(screen.getByText('2')).toBeVisible();
});

/** Click a button by its accessible name. */
async function user2Click(name: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name }));
}

/** Attach an item to a course through the row US-22 opens. */
async function attachToCourse(title: string, courseName: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: title }));
  const select = screen.getByLabelText(`Course for ${title}`);
  await user.selectOptions(select, [
    within(select).getByRole('option', { name: courseName }),
  ]);
  await user.click(screen.getByRole('button', { name: title }));
}

/** Narrow the list to one course. */
async function showCourse(name: string) {
  const user = userEvent.setup();
  const filterSelect = screen.getByLabelText('Course');
  await user.selectOptions(filterSelect, [
    within(filterSelect).getByRole('option', { name }),
  ]);
}

/** Two courses and three items, one attached to each course and one loose. */
async function aTermWithCourses() {
  render(<App />);
  await goTo('Courses');
  await addCourse('CSE 110');
  await addCourse('MATH 20C');
  await goTo('Home');
  await addIn('CSE 110 midterm', todayIso(), 'academic');
  await addIn('MATH problem set', todayIso(), 'academic');
  await addIn('Dentist', todayIso(), 'personal');
  await attachToCourse('CSE 110 midterm', 'CSE 110');
  await attachToCourse('MATH problem set', 'MATH 20C');
}

test('AC-27.1 filtering to a course shows only that course', async () => {
  await aTermWithCourses();

  await showCourse('CSE 110');

  expect(screen.getByRole('button', { name: 'CSE 110 midterm' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'MATH problem set' })).toBeNull();
});

test('AC-27.3 an item attached to no course is hidden by a course filter', async () => {
  await aTermWithCourses();

  await showCourse('CSE 110');

  expect(screen.queryByRole('button', { name: 'Dentist' })).toBeNull();
});

test('AC-27.1 going back to all courses brings everything back', async () => {
  await aTermWithCourses();

  await showCourse('CSE 110');
  await showCourse('All courses');

  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'MATH problem set' }),
  ).toBeVisible();
});

test('AC-27.4 a course and a category filter both apply', async () => {
  await aTermWithCourses();

  await show('Personal');
  await showCourse('CSE 110');

  // The midterm is academic and the dentist has no course: nothing is both.
  expect(
    screen.getByText(/Nothing personal for CSE 110 is open/i),
  ).toBeVisible();
});

test('AC-27.4 both filters together can still leave something', async () => {
  await aTermWithCourses();

  await show('Academic');
  await showCourse('CSE 110');

  expect(screen.getByRole('button', { name: 'CSE 110 midterm' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'MATH problem set' })).toBeNull();
});

test('AC-27.6 a course filter that hides everything names the course', async () => {
  await aTermWithCourses();

  await showCourse('CSE 110');
  await user2Click('Mark CSE 110 midterm done');

  expect(
    screen.getByText(/Nothing for CSE 110 is open right now/i),
  ).toBeVisible();
});

test('AC-27.6 the way back clears both filters', async () => {
  const user = userEvent.setup();
  await aTermWithCourses();

  await show('Personal');
  await showCourse('CSE 110');
  await user.click(screen.getByRole('button', { name: 'Show everything' }));

  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'MATH problem set' }),
  ).toBeVisible();
});

test('AC-27.5 a reload clears the course filter too', async () => {
  await aTermWithCourses();
  await showCourse('CSE 110');
  expect(screen.queryByRole('button', { name: 'MATH problem set' })).toBeNull();

  // aTermWithCourses rendered the app, so tear that one down before the next.
  cleanup();
  render(<App />);

  expect(screen.getByLabelText('Course')).toHaveValue('');
  expect(
    screen.getByRole('button', { name: 'MATH problem set' }),
  ).toBeVisible();
});

test('AC-27.7 deleting the course you filtered to shows everything again', async () => {
  const user = userEvent.setup();
  await aTermWithCourses();
  await showCourse('CSE 110');

  await goTo('Courses');
  await user.click(screen.getByRole('button', { name: 'Delete CSE 110' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));
  await goTo('Home');

  // Not an empty list naming a course that no longer exists.
  expect(
    screen.getByRole('button', { name: 'MATH problem set' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Dentist' })).toBeVisible();
});

test('AC-27.2 with no courses recorded no course control is offered', async () => {
  render(<App />);
  await addIn('Dentist', todayIso(), 'personal');

  expect(screen.queryByLabelText('Course')).toBeNull();
});

/** Add an item that repeats. */
async function addRepeating(title: string, due: string, repeat: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Title'), title);
  fireEvent.change(screen.getByLabelText('Due'), { target: { value: due } });
  await user.selectOptions(screen.getByLabelText('Repeat'), repeat);
  await user.click(screen.getByRole('button', { name: 'Add' }));
}

/** Every item in storage, which is where a spawned one has to land. */
function storedTitles() {
  const raw = localStorage.getItem('personal-tracker/v1') ?? '{"items":[]}';
  return (JSON.parse(raw) as { items: { title: string; status: string }[] })
    .items;
}

test('AC-28.1 finishing a monthly item creates the next one', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  const rents = storedTitles().filter((i) => i.title === 'Rent');
  expect(rents).toHaveLength(2);
  expect(rents.filter((i) => i.status === 'open')).toHaveLength(1);
  expect(rents.filter((i) => i.status === 'done')).toHaveLength(1);
});

test('AC-28.1 the next one keeps everything except the finishing', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  const raw = localStorage.getItem('personal-tracker/v1')!;
  const items = (JSON.parse(raw) as { items: Record<string, unknown>[] }).items;
  const next = items.find((i) => i.status === 'open')!;
  const done = items.find((i) => i.status === 'done')!;

  expect(next.title).toBe('Rent');
  expect(next.repeat).toBe('monthly');
  expect(next.category).toBe(done.category);
  expect(next.priority).toBe(done.priority);
  expect(next.completedAt).toBeNull();
  // A new item, not the same one moved.
  expect(next.id).not.toBe(done.id);
});

test('AC-28.1 the next one is a month later, at the same local time', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  const raw = localStorage.getItem('personal-tracker/v1')!;
  const items = (JSON.parse(raw) as { items: Record<string, string>[] }).items;
  const next = new Date(items.find((i) => i.status === 'open')!.dueAt!);

  expect(next.getMonth()).toBe(10);
  expect(next.getDate()).toBe(1);
});

test('AC-28.2 finishing a weekly item creates one seven days later', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Lab writeup', '2026-10-01', 'weekly');

  await user.click(
    screen.getByRole('button', { name: 'Mark Lab writeup done' }),
  );

  const raw = localStorage.getItem('personal-tracker/v1')!;
  const items = (JSON.parse(raw) as { items: Record<string, string>[] }).items;
  const next = new Date(items.find((i) => i.status === 'open')!.dueAt!);

  expect(next.getMonth()).toBe(9);
  expect(next.getDate()).toBe(8);
});

test('AC-28.3 finishing an item that does not repeat creates nothing', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Midterm', '2026-10-01', 'none');

  await user.click(screen.getByRole('button', { name: 'Mark Midterm done' }));

  expect(storedTitles()).toHaveLength(1);
});

test('AC-28.4 undo reopens the finished one and removes the one it made', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));
  expect(storedTitles()).toHaveLength(2);

  await user.keyboard('u');

  const after = storedTitles();
  expect(after).toHaveLength(1);
  expect(after[0]?.status).toBe('open');
});

test('AC-28.4 undo after a non-repeating item still just reopens it', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Midterm', '2026-10-01', 'none');

  await user.click(screen.getByRole('button', { name: 'Mark Midterm done' }));
  await user.keyboard('u');

  const after = storedTitles();
  expect(after).toHaveLength(1);
  expect(after[0]?.status).toBe('open');
});

test('AC-28.6 a repeating item says so in the list', async () => {
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  // Scoped to the row: "Monthly" is also an option in the Repeat select.
  expect(
    within(screen.getByRole('listitem')).getByText('Monthly'),
  ).toBeVisible();
});

test('AC-28.6 an item that does not repeat says nothing', async () => {
  render(<App />);
  await addRepeating('Midterm', '2026-10-01', 'none');

  const row = within(screen.getByRole('listitem'));
  expect(row.queryByText('Monthly')).toBeNull();
  expect(row.queryByText('Weekly')).toBeNull();
});

test('AC-25.5 deleting an item through the real app removes it from storage', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addIn('Midterm', todayIso(), 'academic');
  await addIn('Rent', todayIso(), 'personal');

  await user.click(screen.getByRole('button', { name: 'Midterm' }));
  await user.click(screen.getByRole('button', { name: 'Delete Midterm' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

  const left = storedTitles();
  expect(left).toHaveLength(1);
  expect(left[0]?.title).toBe('Rent');
});

test('AC-17.1 recording a reflection through the real app stores it', async () => {
  const user = userEvent.setup();
  render(<App />);
  await goTo('Reflections');

  await user.click(screen.getByRole('button', { name: 'Good' }));

  const raw = localStorage.getItem('personal-tracker/v1')!;
  const db = JSON.parse(raw) as { reflections: { score: number }[] };
  expect(db.reflections).toHaveLength(1);
  expect(db.reflections[0]?.score).toBe(4);
});

test('AC-24.1 the calendar export writes a real .ics file', async () => {
  const user = userEvent.setup();
  const blobs = captureExport();
  render(<App />);
  await addIn('CSE 110 midterm', todayIso(), 'academic');

  await user.click(screen.getByRole('button', { name: 'Export calendar' }));

  const text = await readBlob(blobs[0]!);
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text.replace(/\r\n /g, '')).toContain('SUMMARY:CSE 110 midterm');
});

/** Make every localStorage write fail, the way a full quota does. */
function withFullStorage(run: () => void) {
  const real = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    const error = new Error('exceeded the quota');
    error.name = 'QuotaExceededError';
    throw error;
  };
  try {
    run();
  } finally {
    Storage.prototype.setItem = real;
  }
}

test('a refused write says so rather than showing an item it did not store', async () => {
  const user = userEvent.setup();
  render(<App />);

  let caught: unknown = null;
  await user.type(screen.getByLabelText('Title'), 'Rent');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: todayIso() },
  });

  withFullStorage(() => {
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    } catch (error) {
      caught = error;
    }
  });

  // Nothing escapes the handler.
  expect(caught).toBeNull();
  // And the screen does not claim to hold something storage refused.
  expect(screen.getByText(/could not be saved/i)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Rent' })).toBeNull();
  expect(localStorage.getItem('personal-tracker/v1')).toBeNull();
});

test('the warning clears once a write succeeds again', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.type(screen.getByLabelText('Title'), 'Rent');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: todayIso() },
  });
  withFullStorage(() => {
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
  });
  expect(screen.getByText(/could not be saved/i)).toBeVisible();

  // Typed again, because a refused write still clears the form. See the note
  // in the session log: that is a separate wart, not part of this fix.
  await user.type(screen.getByLabelText('Title'), 'Rent');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: todayIso() },
  });
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.queryByText(/could not be saved/i)).toBeNull();
  expect(screen.getByRole('button', { name: 'Rent' })).toBeVisible();
});

/**
 * Change an item's repeat through the panel the row opens, then close it.
 *
 * Closing is what a person does, and it matters for the assertions too: an
 * open row contains the repeat select, whose options read the same words as
 * the badge, so "Monthly" would match twice inside the one row.
 */
async function setRepeat(title: string, repeat: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: title }));
  await user.selectOptions(
    screen.getByLabelText(`Repeat for ${title}`),
    repeat,
  );
  await user.click(screen.getByRole('button', { name: `Save ${title}` }));
  await user.click(screen.getByRole('button', { name: title }));
}

test('AC-29.2 a plain item can be made to repeat, and it sticks', async () => {
  const first = render(<App />);
  await addRepeating('Rent', '2026-10-01', 'none');

  await setRepeat('Rent', 'monthly');

  expect(
    within(screen.getByRole('listitem')).getByText('Monthly'),
  ).toBeVisible();

  first.unmount();
  render(<App />);
  expect(
    within(screen.getByRole('listitem')).getByText('Monthly'),
  ).toBeVisible();
});

test('AC-29.3 a repeating item can be stopped', async () => {
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await setRepeat('Rent', 'none');

  const row = within(screen.getByRole('listitem'));
  expect(row.queryByText('Monthly')).toBeNull();
});

test('AC-29.4 a stopped item creates nothing when it is finished', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'monthly');

  await setRepeat('Rent', 'none');
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  // The off switch is the point of the story: no new item.
  expect(storedTitles()).toHaveLength(1);
});

test('AC-29.5 weekly changed to monthly comes back a month later', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'weekly');

  await setRepeat('Rent', 'monthly');
  await user.click(screen.getByRole('button', { name: 'Mark Rent done' }));

  const raw = localStorage.getItem('personal-tracker/v1')!;
  const items = (JSON.parse(raw) as { items: Record<string, string>[] }).items;
  const next = new Date(items.find((i) => i.status === 'open')!.dueAt!);

  expect(next.getMonth()).toBe(10);
  expect(next.getDate()).toBe(1);
});

test('AC-29.6 changing the repeat leaves the deadline where it was', async () => {
  render(<App />);
  await addRepeating('Rent', '2026-10-01', 'none');
  const before = storedTitles()[0] as unknown as { dueAt: string };

  await setRepeat('Rent', 'monthly');

  const after = storedTitles()[0] as unknown as { dueAt: string };
  expect(after.dueAt).toBe(before.dueAt);
});

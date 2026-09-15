import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

async function addItem(title: string, due: string) {
  const user = userEvent.setup();
  // user-event rejects an empty string, so an omitted field is just not typed.
  if (title) await user.type(screen.getByLabelText('Title'), title);
  if (due) await user.type(screen.getByLabelText('Due'), due);
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

test('AC-05.3 Tab reaches each item control in display order', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('aa first', todayIso());
  await addItem('bb second', todayIso());

  screen.getByRole('button', { name: 'Add' }).focus();

  // Each item contributes its done control then its note field, and the items
  // themselves follow display order. US-06 added the note to this sequence.
  const expected = [
    'Mark aa first done',
    'Note for aa first',
    'Mark bb second done',
    'Note for bb second',
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

  await user.type(
    screen.getByRole('textbox', { name: 'Note for Rent' }),
    'Zelle, not Venmo',
  );
  await user.tab();
  first.unmount();

  render(<App />);
  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toHaveValue(
    'Zelle, not Venmo',
  );
});

test('AC-06.1 a note lands on the right item when several exist', async () => {
  const user = userEvent.setup();
  render(<App />);
  await addItem('Rent', todayIso());
  await addItem('Laundry', todayIso());

  await user.type(
    screen.getByRole('textbox', { name: 'Note for Laundry' }),
    'quarters',
  );
  await user.tab();

  expect(screen.getByRole('textbox', { name: 'Note for Rent' })).toHaveValue(
    '',
  );
  expect(screen.getByRole('textbox', { name: 'Note for Laundry' })).toHaveValue(
    'quarters',
  );
});

test('AC-06.3 a 2000 character note is stored and shown in full', async () => {
  const long = 'x'.repeat(2000);
  const first = render(<App />);
  await addItem('Rent', todayIso());

  // Typed character by character this would take minutes, so the value is set
  // directly and blurred, which is the same path the component takes.
  const field = screen.getByRole('textbox', { name: 'Note for Rent' });
  fireEvent.change(field, { target: { value: long } });
  fireEvent.blur(field);
  first.unmount();

  render(<App />);
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
  expect(parsed.version).toBe(1);
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
    version: 1,
    items: [],
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

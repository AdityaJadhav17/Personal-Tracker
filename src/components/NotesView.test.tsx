import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesView from './NotesView';
import type { Note } from '../domain/types';

// Monday 28 September 2026, 3pm local.
const NOW = new Date(2026, 8, 28, 15, 0, 0, 0);
const noop = () => {};

function aNote(id: string, body: string, updated: Date): Note {
  return {
    id,
    body,
    createdAt: updated.toISOString(),
    updatedAt: updated.toISOString(),
  };
}

const NOTES = [
  aNote('old', 'Landlord\nask about the sink', new Date(2026, 8, 24, 9)),
  aNote('new', 'Groceries\nmilk\neggs', new Date(2026, 8, 28, 14)),
];

function renderNotes(overrides: Partial<Parameters<typeof NotesView>[0]> = {}) {
  return render(
    <NotesView
      notes={NOTES}
      now={NOW}
      onAdd={() => 'made'}
      onChange={noop}
      onDelete={noop}
      {...overrides}
    />,
  );
}

/** Type into the editor the way the browser reports it: the whole text. */
function write(text: string) {
  const editor = screen.getByRole('textbox', { name: 'Note' });
  editor.textContent = text;
  fireEvent.input(editor);
}

test('AC-80.4 notes are grouped newest first, each with its title, when and preview', () => {
  renderNotes();

  const today = screen.getByRole('list', { name: 'Today' });
  expect(within(today).getByRole('button')).toHaveTextContent(
    'Groceries2:00 PMmilk',
  );
  const week = screen.getByRole('list', { name: 'Previous 7 Days' });
  expect(within(week).getByRole('button')).toHaveTextContent(
    'LandlordThursdayask about the sink',
  );
});

test('AC-80.1 the newest note is open beside the list', () => {
  renderNotes();

  expect(screen.getByRole('textbox', { name: 'Note' })).toHaveTextContent(
    'Groceries milk eggs',
  );
  expect(screen.getByRole('button', { name: /^Groceries/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('AC-80.1 choosing a note opens it', async () => {
  const user = userEvent.setup();
  renderNotes();

  await user.click(screen.getByRole('button', { name: /^Landlord/ }));

  expect(screen.getByRole('textbox', { name: 'Note' })).toHaveTextContent(
    'Landlord ask about the sink',
  );
});

test('AC-80.3 a note saves as you type', () => {
  const onChange = vi.fn<(id: string, body: string) => void>();
  renderNotes({ onChange });

  write('Groceries\nmilk\neggs\nbread');

  expect(onChange).toHaveBeenCalledWith('new', 'Groceries\nmilk\neggs\nbread');
});

test('AC-80.3 the editor says when the note was last edited', () => {
  renderNotes();

  expect(screen.getByText('September 28, 2026 at 2:00 PM')).toBeVisible();
});

test('AC-80.2 New note opens an empty note with the cursor in it', async () => {
  const user = userEvent.setup();
  renderNotes();

  await user.click(screen.getByRole('button', { name: 'New note' }));

  const editor = screen.getByRole('textbox', { name: 'Note' });
  expect(editor).toHaveTextContent('');
  expect(editor).toHaveFocus();
  expect(screen.getByRole('button', { name: /^New Note/ })).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('AC-80.2 the new note is made by the first thing typed, then edited', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(body: string) => string | null>(() => 'made');
  const onChange = vi.fn<(id: string, body: string) => void>();
  const props = { now: NOW, onAdd, onChange, onDelete: noop };
  const { rerender } = render(<NotesView notes={NOTES} {...props} />);

  await user.click(screen.getByRole('button', { name: 'New note' }));
  write('I');
  // The app hands the new note back, as it does once storage has it.
  rerender(
    <NotesView notes={[...NOTES, aNote('made', 'I', NOW)]} {...props} />,
  );
  write('Ideas');

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith('I');
  expect(onChange).toHaveBeenCalledWith('made', 'Ideas');
});

test('AC-80.2 a new note left empty is not kept', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(body: string) => string | null>(() => 'made');
  renderNotes({ onAdd });

  await user.click(screen.getByRole('button', { name: 'New note' }));
  await user.click(screen.getByRole('button', { name: /^Landlord/ }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /^New Note/ })).toBeNull();
});

test('AC-80.5 search keeps only the notes containing the words', async () => {
  const user = userEvent.setup();
  renderNotes();

  await user.type(
    screen.getByRole('searchbox', { name: 'Search notes' }),
    'SINK',
  );

  expect(screen.getByRole('button', { name: /^Landlord/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^Groceries/ })).toBeNull();
});

test('AC-80.5 a search with no match says so', async () => {
  const user = userEvent.setup();
  renderNotes();

  await user.type(
    screen.getByRole('searchbox', { name: 'Search notes' }),
    'zebra',
  );

  expect(screen.getByText('No Results')).toBeVisible();
});

test('AC-80.6 Delete removes the open note', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  renderNotes({ onDelete });

  await user.click(screen.getByRole('button', { name: 'Delete note' }));

  expect(onDelete).toHaveBeenCalledWith('new');
});

test('AC-80.8 an open note has a way back to the list', () => {
  renderNotes();

  expect(screen.getByRole('button', { name: 'Back to notes' })).toBeVisible();
});

test('AC-80.1 with no notes the list says so', () => {
  renderNotes({ notes: [] });

  expect(screen.getByText('No notes yet.')).toBeVisible();
  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
});

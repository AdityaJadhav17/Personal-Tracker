import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesView from './NotesView';
import { createLock, openSealed, seal, unlock } from '../domain/lock';
import type { Lock, Note, Sealed } from '../domain/types';

// Monday 28 September 2026, 3pm local.
const NOW = new Date(2026, 8, 28, 15, 0, 0, 0);
const noop = () => {};
const PASSCODE = 'hunter22';
const SECRET = 'Bank details\nPIN 4412';

function aNote(id: string, body: string): Note {
  const at = new Date(2026, 8, 28, 14).toISOString();
  return {
    id,
    body,
    createdAt: at,
    updatedAt: at,
    pinned: false,
    sealed: null,
  };
}

const GROCERIES = aNote('new', 'Groceries\nmilk\neggs');

let lock: Lock;
let locked: Note;

beforeAll(async () => {
  const made = await createLock(PASSCODE);
  lock = made.lock;
  locked = {
    ...aNote('bank', 'Bank details'),
    sealed: await seal(made.key, SECRET),
  };
});

type OnLock = (id: string, title: string, sealed: Sealed, lock?: Lock) => void;

function renderNotes(overrides: Partial<Parameters<typeof NotesView>[0]> = {}) {
  return render(
    <NotesView
      notes={[GROCERIES]}
      now={NOW}
      onAdd={() => 'made'}
      onChange={noop}
      onDelete={noop}
      onPin={noop}
      lock={null}
      onLock={noop}
      onUnlock={noop}
      {...overrides}
    />,
  );
}

async function openLocked(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Passcode'), PASSCODE);
  await user.click(screen.getByRole('button', { name: 'Open' }));
  return screen.findByRole('textbox', { name: 'Note' });
}

test('AC-82.8 and AC-82.1 the first lock warns, then asks for a passcode twice', async () => {
  const user = userEvent.setup();
  const onLock = vi.fn<OnLock>();
  renderNotes({ onLock });
  const submit = () =>
    user.click(screen.getByRole('button', { name: 'Lock with this passcode' }));

  await user.click(screen.getByRole('button', { name: 'Lock note' }));
  expect(screen.getByText(/cannot be recovered/)).toBeVisible();

  await user.type(screen.getByLabelText('New passcode'), 'short');
  await user.type(screen.getByLabelText('Confirm passcode'), 'short');
  await submit();
  expect(screen.getByRole('alert')).toHaveTextContent('at least 6');

  await user.clear(screen.getByLabelText('New passcode'));
  await user.clear(screen.getByLabelText('Confirm passcode'));
  await user.type(screen.getByLabelText('New passcode'), PASSCODE);
  await user.type(screen.getByLabelText('Confirm passcode'), 'hunter23');
  await submit();
  expect(screen.getByRole('alert')).toHaveTextContent('do not match');
  expect(onLock).not.toHaveBeenCalled();

  await user.clear(screen.getByLabelText('Confirm passcode'));
  await user.type(screen.getByLabelText('Confirm passcode'), PASSCODE);
  await submit();

  await waitFor(() => expect(onLock).toHaveBeenCalled());
  const [id, title, sealed, made] = onLock.mock.calls[0]!;
  expect([id, title]).toEqual(['new', 'Groceries']);
  // AC-82.2. What goes to storage opens with the passcode, and only then.
  const key = await unlock(made!, PASSCODE);
  expect(await openSealed(key!, sealed)).toBe('Groceries\nmilk\neggs');
});

test('AC-82.3 a locked note shows its title, and nothing more, until the passcode', () => {
  renderNotes({ notes: [locked], lock });

  expect(
    screen.getByRole('button', { name: /^Bank details/ }),
  ).toHaveTextContent('Locked');
  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  expect(screen.queryByText(/4412/)).toBeNull();
  expect(screen.getByLabelText('Passcode')).toBeVisible();
});

test('AC-82.3 a wrong passcode says so and opens nothing', async () => {
  const user = userEvent.setup();
  renderNotes({ notes: [locked], lock });

  await user.type(screen.getByLabelText('Passcode'), 'hunter23');
  await user.click(screen.getByRole('button', { name: 'Open' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'That passcode is not right.',
  );
  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
});

test('AC-82.3 and AC-82.4 the right passcode opens it, and typing saves it sealed', async () => {
  const user = userEvent.setup();
  const onChange =
    vi.fn<(id: string, body: string, sealed?: Sealed | null) => void>();
  renderNotes({ notes: [locked], lock, onChange });

  const editor = await openLocked(user);
  expect(editor).toHaveTextContent('Bank details PIN 4412');

  editor.textContent = 'Bank details\nPIN 9999';
  fireEvent.input(editor);

  await waitFor(() => expect(onChange).toHaveBeenCalled());
  const [id, title, sealed] = onChange.mock.calls.at(-1)!;
  expect([id, title]).toEqual(['bank', 'Bank details']);
  const key = await unlock(lock, PASSCODE);
  expect(await openSealed(key!, sealed!)).toBe('Bank details\nPIN 9999');
});

test('AC-82.5 Remove lock makes the note ordinary again', async () => {
  const user = userEvent.setup();
  const onUnlock = vi.fn<(id: string, body: string) => void>();
  renderNotes({ notes: [locked], lock, onUnlock });

  await openLocked(user);
  await user.click(screen.getByRole('button', { name: 'Remove lock' }));

  expect(onUnlock).toHaveBeenCalledWith('bank', SECRET);
});

test('AC-82.4 Lock now closes the locked notes again', async () => {
  const user = userEvent.setup();
  renderNotes({ notes: [locked], lock });

  await openLocked(user);
  await user.click(screen.getByRole('button', { name: 'Lock now' }));

  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  expect(screen.getByLabelText('Passcode')).toBeVisible();
});

test('AC-82.4 five minutes without typing locks them again', async () => {
  const user = userEvent.setup();
  renderNotes({ notes: [locked], lock });
  await openLocked(user);

  vi.useFakeTimers();
  try {
    // Typing restarts the five minutes, so it is the last keystroke that counts.
    const editor = screen.getByRole('textbox', { name: 'Note' });
    fireEvent.input(editor);
    act(() => vi.advanceTimersByTime(4 * 60 * 1000));
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeVisible();

    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  } finally {
    vi.useRealTimers();
  }
});

test('AC-82.1 once unlocked, another note locks with no second question', async () => {
  const user = userEvent.setup();
  const onLock = vi.fn<OnLock>();
  const plain = aNote('plain', 'Passwords\nwifi');
  renderNotes({ notes: [locked, plain], lock, onLock });

  await openLocked(user);
  await user.click(screen.getByRole('button', { name: /^Passwords/ }));
  await user.click(screen.getByRole('button', { name: 'Lock note' }));

  await waitFor(() => expect(onLock).toHaveBeenCalled());
  expect(onLock.mock.calls[0]![1]).toBe('Passwords');
  // The lock already exists, so no new one is made.
  expect(onLock.mock.calls[0]![3]).toBeUndefined();
});

test('AC-82.1 with a lock set but closed, locking asks for the passcode first', async () => {
  const user = userEvent.setup();
  const onLock = vi.fn<OnLock>();
  renderNotes({ lock, onLock });

  await user.click(screen.getByRole('button', { name: 'Lock note' }));
  await user.type(screen.getByLabelText('Passcode'), PASSCODE);
  await user.click(screen.getByRole('button', { name: 'Continue' }));

  await waitFor(() => expect(onLock).toHaveBeenCalled());
  expect(onLock.mock.calls[0]![1]).toBe('Groceries');
});

test('AC-82.6 search does not look inside a locked note', async () => {
  const user = userEvent.setup();
  renderNotes({ notes: [locked], lock });

  await user.type(
    screen.getByRole('searchbox', { name: 'Search notes' }),
    '4412',
  );

  expect(screen.getByText('No Results')).toBeVisible();
});

test('AC-83.2 the passcode fields ask the browser not to save the passcode', async () => {
  const user = userEvent.setup();
  renderNotes();

  await user.click(screen.getByRole('button', { name: 'Lock note' }));

  expect(screen.getByLabelText('New passcode')).toHaveAttribute(
    'autocomplete',
    'off',
  );
  expect(screen.getByLabelText('Confirm passcode')).toHaveAttribute(
    'autocomplete',
    'off',
  );
});

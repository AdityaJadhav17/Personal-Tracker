import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddItemForm from './AddItemForm';
import type { ItemDraft } from '../domain/types';

function setup() {
  const onAdd = vi.fn<(draft: ItemDraft) => boolean>(() => true);
  const titleRef = createRef<HTMLInputElement>();
  render(<AddItemForm onAdd={onAdd} titleRef={titleRef} />);
  return { onAdd, user: userEvent.setup() };
}

/** Date and time inputs take a value rather than keystrokes. */
function pickDate(value: string) {
  fireEvent.change(screen.getByLabelText('Due'), { target: { value } });
}

function pickTime(value: string) {
  fireEvent.change(screen.getByLabelText('Time'), { target: { value } });
}

/** The draft's due instant, read back in local time the way it renders. */
function dueOf(onAdd: { mock: { calls: [ItemDraft][] } }) {
  return new Date(onAdd.mock.calls[0]![0].dueAt);
}

test('AC-01.1 submitting a complete form reports the draft', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'CSE 100 project');
  pickDate('2026-10-03');
  await user.selectOptions(screen.getByLabelText('Category'), 'academic');
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'CSE 100 project',
      category: 'academic',
      priority: 'high',
    }),
  );
});

test('AC-19.2 a date with no time is due at the end of that day', () => {
  const { onAdd } = setup();

  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Rent' },
  });
  pickDate('2026-10-03');
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  // Asserted in local fields. A hardcoded UTC literal would pass in Pacific
  // and fail on a UTC CI runner.
  const due = dueOf(onAdd);
  expect(due.getFullYear()).toBe(2026);
  expect(due.getMonth() + 1).toBe(10);
  expect(due.getDate()).toBe(3);
  expect(due.getHours()).toBe(23);
  expect(due.getMinutes()).toBe(59);
});

test('AC-19.3 a picked time reaches the draft', () => {
  const { onAdd } = setup();

  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: 'Dentist' },
  });
  pickDate('2026-10-03');
  pickTime('14:30');
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));

  const due = dueOf(onAdd);
  expect(due.getDate()).toBe(3);
  expect(due.getHours()).toBe(14);
  expect(due.getMinutes()).toBe(30);
});

test('AC-01.1 the form clears after a successful submit', async () => {
  const { user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Rent');
  pickDate('2026-10-01');
  pickTime('17:00');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(screen.getByLabelText('Due')).toHaveValue('');
  expect(screen.getByLabelText('Time')).toHaveValue('');
});

test('AC-01.2 submitting without a title creates nothing', async () => {
  const { onAdd, user } = setup();

  pickDate('2026-10-03');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-01.2 submitting without a title shows a message on the title field', async () => {
  const { user } = setup();

  pickDate('2026-10-03');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
    'Give it a title.',
  );
});

test('AC-01.2 a title of only spaces counts as missing', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), '   ');
  pickDate('2026-10-03');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-19.4 no date creates nothing and says so', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Dentist');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Due')).toHaveAccessibleDescription(
    'Pick a date.',
  );
});

test('AC-19.4 a time with no date is still refused', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Dentist');
  pickTime('14:30');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-01.3 submitting without choosing a priority reports "normal"', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Tuition');
  pickDate('2026-10-03');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ priority: 'normal' }),
  );
});

test('the title message clears once a title is given and resubmitted', async () => {
  const { onAdd, user } = setup();

  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
    'Give it a title.',
  );

  await user.type(screen.getByLabelText('Title'), 'Rent');
  pickDate('2026-10-01');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Title')).not.toHaveAccessibleDescription();
});

test('AC-01.3 category and priority go back to their defaults after a submit', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'CSE 100 project');
  pickDate('2026-10-03');
  await user.selectOptions(screen.getByLabelText('Category'), 'personal');
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Category')).toHaveValue('academic');
  expect(screen.getByLabelText('Priority')).toHaveValue('normal');

  // The next item must not inherit the previous one's choices.
  await user.type(screen.getByLabelText('Title'), 'Laundry');
  pickDate('2026-10-04');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenLastCalledWith(
    expect.objectContaining({ category: 'academic', priority: 'normal' }),
  );
});

test('AC-28.1 an item can be set to repeat when it is added', async () => {
  const user = userEvent.setup();
  const drafts: ItemDraft[] = [];
  render(
    <AddItemForm
      onAdd={(d) => {
        drafts.push(d);
        return true;
      }}
      titleRef={createRef()}
    />,
  );

  await user.type(screen.getByLabelText('Title'), 'Rent');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: '2026-10-01' },
  });
  await user.selectOptions(screen.getByLabelText('Repeat'), 'monthly');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(drafts[0]?.repeat).toBe('monthly');
});

test('AC-28.3 an item does not repeat unless you say so', async () => {
  const user = userEvent.setup();
  const drafts: ItemDraft[] = [];
  render(
    <AddItemForm
      onAdd={(d) => {
        drafts.push(d);
        return true;
      }}
      titleRef={createRef()}
    />,
  );

  await user.type(screen.getByLabelText('Title'), 'Midterm');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: '2026-10-01' },
  });
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(drafts[0]?.repeat).toBe('none');
});

test('AC-28.1 the repeat choice resets with the rest of the form', async () => {
  const user = userEvent.setup();
  render(<AddItemForm onAdd={() => true} titleRef={createRef()} />);

  await user.type(screen.getByLabelText('Title'), 'Rent');
  fireEvent.change(screen.getByLabelText('Due'), {
    target: { value: '2026-10-01' },
  });
  await user.selectOptions(screen.getByLabelText('Repeat'), 'monthly');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Repeat')).toHaveValue('none');
});

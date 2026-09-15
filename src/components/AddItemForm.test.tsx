import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddItemForm from './AddItemForm';
import type { ItemDraft } from '../domain/types';

const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function setup() {
  const onAdd = vi.fn<(draft: ItemDraft) => void>();
  const titleRef = createRef<HTMLInputElement>();
  render(<AddItemForm onAdd={onAdd} now={NOW} titleRef={titleRef} />);
  return { onAdd, user: userEvent.setup() };
}

test('AC-01.1 submitting a complete form reports the draft', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'CSE 100 project');
  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.selectOptions(screen.getByLabelText('Category'), 'academic');
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith({
    title: 'CSE 100 project',
    dueAt: expect.any(String) as unknown as string,
    category: 'academic',
    priority: 'high',
  });

  // Assert the instant by what it renders as locally. Hardcoding a UTC literal
  // here would pass in Pacific and fail on a UTC CI runner.
  const due = new Date(onAdd.mock.calls[0]![0].dueAt);
  expect(due.getFullYear()).toBe(2026);
  expect(due.getMonth() + 1).toBe(10);
  expect(due.getDate()).toBe(3);
  expect(due.getHours()).toBe(23);
  expect(due.getMinutes()).toBe(59);
});

test('AC-01.1 the form clears after a successful submit', async () => {
  const { user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Rent');
  await user.type(screen.getByLabelText('Due'), '10/1');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Title')).toHaveValue('');
  expect(screen.getByLabelText('Due')).toHaveValue('');
});

test('AC-01.2 submitting without a title creates nothing', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-01.2 submitting without a title shows a message on the title field', async () => {
  const { user } = setup();

  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
    'Give it a title.',
  );
});

test('AC-01.2 a title of only spaces counts as missing', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), '   ');
  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-01.3 submitting without choosing a priority reports "normal"', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Tuition');
  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ priority: 'normal' }),
  );
});

test('a due date that cannot be read creates nothing and says so', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Dentist');
  await user.type(screen.getByLabelText('Due'), 'sometime next week');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Due')).toHaveAccessibleDescription(
    'Try "oct 3", "10/3", or "oct 3 2pm".',
  );
});

test('the title message clears once a title is typed and resubmitted', async () => {
  const { onAdd, user } = setup();

  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByLabelText('Title')).toHaveAccessibleDescription(
    'Give it a title.',
  );

  await user.type(screen.getByLabelText('Title'), 'Rent');
  await user.type(screen.getByLabelText('Due'), '10/1');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Title')).not.toHaveAccessibleDescription();
});

test('AC-01.4 a time typed after the date reaches the draft', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'Dentist');
  await user.type(screen.getByLabelText('Due'), 'oct 3 2pm');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  const due = new Date(onAdd.mock.calls[0]![0].dueAt);
  expect(due.getDate()).toBe(3);
  expect(due.getHours()).toBe(14);
  expect(due.getMinutes()).toBe(0);
});

test('AC-01.3 category and priority go back to their defaults after a submit', async () => {
  const { onAdd, user } = setup();

  await user.type(screen.getByLabelText('Title'), 'CSE 100 project');
  await user.type(screen.getByLabelText('Due'), '10/3');
  await user.selectOptions(screen.getByLabelText('Category'), 'personal');
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Category')).toHaveValue('academic');
  expect(screen.getByLabelText('Priority')).toHaveValue('normal');

  // The next item must not inherit the previous one's choices.
  await user.type(screen.getByLabelText('Title'), 'Laundry');
  await user.type(screen.getByLabelText('Due'), '10/4');
  await user.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAdd).toHaveBeenLastCalledWith(
    expect.objectContaining({ category: 'academic', priority: 'normal' }),
  );
});

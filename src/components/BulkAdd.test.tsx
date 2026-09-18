import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkAdd from './BulkAdd';
import type { ItemDraft } from '../domain/types';

const noop = () => {};

function box() {
  return screen.getByLabelText('Paste a list');
}

test('AC-26.1 what each line was understood as is shown before anything saves', async () => {
  const user = userEvent.setup();
  const added: ItemDraft[][] = [];
  render(<BulkAdd onAdd={(drafts) => added.push(drafts)} onClose={noop} />);

  await user.click(box());
  await user.paste('2026-10-03 Read chapter 4\n2026-10-09 17:00 Rent');

  expect(screen.getByText('Read chapter 4')).toBeVisible();
  expect(screen.getByText('Rent')).toBeVisible();
  // Nothing is written by looking at it.
  expect(added).toEqual([]);
});

test('AC-26.1 the preview shows the date each line was read as', async () => {
  const user = userEvent.setup();
  render(<BulkAdd onAdd={noop} onClose={noop} />);

  await user.click(box());
  await user.paste('2026-10-03 Read chapter 4');

  expect(screen.getByText(/Oct 3/)).toBeVisible();
});

test('AC-26.2 confirming adds every understood line at once', async () => {
  const user = userEvent.setup();
  const added: ItemDraft[][] = [];
  render(<BulkAdd onAdd={(drafts) => added.push(drafts)} onClose={noop} />);

  await user.click(box());
  await user.paste('2026-10-01 Rent\n2026-10-03 Midterm\n2026-10-09 Lab 3');
  await user.click(screen.getByRole('button', { name: 'Add 3 items' }));

  expect(added).toHaveLength(1);
  expect(added[0]?.map((d) => d.title)).toEqual(['Rent', 'Midterm', 'Lab 3']);
});

test('AC-26.2 one understood line is offered in the singular', async () => {
  const user = userEvent.setup();
  render(<BulkAdd onAdd={noop} onClose={noop} />);

  await user.click(box());
  await user.paste('2026-10-01 Rent');

  expect(screen.getByRole('button', { name: 'Add 1 item' })).toBeVisible();
});

test('AC-26.3 a line that could not be read is listed, and the rest still go', async () => {
  const user = userEvent.setup();
  const added: ItemDraft[][] = [];
  render(<BulkAdd onAdd={(drafts) => added.push(drafts)} onClose={noop} />);

  await user.click(box());
  await user.paste('2026-10-01 Rent\nnext tuesday something');

  expect(screen.getByText('next tuesday something')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Add 1 item' }));

  expect(added[0]?.map((d) => d.title)).toEqual(['Rent']);
});

test('AC-26.4 cancelling adds nothing', async () => {
  const user = userEvent.setup();
  const added: ItemDraft[][] = [];
  const closed: number[] = [];
  render(
    <BulkAdd
      onAdd={(drafts) => added.push(drafts)}
      onClose={() => closed.push(1)}
    />,
  );

  await user.click(box());
  await user.paste('2026-10-01 Rent');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(added).toEqual([]);
  expect(closed).toHaveLength(1);
});

test('AC-26.6 text that is not a list says so and offers nothing to add', async () => {
  const user = userEvent.setup();
  render(<BulkAdd onAdd={noop} onClose={noop} />);

  await user.click(box());
  await user.paste('Welcome to CSE 110. Office hours are Tuesday.');

  expect(screen.getByText(/Nothing here could be read/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /^Add / })).toBeNull();
});

test('AC-26.6 an empty box offers nothing and complains about nothing', () => {
  render(<BulkAdd onAdd={noop} onClose={noop} />);

  expect(screen.queryByRole('button', { name: /^Add / })).toBeNull();
  expect(screen.queryByText(/Nothing here could be read/)).toBeNull();
});

test('the format is stated, because a strict one has to be', () => {
  render(<BulkAdd onAdd={noop} onClose={noop} />);

  expect(screen.getByText('2026-10-03 Read chapter 4')).toBeVisible();
  expect(screen.getByText('2026-10-03 17:00 Rent')).toBeVisible();
});

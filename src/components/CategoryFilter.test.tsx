import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryFilter from './CategoryFilter';
import type { Filter } from './CategoryFilter';

const noop = () => {};

test('AC-08.1 every category is offered, plus everything', () => {
  render(<CategoryFilter value="all" onChange={noop} />);

  for (const label of ['All', 'Academic', 'Personal']) {
    expect(screen.getByRole('button', { name: label })).toBeVisible();
  }
});

test('AC-08.1 choosing a category reports it', async () => {
  const user = userEvent.setup();
  const chosen: Filter[] = [];
  render(<CategoryFilter value="all" onChange={(f) => chosen.push(f)} />);

  await user.click(screen.getByRole('button', { name: 'Academic' }));

  expect(chosen).toEqual(['academic']);
});

test('AC-08.1 going back to everything reports all', async () => {
  const user = userEvent.setup();
  const chosen: Filter[] = [];
  render(<CategoryFilter value="academic" onChange={(f) => chosen.push(f)} />);

  await user.click(screen.getByRole('button', { name: 'All' }));

  expect(chosen).toEqual(['all']);
});

test('AC-08.1 the one in force is the one marked, for a screen reader too', () => {
  render(<CategoryFilter value="personal" onChange={noop} />);

  expect(screen.getByRole('button', { name: 'Personal' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('the control says what it is, rather than being three bare words', () => {
  render(<CategoryFilter value="all" onChange={noop} />);

  expect(screen.getByRole('group', { name: 'Show' })).toBeVisible();
});

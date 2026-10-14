import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SyncStatus from './SyncStatus';

const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function renderSync(overrides: Partial<Parameters<typeof SyncStatus>[0]> = {}) {
  const props = {
    state: 'idle' as const,
    at: null,
    reason: '',
    syncNow: vi.fn(() => Promise.resolve()),
    now: NOW,
    ...overrides,
  };
  render(<SyncStatus {...props} />);
  return props;
}

test('AC-101.5 a synced copy says when', () => {
  renderSync({
    state: 'synced',
    at: new Date(2026, 8, 15, 9, 41).toISOString(),
  });
  expect(screen.getByText('Synced 9:41 AM')).toBeInTheDocument();
});

test('AC-101.5 an unreachable laptop is not an error', () => {
  renderSync({ state: 'unreachable' });
  expect(
    screen.getByText('Laptop not reachable; will sync when it is.'),
  ).toBeInTheDocument();
});

test('AC-101.5 a refusal says why', () => {
  renderSync({ state: 'failed', reason: 'The laptop refused this device.' });
  expect(
    screen.getByText('Sync failed: The laptop refused this device.'),
  ).toBeInTheDocument();
});

test('AC-101.5 before the first round it says it is syncing', () => {
  renderSync();
  expect(screen.getByText('Syncing…')).toBeInTheDocument();
});

test('AC-101.5 Sync now runs a round', async () => {
  const props = renderSync();
  await userEvent.click(screen.getByRole('button', { name: 'Sync now' }));
  expect(props.syncNow).toHaveBeenCalledTimes(1);
});

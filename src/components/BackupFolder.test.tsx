import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackupFolder from './BackupFolder';

const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function renderBackup(
  overrides: Partial<Parameters<typeof BackupFolder>[0]> = {},
) {
  const props = {
    supported: true,
    folder: null,
    state: 'off' as const,
    reason: '',
    lastAt: null,
    choose: vi.fn(() => Promise.resolve()),
    allow: vi.fn(() => Promise.resolve()),
    now: NOW,
    ...overrides,
  };
  render(<BackupFolder {...props} />);
  return props;
}

test('AC-95.6 nothing is shown where folders cannot be written', () => {
  const { container } = render(
    <BackupFolder
      supported={false}
      folder={null}
      state="off"
      reason=""
      lastAt={null}
      choose={vi.fn()}
      allow={vi.fn()}
      now={NOW}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});

test('AC-95.1 with no folder yet, it offers one and says to keep it out of OneDrive', async () => {
  const { choose } = renderBackup();
  expect(screen.getByText(/outside OneDrive/)).toBeVisible();

  await userEvent.click(
    screen.getByRole('button', { name: 'Choose backup folder' }),
  );
  expect(choose).toHaveBeenCalled();
});

test('AC-95.1 a chosen folder is named, with when the last copy was made', () => {
  renderBackup({
    folder: 'PersonalTracker-Backups',
    state: 'on',
    lastAt: new Date(2026, 8, 15, 9, 41).toISOString(),
  });
  expect(
    screen.getByText(/Backing up to PersonalTracker-Backups/),
  ).toHaveTextContent('Last copy 9:41 AM');
  expect(screen.getByRole('button', { name: 'Change folder' })).toBeVisible();
});

test('AC-95.5 paused backups say why, with one button to allow them again', async () => {
  const { allow } = renderBackup({
    folder: 'PersonalTracker-Backups',
    state: 'paused',
    reason: 'The browser needs your permission again to write to this folder.',
  });
  expect(screen.getByRole('status')).toHaveTextContent(
    'Backups to PersonalTracker-Backups are paused. The browser needs your permission again',
  );

  await userEvent.click(
    screen.getByRole('button', { name: 'Allow backups again' }),
  );
  expect(allow).toHaveBeenCalled();
});

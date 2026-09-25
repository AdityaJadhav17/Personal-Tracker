import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TrendsView from './TrendsView';
import type { DayPoint } from '../domain/trends';

function series(...points: DayPoint[]): DayPoint[] {
  return points;
}

test('AC-18.3 fewer than two days of data says so, and draws nothing', () => {
  render(
    <TrendsView
      series={series({ day: '2026-09-14', score: 3, completed: 0 })}
    />,
  );

  expect(screen.getByText(/not enough yet/i)).toBeVisible();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('AC-18.3 no data at all says the same thing', () => {
  render(<TrendsView series={[]} />);

  expect(screen.getByText(/not enough yet/i)).toBeVisible();
});

test('AC-18.1 with two days the reflection line is drawn', () => {
  render(
    <TrendsView
      series={series(
        { day: '2026-09-14', score: 3, completed: 0 },
        { day: '2026-09-15', score: 5, completed: 1 },
      )}
    />,
  );

  expect(screen.getByRole('img', { name: /how the day went/i })).toBeVisible();
});

test('AC-18.2 the completions line is a separate chart, not a second axis', () => {
  render(
    <TrendsView
      series={series(
        { day: '2026-09-14', score: 3, completed: 2 },
        { day: '2026-09-15', score: 5, completed: 1 },
      )}
    />,
  );

  const charts = screen.getAllByRole('img');
  expect(charts).toHaveLength(2);
  expect(screen.getByRole('img', { name: /items finished/i })).toBeVisible();
});

test('AC-18.4 and AC-65.2 the same numbers are a table, behind Show the numbers', async () => {
  const user = userEvent.setup();
  render(
    <TrendsView
      series={series(
        { day: '2026-09-14', score: 3, completed: 2 },
        { day: '2026-09-15', score: 5, completed: 1 },
      )}
    />,
  );

  const table = screen.getByRole('table');
  expect(table).not.toBeVisible();
  await user.click(screen.getByText('Show the numbers'));
  expect(table).toBeVisible();
  // AC-61.1. The day reads as a date.
  expect(screen.getByRole('row', { name: /Tue, Sep 15/ })).toHaveTextContent(
    '5',
  );
});

test('AC-18.4 a day with no reflection reads as no entry, not as zero', () => {
  render(
    <TrendsView
      series={series(
        { day: '2026-09-14', score: 3, completed: 2 },
        { day: '2026-09-15', score: null, completed: 1 },
        { day: '2026-09-16', score: 4, completed: 0 },
      )}
    />,
  );

  expect(screen.getByRole('row', { name: /Tue, Sep 15/ })).toHaveTextContent(
    'No entry',
  );
});

test('AC-18.4 the table has a row for every day in the range', () => {
  render(
    <TrendsView
      series={series(
        { day: '2026-09-14', score: 3, completed: 2 },
        { day: '2026-09-15', score: null, completed: 0 },
        { day: '2026-09-16', score: 4, completed: 0 },
      )}
    />,
  );

  // Three days plus the header row.
  expect(screen.getAllByRole('row')).toHaveLength(4);
});

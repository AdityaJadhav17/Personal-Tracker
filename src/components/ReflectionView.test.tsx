import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReflectionView, { SCORES } from './ReflectionView';
import type { Reflection } from '../domain/types';

const noop = () => {};
const TODAY = '2026-09-15';

function aReflection(
  day: string,
  score: Reflection['score'],
  note = '',
): Reflection {
  return { id: day, day, score, note, createdAt: '2026-09-15T21:00:00.000Z' };
}

test('AC-17.1 it asks how today went, with five choices', () => {
  render(<ReflectionView today={TODAY} reflections={[]} onRecord={noop} />);

  expect(screen.getByText('How did today go?')).toBeVisible();
  expect(SCORES).toHaveLength(5);
  for (const { label } of SCORES) {
    expect(screen.getByRole('button', { name: label })).toBeVisible();
  }
});

test('AC-17.2 choosing a score reports it', async () => {
  const user = userEvent.setup();
  const onRecord = vi.fn<(score: number, note: string) => void>();
  render(<ReflectionView today={TODAY} reflections={[]} onRecord={onRecord} />);

  await user.click(screen.getByRole('button', { name: 'Good' }));

  expect(onRecord).toHaveBeenCalledWith(4, '');
});

test('AC-17.2 today already recorded shows which score was chosen', () => {
  render(
    <ReflectionView
      today={TODAY}
      reflections={[aReflection(TODAY, 4)]}
      onRecord={noop}
    />,
  );

  expect(screen.getByRole('button', { name: 'Good' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Meh' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('AC-17.3 choosing a different score reports the new one', async () => {
  const user = userEvent.setup();
  const onRecord = vi.fn<(score: number, note: string) => void>();
  render(
    <ReflectionView
      today={TODAY}
      reflections={[aReflection(TODAY, 2, 'rough')]}
      onRecord={onRecord}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Awesome' }));

  // The note it already had rides along, so changing the face does not wipe it.
  expect(onRecord).toHaveBeenCalledWith(5, 'rough');
});

test('AC-17.2 the note appears only once today has a score', () => {
  const { rerender } = render(
    <ReflectionView today={TODAY} reflections={[]} onRecord={noop} />,
  );
  expect(screen.queryByLabelText('Note for today')).not.toBeInTheDocument();

  rerender(
    <ReflectionView
      today={TODAY}
      reflections={[aReflection(TODAY, 3)]}
      onRecord={noop}
    />,
  );
  expect(screen.getByLabelText('Note for today')).toBeVisible();
});

test('AC-17.2 the note is reported on blur, keeping the score', async () => {
  const user = userEvent.setup();
  const onRecord = vi.fn<(score: number, note: string) => void>();
  render(
    <ReflectionView
      today={TODAY}
      reflections={[aReflection(TODAY, 3)]}
      onRecord={onRecord}
    />,
  );

  await user.type(screen.getByLabelText('Note for today'), 'long lab');
  await user.tab();

  expect(onRecord).toHaveBeenCalledWith(3, 'long lab');
});

test('AC-17.4 past days are listed newest first, with scores and notes', () => {
  render(
    <ReflectionView
      today={TODAY}
      reflections={[
        aReflection('2026-09-13', 2, 'bad monday'),
        aReflection('2026-09-14', 5, 'good tuesday'),
      ]}
      onRecord={noop}
    />,
  );

  const days = screen
    .getAllByRole('listitem')
    .map((li) => li.textContent ?? '');

  expect(days[0]).toContain('Awesome');
  expect(days[0]).toContain('good tuesday');
  expect(days[1]).toContain('bad monday');
});

test('AC-17.4 today is not repeated in the list of past days', () => {
  render(
    <ReflectionView
      today={TODAY}
      reflections={[aReflection(TODAY, 3), aReflection('2026-09-14', 5)]}
      onRecord={noop}
    />,
  );

  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});

test('AC-17.4 with no past days it says so rather than showing an empty list', () => {
  render(<ReflectionView today={TODAY} reflections={[]} onRecord={noop} />);

  expect(screen.getByText('Nothing recorded yet.')).toBeVisible();
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarFileImport from './CalendarFileImport';
import type { Course, Item } from '../domain/types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

const COURSE: Course = {
  id: 'cse123',
  name: 'CSE 123',
  meetingLocation: '',
  professorEmail: '',
  officeHours: '',
  createdAt: '2026-09-01T00:00:00.000Z',
};

const HELD: Item = {
  id: 'held',
  title: 'HW 1',
  dueAt: '2026-10-08T06:59:00.000Z',
  category: 'academic',
  priority: 'normal',
  status: 'open',
  note: '',
  createdAt: '2026-09-01T00:00:00.000Z',
  completedAt: null,
  goalId: null,
  courseId: null,
  repeat: 'none',
  repeatDay: null,
  parentId: null,
};

function ics(): File {
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'SUMMARY:HW 1',
    'DTSTART:20261008T065900Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:HW 2',
    'DTSTART:20261022T065900Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Project 1a',
    'DTSTART:20261013T065900Z',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'SUMMARY:Last week',
    'DTSTART:20260901T065900Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new File([text], 'cse123.ics', { type: 'text/calendar' });
}

function setup() {
  const onAdd = vi.fn();
  render(
    <CalendarFileImport
      items={[HELD]}
      courses={[COURSE]}
      now={NOW}
      onAdd={onAdd}
    />,
  );
  return { onAdd, user: userEvent.setup() };
}

test('AC-43.9 choosing a file shows what would be added, and saves nothing yet', async () => {
  const { onAdd, user } = setup();

  await user.upload(screen.getByLabelText('Add from calendar file'), ics());

  const preview = await screen.findByRole('region', {
    name: 'Deadlines from the file',
  });
  expect(within(preview).getByText(/HW 2/)).toBeVisible();
  expect(within(preview).getByText(/Project 1a/)).toBeVisible();
  expect(within(preview).queryByText(/Last week/)).toBeNull();
  expect(preview).toHaveTextContent(
    '1 already in your list and 1 already past are left out.',
  );
  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-43.10 Add hands over the new deadlines and the course chosen for them', async () => {
  const { onAdd, user } = setup();
  await user.upload(screen.getByLabelText('Add from calendar file'), ics());
  const preview = await screen.findByRole('region', {
    name: 'Deadlines from the file',
  });

  await user.selectOptions(
    within(preview).getByRole('combobox', { name: 'Course for these' }),
    'cse123',
  );
  await user.click(within(preview).getByRole('button', { name: 'Add 2' }));

  expect(onAdd).toHaveBeenCalledTimes(1);
  const [drafts, courseId] = onAdd.mock.calls[0] as [
    { title: string }[],
    string | null,
  ];
  expect(drafts.map((d) => d.title)).toEqual(['HW 2', 'Project 1a']);
  expect(courseId).toBe('cse123');
  expect(
    screen.queryByRole('region', { name: 'Deadlines from the file' }),
  ).toBeNull();
});

test('AC-43.10 Cancel adds nothing', async () => {
  const { onAdd, user } = setup();
  await user.upload(screen.getByLabelText('Add from calendar file'), ics());

  await user.click(await screen.findByRole('button', { name: 'Cancel' }));

  expect(onAdd).not.toHaveBeenCalled();
});

test('AC-43.7 a file that is not a calendar says why', async () => {
  const { onAdd } = setup();
  // The picker filters to .ics, but "All files" is one click away, so the
  // component has to cope with anything.
  const user = userEvent.setup({ applyAccept: false });

  await user.upload(
    screen.getByLabelText('Add from calendar file'),
    new File(['{"version": 4}'], 'backup.json', { type: 'application/json' }),
  );

  expect(await screen.findByRole('alert')).toHaveTextContent(/not a calendar/i);
  expect(onAdd).not.toHaveBeenCalled();
});

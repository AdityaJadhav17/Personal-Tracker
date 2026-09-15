import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseList from './CourseList';
import type { Course, CourseDraft } from '../domain/types';

const noop = () => {};

function aCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'c1',
    name: 'CSE 100',
    meetingLocation: 'Center Hall 101',
    professorEmail: 'prof@ucsd.edu',
    officeHours: 'Tue 2-4pm, CSE 3108',
    createdAt: '2026-09-15T17:00:00.000Z',
    ...overrides,
  };
}

test('AC-07.1 the form offers all four details', () => {
  render(<CourseList courses={[]} onAdd={noop} onDelete={noop} />);

  expect(screen.getByLabelText('Course name')).toBeVisible();
  expect(screen.getByLabelText('Location')).toBeVisible();
  expect(screen.getByLabelText('Professor email')).toBeVisible();
  expect(screen.getByLabelText('Office hours')).toBeVisible();
});

test('AC-07.1 saving reports all four values', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(<CourseList courses={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Course name'), 'CSE 100');
  await user.type(screen.getByLabelText('Location'), 'Center Hall 101');
  await user.type(screen.getByLabelText('Professor email'), 'prof@ucsd.edu');
  await user.type(screen.getByLabelText('Office hours'), 'Tue 2-4pm');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(onAdd).toHaveBeenCalledWith({
    name: 'CSE 100',
    meetingLocation: 'Center Hall 101',
    professorEmail: 'prof@ucsd.edu',
    officeHours: 'Tue 2-4pm',
  });
});

test('AC-07.1 a saved course shows every detail back', () => {
  render(<CourseList courses={[aCourse()]} onAdd={noop} onDelete={noop} />);

  expect(screen.getByText('CSE 100')).toBeVisible();
  expect(screen.getByText('Center Hall 101')).toBeVisible();
  expect(screen.getByText('prof@ucsd.edu')).toBeVisible();
  expect(screen.getByText('Tue 2-4pm, CSE 3108')).toBeVisible();
});

test('AC-07.1 a course with no name is refused, with a message', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(<CourseList courses={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Location'), 'Center Hall 101');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Course name')).toHaveAccessibleDescription(
    'Give the course a name.',
  );
});

test('AC-07.1 the form clears after a course is saved', async () => {
  const user = userEvent.setup();
  render(<CourseList courses={[]} onAdd={noop} onDelete={noop} />);

  await user.type(screen.getByLabelText('Course name'), 'CSE 100');
  await user.type(screen.getByLabelText('Location'), 'Center Hall 101');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(screen.getByLabelText('Course name')).toHaveValue('');
  expect(screen.getByLabelText('Location')).toHaveValue('');
});

test('AC-07.1 a detail left blank is allowed, only the name is required', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(<CourseList courses={[]} onAdd={onAdd} onDelete={noop} />);

  await user.type(screen.getByLabelText('Course name'), 'CSE 100');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'CSE 100', officeHours: '' }),
  );
});

test('AC-20.3 deleting asks before anything is removed', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(<CourseList courses={[aCourse()]} onAdd={noop} onDelete={onDelete} />);

  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeVisible();
});

test('AC-20.3 confirming reports the course id', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(<CourseList courses={[aCourse()]} onAdd={noop} onDelete={onDelete} />);

  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

  expect(onDelete).toHaveBeenCalledWith('c1');
});

test('AC-20.3 keeping it removes nothing and puts the question away', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(<CourseList courses={[aCourse()]} onAdd={noop} onDelete={onDelete} />);

  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Keep' }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('button', { name: 'Yes, delete' }),
  ).not.toBeInTheDocument();
});

test('AC-20.3 the question names the course, so you know which one', async () => {
  const user = userEvent.setup();
  render(
    <CourseList
      courses={[aCourse(), aCourse({ id: 'c2', name: 'MATH 20C' })]}
      onAdd={noop}
      onDelete={noop}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Delete MATH 20C' }));

  expect(screen.getByRole('status')).toHaveTextContent(
    'Delete MATH 20C? Its items stay.',
  );
});

test('with no courses an empty state explains what this is for', () => {
  render(<CourseList courses={[]} onAdd={noop} onDelete={noop} />);

  expect(screen.getByText('No courses yet.')).toBeVisible();
});

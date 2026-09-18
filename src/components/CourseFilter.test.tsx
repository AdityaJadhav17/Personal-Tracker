import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CourseFilter from './CourseFilter';
import type { Course } from '../domain/types';

const noop = () => {};

function aCourse(id: string, name: string): Course {
  return {
    id,
    name,
    meetingLocation: '',
    professorEmail: '',
    officeHours: '',
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

const COURSES = [aCourse('c1', 'CSE 110'), aCourse('c2', 'MATH 20C')];

test('AC-27.1 every recorded course is offered, plus all of them', () => {
  render(<CourseFilter courses={COURSES} value={null} onChange={noop} />);

  const control = screen.getByLabelText('Course');
  expect(control).toBeVisible();
  expect(screen.getByRole('option', { name: 'All courses' })).toBeVisible();
  expect(screen.getByRole('option', { name: 'CSE 110' })).toBeVisible();
  expect(screen.getByRole('option', { name: 'MATH 20C' })).toBeVisible();
});

test('AC-27.1 choosing a course reports its id', async () => {
  const user = userEvent.setup();
  const chosen: (string | null)[] = [];
  render(
    <CourseFilter
      courses={COURSES}
      value={null}
      onChange={(c) => chosen.push(c)}
    />,
  );

  await user.selectOptions(screen.getByLabelText('Course'), 'c1');

  expect(chosen).toEqual(['c1']);
});

test('AC-27.1 going back to all courses reports null, not an empty string', async () => {
  const user = userEvent.setup();
  const chosen: (string | null)[] = [];
  render(
    <CourseFilter
      courses={COURSES}
      value="c1"
      onChange={(c) => chosen.push(c)}
    />,
  );

  await user.selectOptions(screen.getByLabelText('Course'), '');

  expect(chosen).toEqual([null]);
});

test('AC-27.1 the course in force is the one selected', () => {
  render(<CourseFilter courses={COURSES} value="c2" onChange={noop} />);

  expect(screen.getByLabelText('Course')).toHaveValue('c2');
});

test('AC-27.2 with no courses recorded the control is not rendered at all', () => {
  render(<CourseFilter courses={[]} value={null} onChange={noop} />);

  expect(screen.queryByLabelText('Course')).toBeNull();
  // Not hidden, absent: an empty control would still take a tab stop.
  expect(screen.queryByRole('combobox')).toBeNull();
});

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
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={noop} onDelete={noop} />,
  );

  expect(screen.getByLabelText('Course name')).toBeVisible();
  expect(screen.getByLabelText('Location')).toBeVisible();
  expect(screen.getByLabelText('Professor email')).toBeVisible();
  expect(screen.getByLabelText('Office hours')).toBeVisible();
});

test('AC-07.1 saving reports all four values', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={onAdd} onDelete={noop} />,
  );

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
  render(
    <CourseList
      onEdit={noop}
      courses={[aCourse()]}
      onAdd={noop}
      onDelete={noop}
    />,
  );

  expect(screen.getByText('CSE 100')).toBeVisible();
  expect(screen.getByText('Center Hall 101')).toBeVisible();
  expect(screen.getByText('prof@ucsd.edu')).toBeVisible();
  expect(screen.getByText('Tue 2-4pm, CSE 3108')).toBeVisible();
});

test('AC-07.1 a course with no name is refused, with a message', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={onAdd} onDelete={noop} />,
  );

  await user.type(screen.getByLabelText('Location'), 'Center Hall 101');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(onAdd).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Course name')).toHaveAccessibleDescription(
    'Give the course a name.',
  );
});

test('AC-07.1 the form clears after a course is saved', async () => {
  const user = userEvent.setup();
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={noop} onDelete={noop} />,
  );

  await user.type(screen.getByLabelText('Course name'), 'CSE 100');
  await user.type(screen.getByLabelText('Location'), 'Center Hall 101');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(screen.getByLabelText('Course name')).toHaveValue('');
  expect(screen.getByLabelText('Location')).toHaveValue('');
});

test('AC-07.1 a detail left blank is allowed, only the name is required', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn<(draft: CourseDraft) => void>();
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={onAdd} onDelete={noop} />,
  );

  await user.type(screen.getByLabelText('Course name'), 'CSE 100');
  await user.click(screen.getByRole('button', { name: 'Add course' }));

  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'CSE 100', officeHours: '' }),
  );
});

test('AC-20.3 deleting asks before anything is removed', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <CourseList
      onEdit={noop}
      courses={[aCourse()]}
      onAdd={noop}
      onDelete={onDelete}
    />,
  );

  // US-60. Delete waits behind More, so a card you are reading cannot lose it.
  await user.click(screen.getByRole('button', { name: 'More for CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeVisible();
});

test('AC-20.3 confirming reports the course id', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <CourseList
      onEdit={noop}
      courses={[aCourse()]}
      onAdd={noop}
      onDelete={onDelete}
    />,
  );

  // US-60. Delete waits behind More, so a card you are reading cannot lose it.
  await user.click(screen.getByRole('button', { name: 'More for CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Delete CSE 100' }));
  await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

  expect(onDelete).toHaveBeenCalledWith('c1');
});

test('AC-20.3 keeping it removes nothing and puts the question away', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <CourseList
      onEdit={noop}
      courses={[aCourse()]}
      onAdd={noop}
      onDelete={onDelete}
    />,
  );

  // US-60. Delete waits behind More, so a card you are reading cannot lose it.
  await user.click(screen.getByRole('button', { name: 'More for CSE 100' }));
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
      onEdit={noop}
      courses={[aCourse(), aCourse({ id: 'c2', name: 'MATH 20C' })]}
      onAdd={noop}
      onDelete={noop}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'More for MATH 20C' }));
  await user.click(screen.getByRole('button', { name: 'Delete MATH 20C' }));

  expect(screen.getByRole('status')).toHaveTextContent(
    'Delete MATH 20C? Its items stay.',
  );
});

test('with no courses an empty state explains what this is for', () => {
  render(
    <CourseList onEdit={noop} courses={[]} onAdd={noop} onDelete={noop} />,
  );

  expect(screen.getByText('No courses yet.')).toBeVisible();
});

describe('US-60 the list first', () => {
  test('AC-60.1 with courses, the list shows and the form waits behind New course', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn<(draft: CourseDraft) => void>();
    const { rerender } = render(
      <CourseList
        onEdit={noop}
        courses={[aCourse()]}
        onAdd={onAdd}
        onDelete={noop}
      />,
    );

    expect(screen.getByText('CSE 100')).toBeVisible();
    expect(screen.queryByLabelText('Course name')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'New course' }));
    await user.type(screen.getByLabelText('Course name'), 'CSE 120');
    await user.click(screen.getByRole('button', { name: 'Add course' }));
    rerender(
      <CourseList
        onEdit={noop}
        courses={[aCourse(), aCourse({ id: 'c2', name: 'CSE 120' })]}
        onAdd={onAdd}
        onDelete={noop}
      />,
    );

    expect(onAdd).toHaveBeenCalled();
    expect(screen.queryByLabelText('Course name')).toBeNull();
  });

  test('AC-60.1 Cancel puts the form away without adding', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn<(draft: CourseDraft) => void>();
    render(
      <CourseList
        onEdit={noop}
        courses={[aCourse()]}
        onAdd={onAdd}
        onDelete={noop}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'New course' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Course name')).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
  });

  test('AC-60.2 a card offers no Delete until More is opened', async () => {
    const user = userEvent.setup();
    render(
      <CourseList
        onEdit={noop}
        courses={[aCourse()]}
        onAdd={noop}
        onDelete={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Delete CSE 100' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'More for CSE 100' }));

    expect(
      screen.getByRole('button', { name: 'Delete CSE 100' }),
    ).toBeVisible();
  });
});

describe('US-77 edit a course', () => {
  async function openEdit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'More for CSE 100' }));
    await user.click(screen.getByRole('button', { name: 'Edit CSE 100' }));
  }

  test('AC-77.1 Edit turns the card into the form, holding what it says now', async () => {
    const user = userEvent.setup();
    render(
      <CourseList
        courses={[aCourse()]}
        onAdd={noop}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    await openEdit(user);

    expect(screen.getByLabelText('Course name')).toHaveValue('CSE 100');
    expect(screen.getByLabelText('Location')).toHaveValue('Center Hall 101');
    expect(screen.getByLabelText('Office hours')).toHaveValue(
      'Tue 2-4pm, CSE 3108',
    );
  });

  test('AC-77.2 saving reports the same course with its new details', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn<(id: string, draft: CourseDraft) => void>();
    render(
      <CourseList
        courses={[aCourse()]}
        onAdd={noop}
        onEdit={onEdit}
        onDelete={noop}
      />,
    );

    await openEdit(user);
    await user.clear(screen.getByLabelText('Office hours'));
    await user.type(screen.getByLabelText('Office hours'), 'Wed 3-4pm');
    await user.click(screen.getByRole('button', { name: 'Save course' }));

    expect(onEdit).toHaveBeenCalledWith('c1', {
      name: 'CSE 100',
      meetingLocation: 'Center Hall 101',
      professorEmail: 'prof@ucsd.edu',
      officeHours: 'Wed 3-4pm',
    });
    expect(screen.queryByLabelText('Course name')).not.toBeInTheDocument();
  });

  test('AC-77.2 Cancel changes nothing', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CourseList
        courses={[aCourse()]}
        onAdd={noop}
        onEdit={onEdit}
        onDelete={noop}
      />,
    );

    await openEdit(user);
    await user.type(screen.getByLabelText('Location'), ' and online');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Center Hall 101')).toBeVisible();
  });

  test('AC-77.3 a blank name saves nothing and says why', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CourseList
        courses={[aCourse()]}
        onAdd={noop}
        onEdit={onEdit}
        onDelete={noop}
      />,
    );

    await openEdit(user);
    await user.clear(screen.getByLabelText('Course name'));
    await user.click(screen.getByRole('button', { name: 'Save course' }));

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText('Give the course a name.')).toBeVisible();
  });
});

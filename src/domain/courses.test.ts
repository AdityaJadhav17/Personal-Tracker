import { deleteCourse } from './courses';
import type { Course, Database, Item } from './types';

function anItem(id: string, courseId: string | null): Item {
  return {
    id,
    title: id,
    dueAt: '2026-10-04T06:59:00.000Z',
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: '2026-09-15T17:00:00.000Z',
    completedAt: null,
    goalId: null,
    courseId,
  };
}

function aCourse(id: string, name = id): Course {
  return {
    id,
    name,
    meetingLocation: 'Center Hall 101',
    professorEmail: 'prof@ucsd.edu',
    officeHours: 'Tue 2-4pm',
    createdAt: '2026-09-15T17:00:00.000Z',
  };
}

function aDatabase(courses: Course[], items: Item[]): Database {
  return { version: 2, items, courses, goals: [], reflections: [] };
}

test('AC-07.3 deleting a course removes it', () => {
  const db = aDatabase([aCourse('c1'), aCourse('c2')], []);

  const next = deleteCourse(db, 'c1');

  expect(next.courses.map((c) => c.id)).toEqual(['c2']);
});

test('AC-07.3 its items remain, with the course cleared', () => {
  const db = aDatabase(
    [aCourse('c1')],
    [anItem('a', 'c1'), anItem('b', 'c1'), anItem('c', 'c1')],
  );

  const next = deleteCourse(db, 'c1');

  expect(next.items).toHaveLength(3);
  for (const item of next.items) {
    expect(item.courseId).toBeNull();
  }
});

test('AC-07.3 items belonging to another course are untouched', () => {
  const db = aDatabase(
    [aCourse('c1'), aCourse('c2')],
    [anItem('a', 'c1'), anItem('b', 'c2'), anItem('c', null)],
  );

  const next = deleteCourse(db, 'c1');

  expect(next.items.find((i) => i.id === 'b')?.courseId).toBe('c2');
  expect(next.items.find((i) => i.id === 'c')?.courseId).toBeNull();
});

test('AC-07.3 nothing else about an item changes', () => {
  const original = anItem('a', 'c1');
  const db = aDatabase([aCourse('c1')], [original]);

  const [next] = deleteCourse(db, 'c1').items;

  expect(next).toEqual({ ...original, courseId: null });
});

test('deleting a course that is not there changes nothing', () => {
  const db = aDatabase([aCourse('c1')], [anItem('a', 'c1')]);

  expect(deleteCourse(db, 'gone')).toEqual(db);
});

test('the other collections are carried through untouched', () => {
  const db = aDatabase([aCourse('c1')], []);

  const next = deleteCourse(db, 'c1');

  expect(next.version).toBe(2);
  expect(next.goals).toEqual([]);
  expect(next.reflections).toEqual([]);
});

test('deleting does not mutate the database it was given', () => {
  const db = aDatabase([aCourse('c1')], [anItem('a', 'c1')]);
  const snapshot = JSON.stringify(db);

  deleteCourse(db, 'c1');

  expect(JSON.stringify(db)).toBe(snapshot);
});

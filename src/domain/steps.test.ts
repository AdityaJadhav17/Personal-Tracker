import { stepsOf } from './steps';
import type { Item } from './types';

function anItem(id: string, rest: Partial<Item> = {}): Item {
  return {
    id,
    title: id,
    dueAt: '2026-11-30T07:59:00.000Z',
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
    ...rest,
  };
}

test('AC-45.3 an item\u2019s steps come back in date order, and nobody else\u2019s', () => {
  const project = anItem('project');
  const late = anItem('write-up', {
    parentId: 'project',
    dueAt: '2026-11-28T07:59:00.000Z',
  });
  const early = anItem('design', {
    parentId: 'project',
    dueAt: '2026-11-20T07:59:00.000Z',
  });
  const other = anItem('other', { parentId: 'elsewhere' });

  expect(stepsOf('project', [project, late, other, early])).toEqual([
    early,
    late,
  ]);
});

test('AC-45.3 an item with no steps has an empty list', () => {
  expect(stepsOf('project', [anItem('project')])).toEqual([]);
});

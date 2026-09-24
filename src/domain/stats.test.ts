import { completedYesterday, remainingToday } from './stats';
import type { Item } from './types';

/** Tuesday 15 September 2026, 10:00 local. */
const NOW = new Date(2026, 8, 15, 10, 0, 0, 0);

function at(daysFromNow: number, hours = 12): string {
  return new Date(2026, 8, 15 + daysFromNow, hours, 0, 0, 0).toISOString();
}

let nextId = 0;

function anItem(overrides: Partial<Item> = {}): Item {
  nextId += 1;
  return {
    id: `item-${nextId}`,
    title: `item-${nextId}`,
    dueAt: at(0),
    category: 'academic',
    priority: 'normal',
    status: 'open',
    note: '',
    createdAt: at(-5),
    completedAt: null,
    goalId: null,
    courseId: null,
    repeatDay: null,
    parentId: null,
    repeat: 'none',
    ...overrides,
  };
}

describe('remainingToday', () => {
  test('AC-16.1 counts open items due today', () => {
    const items = [anItem(), anItem(), anItem()];

    expect(remainingToday(items, NOW)).toBe(3);
  });

  test('AC-16.1 items finished today do not count as remaining', () => {
    const items = [
      anItem(),
      anItem({ status: 'done', completedAt: at(0) }),
      anItem({ status: 'done', completedAt: at(0) }),
    ];

    expect(remainingToday(items, NOW)).toBe(1);
  });

  test('AC-16.1 items due on another day do not count', () => {
    const items = [
      anItem(),
      anItem({ dueAt: at(1) }),
      anItem({ dueAt: at(-1) }),
    ];

    expect(remainingToday(items, NOW)).toBe(1);
  });

  test('AC-16.3 nothing due today is zero, not an absence', () => {
    expect(remainingToday([anItem({ dueAt: at(3) })], NOW)).toBe(0);
    expect(remainingToday([], NOW)).toBe(0);
  });

  test('AC-16.1 an item due at 23:59 still counts at 10am', () => {
    expect(remainingToday([anItem({ dueAt: at(0, 23) })], NOW)).toBe(1);
  });

  test('AC-16.1 counting is by local calendar day, not by a rolling 24 hours', () => {
    const lateEvening = new Date(2026, 8, 15, 23, 30, 0, 0);

    // Due tomorrow at noon is inside 24 hours but is not today.
    expect(remainingToday([anItem({ dueAt: at(1) })], lateEvening)).toBe(0);
  });
});

describe('completedYesterday', () => {
  test('AC-16.2 counts items finished yesterday', () => {
    const items = [
      anItem({ status: 'done', completedAt: at(-1) }),
      anItem({ status: 'done', completedAt: at(-1, 9) }),
    ];

    expect(completedYesterday(items, NOW)).toBe(2);
  });

  test('AC-16.2 items finished today do not count', () => {
    const items = [
      anItem({ status: 'done', completedAt: at(0) }),
      anItem({ status: 'done', completedAt: at(-1) }),
    ];

    expect(completedYesterday(items, NOW)).toBe(1);
  });

  test('AC-16.2 items finished two days ago do not count', () => {
    expect(
      completedYesterday(
        [anItem({ status: 'done', completedAt: at(-2) })],
        NOW,
      ),
    ).toBe(0);
  });

  test('AC-16.2 open items never count, whatever their due date', () => {
    expect(completedYesterday([anItem({ dueAt: at(-1) })], NOW)).toBe(0);
  });

  test('AC-16.2 nothing finished yesterday is zero', () => {
    expect(completedYesterday([], NOW)).toBe(0);
  });

  test('AC-16.2 it is yesterday that counts, not when the item was due', () => {
    // Due last week, finished yesterday: that is yesterday's work.
    const late = anItem({
      dueAt: at(-7),
      status: 'done',
      completedAt: at(-1),
    });

    expect(completedYesterday([late], NOW)).toBe(1);
  });
});

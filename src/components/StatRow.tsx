import { dayHeading, groupOf } from '../domain/dates';
import type { Group } from '../domain/dates';
import { completedYesterday, remainingToday } from '../domain/stats';
import type { Item } from '../domain/types';

interface StatRowProps {
  items: Item[];
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
}

/**
 * Home's header: what day it is, and how it stands, in one sentence.
 *
 * US-57 replaced US-16's two big numbers, which read as a dashboard template,
 * with words. Today always leads, even at zero: "Nothing due today" says the
 * same as a 0 without making you interpret an absence. The other counts appear
 * only when there is something to count.
 */
export default function StatRow({ items, now }: StatRowProps) {
  const today = remainingToday(items, now);
  const count = (group: Group) =>
    items.filter(
      (item) => item.status === 'open' && groupOf(item.dueAt, now) === group,
    ).length;

  const parts = [
    today > 0 ? `${today} due today` : 'Nothing due today',
    ...(
      [
        [count('overdue'), 'overdue'],
        [count('week'), 'this week'],
        [completedYesterday(items, now), 'finished yesterday'],
      ] as const
    )
      .filter(([n]) => n > 0)
      .map(([n, words]) => `${n} ${words}`),
  ];

  return (
    <header className="today">
      <h1 className="today__date">{dayHeading(now)}</h1>
      <p className="today__summary">{parts.join(' · ')}</p>
    </header>
  );
}

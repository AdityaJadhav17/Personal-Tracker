import { groupOf } from '../domain/dates';
import type { Group } from '../domain/dates';
import { sortWithinGroup } from '../domain/ordering';
import type { Item } from '../domain/types';
import ItemRow from './ItemRow';

/** Render order. Overdue sits above everything, which is AC-03.1. */
const GROUPS: { key: Group; heading: string }[] = [
  { key: 'overdue', heading: 'Overdue' },
  { key: 'today', heading: 'Today' },
  { key: 'week', heading: 'This week' },
  { key: 'later', heading: 'Later' },
];

interface DashboardProps {
  items: Item[];
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
  onDone: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export default function Dashboard({
  items,
  now,
  onDone,
  onNoteChange,
}: DashboardProps) {
  const open = items.filter((item) => item.status === 'open');

  return (
    <>
      {GROUPS.map(({ key, heading }) => {
        const inGroup = open.filter((item) => groupOf(item.dueAt, now) === key);
        if (inGroup.length === 0) return null;

        const ordered = sortWithinGroup(inGroup);

        return (
          <section key={key}>
            <h2>{heading}</h2>
            <ul>
              {ordered.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  now={now}
                  onDone={onDone}
                  onNoteChange={onNoteChange}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

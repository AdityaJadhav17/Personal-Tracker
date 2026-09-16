import { completedYesterday, remainingToday } from '../domain/stats';
import type { Item } from '../domain/types';

interface StatRowProps {
  items: Item[];
  /** Passed in so the clock is never read implicitly. See docs/plan.md. */
  now: Date;
}

/**
 * The two numbers that answer "is today going badly" before you read a list.
 *
 * Both always render, even at zero. Hiding a stat when it is zero means the
 * absence of a row has to be interpreted, which is slower than reading a 0.
 */
export default function StatRow({ items, now }: StatRowProps) {
  return (
    <div className="stats">
      <p className="stat">
        <span className="stat__value">{remainingToday(items, now)}</span>
        <span className="stat__label">remaining today</span>
      </p>
      <p className="stat">
        <span className="stat__value">{completedYesterday(items, now)}</span>
        <span className="stat__label">completed yesterday</span>
      </p>
    </div>
  );
}

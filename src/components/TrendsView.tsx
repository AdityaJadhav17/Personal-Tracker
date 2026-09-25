import { shortDay } from '../domain/dates';
import { daysWithData } from '../domain/trends';
import type { DayPoint } from '../domain/trends';
import LineChart from './LineChart';
import { SCORES } from './ReflectionView';

interface TrendsViewProps {
  series: DayPoint[];
}

/**
 * Two charts, never one with two axes.
 *
 * A reflection score runs 1 to 5 and a day's completions run 0 to whatever you
 * managed. Putting both on one scale would make the shapes comparable when they
 * are not, which is the most common way a chart misleads. Each gets its own
 * chart, its own scale, and a title that names it so neither needs a legend.
 *
 * The table carries the exact numbers, which is AC-18.4, in a form a screen
 * reader can read and a keyboard can reach. US-61 added a hover readout for
 * the mouse on top of that, not instead of it.
 */
export default function TrendsView({ series }: TrendsViewProps) {
  if (daysWithData(series) < 2) {
    return (
      <section className="trends">
        <h1 className="page-title">Trends</h1>
        <p className="trends__empty">
          There is not enough yet. Record how a couple of days went, or finish
          something on more than one day, and the shape will show up here.
        </p>
      </section>
    );
  }

  const busiest = Math.max(...series.map((point) => point.completed), 1);
  const days = series.map((point) => point.day);

  return (
    <section className="trends">
      <h1 className="page-title">Trends</h1>

      <LineChart
        title="How the day went"
        label="How the day went, one to five, over time"
        days={days}
        values={series.map((point) => point.score)}
        min={1}
        max={5}
        read={(score) =>
          `${SCORES.find((one) => one.score === score)?.label}, ${score}`
        }
      />

      <LineChart
        title="Items finished"
        label="Items finished each day over time"
        days={days}
        values={series.map((point) => point.completed)}
        min={0}
        max={busiest}
        read={(count) => `${count} finished`}
      />

      <h3 className="trends__heading">The numbers</h3>
      <div className="trends__table">
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">How it went</th>
              <th scope="col">Finished</th>
            </tr>
          </thead>
          <tbody>
            {series.map((point) => (
              <tr key={point.day}>
                {/* AC-61.1. A date, not the stored form of one. */}
                <th scope="row">{shortDay(point.day)}</th>
                <td>{point.score === null ? 'No entry' : point.score}</td>
                <td>{point.completed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

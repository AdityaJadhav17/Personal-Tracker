import { daysWithData } from '../domain/trends';
import type { DayPoint } from '../domain/trends';
import LineChart from './LineChart';

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
 * The table carries the exact numbers, which is AC-18.4 and also why there is
 * no hover tooltip: the values are already on the page, in a form a screen
 * reader can read and a keyboard can reach.
 */
export default function TrendsView({ series }: TrendsViewProps) {
  if (daysWithData(series) < 2) {
    return (
      <section className="trends">
        <h2 className="trends__title">Trends</h2>
        <p className="trends__empty">
          There is not enough yet. Record how a couple of days went, or finish
          something on more than one day, and the shape will show up here.
        </p>
      </section>
    );
  }

  const busiest = Math.max(...series.map((point) => point.completed), 1);

  return (
    <section className="trends">
      <h2 className="trends__title">Trends</h2>

      <h3 className="trends__heading">How the day went</h3>
      <LineChart
        label="How the day went, one to five, over time"
        values={series.map((point) => point.score)}
        max={5}
      />

      <h3 className="trends__heading">Items finished</h3>
      <LineChart
        label="Items finished each day over time"
        values={series.map((point) => point.completed)}
        max={busiest}
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
                <th scope="row">{point.day}</th>
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

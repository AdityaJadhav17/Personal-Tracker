import { useId, useState } from 'react';
import { monthDay, shortDay } from '../domain/dates';

const WIDTH = 320;
const HEIGHT = 80;
const PAD = 6;

interface LineChartProps {
  /** The chart's title, which also names the figure. */
  title: string;
  /** Names the series, so no legend is needed for a single line. */
  label: string;
  /** One local calendar day per value, oldest first. */
  days: string[];
  /** One entry per day, oldest first. null means no reading that day. */
  values: (number | null)[];
  /** Bottom and top of the scale. A max at or below min is treated as min + 1. */
  min: number;
  max: number;
  /** How the readout says a value, "Good, 4" or "2 finished". */
  read: (value: number) => string;
}

function x(index: number, count: number): number {
  if (count < 2) return WIDTH / 2;
  return PAD + (index / (count - 1)) * (WIDTH - PAD * 2);
}

function y(value: number, min: number, max: number): number {
  const span = Math.max(max - min, 1);
  return HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);
}

/**
 * One series, one scale, no second axis.
 *
 * Two measures on different scales get two of these rather than a dual axis,
 * which is the single most common way a chart lies.
 *
 * US-61. The scale's two ends are printed beside it and the first and last
 * days under it, so the shape can be read without the table. Hovering reads
 * out the day under the pointer. That readout is for the mouse only: the
 * table below the charts carries every number for a keyboard and a screen
 * reader, so the readout is hidden from them rather than repeating it.
 *
 * A gap in the data breaks the line rather than being drawn through, because
 * joining across a missing day would invent a reading that was never taken.
 */
export default function LineChart({
  title,
  label,
  days,
  values,
  min,
  max,
  read,
}: LineChartProps) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const top = Math.max(max, min + 1);

  const segments: string[] = [];
  let current: string[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${x(index, values.length)},${y(value, min, top)}`);
  });
  if (current.length > 1) segments.push(current.join(' '));

  const dots = values
    .map((value, index) => ({ value, index }))
    .filter((point) => point.value !== null);

  // Percentages of the plot, so the HTML readout sits on the stretched SVG.
  const across = (index: number) => (x(index, values.length) / WIDTH) * 100;
  const down = (value: number) => (y(value, min, top) / HEIGHT) * 100;
  const hovered = hover === null ? null : values[hover];

  return (
    <figure className="chart" aria-labelledby={titleId}>
      <figcaption className="trends__heading" id={titleId}>
        {title}
      </figcaption>

      <div className="chart__plot">
        <div className="chart__scale" aria-hidden="true">
          <span>{top}</span>
          <span>{min}</span>
        </div>

        <div
          className="chart__area"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - box.left) / box.width;
            const index = Math.round(
              ((ratio * WIDTH - PAD) / (WIDTH - PAD * 2)) * (values.length - 1),
            );
            setHover(Math.min(Math.max(index, 0), values.length - 1));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <svg
            className="chart__svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={label}
            preserveAspectRatio="none"
          >
            {/* Recessive guides at the top and bottom of the scale. */}
            <line
              className="chart__axis"
              x1={PAD}
              y1={PAD}
              x2={WIDTH - PAD}
              y2={PAD}
            />
            <line
              className="chart__axis"
              x1={PAD}
              y1={HEIGHT - PAD}
              x2={WIDTH - PAD}
              y2={HEIGHT - PAD}
            />
            {segments.map((points) => (
              <polyline className="chart__line" key={points} points={points} />
            ))}
            {/* A single reading has no line to draw, so it needs a mark. */}
            {segments.length === 0 &&
              dots.map(({ value, index }) => (
                <circle
                  className="chart__dot"
                  key={index}
                  cx={x(index, values.length)}
                  cy={y(value!, min, top)}
                  r={3}
                />
              ))}
          </svg>

          {hover !== null && (
            <div aria-hidden="true">
              <span
                className="chart__guide"
                style={{ left: `${across(hover)}%` }}
              />
              {hovered !== null && hovered !== undefined && (
                <span
                  className="chart__marker"
                  style={{
                    left: `${across(hover)}%`,
                    top: `${down(hovered)}%`,
                  }}
                />
              )}
              <p
                className={`chart__readout ${across(hover) > 50 ? 'chart__readout--left' : ''}`}
                style={{ left: `${across(hover)}%` }}
              >
                {shortDay(days[hover]!)} ·{' '}
                {hovered === null || hovered === undefined
                  ? 'No entry'
                  : read(hovered)}
              </p>
            </div>
          )}
        </div>
      </div>

      {days.length > 0 && (
        <div className="chart__dates" aria-hidden="true">
          <span>{monthDay(days[0]!)}</span>
          <span>{monthDay(days[days.length - 1]!)}</span>
        </div>
      )}
    </figure>
  );
}

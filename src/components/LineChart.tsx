const WIDTH = 320;
const HEIGHT = 80;
const PAD = 6;

interface LineChartProps {
  /** Names the series, so no legend is needed for a single line. */
  label: string;
  /** One entry per day, oldest first. null means no reading that day. */
  values: (number | null)[];
  /** Top of the scale. Never zero, so nothing divides by it. */
  max: number;
}

function x(index: number, count: number): number {
  if (count < 2) return WIDTH / 2;
  return PAD + (index / (count - 1)) * (WIDTH - PAD * 2);
}

function y(value: number, max: number): number {
  return HEIGHT - PAD - (value / max) * (HEIGHT - PAD * 2);
}

/**
 * One series, one scale, no second axis.
 *
 * Two measures on different scales get two of these rather than a dual axis,
 * which is the single most common way a chart lies. Exact numbers live in the
 * table beside it, so this only has to carry the shape.
 *
 * A gap in the data breaks the line rather than being drawn through, because
 * joining across a missing day would invent a reading that was never taken.
 */
export default function LineChart({ label, values, max }: LineChartProps) {
  const segments: string[] = [];
  let current: string[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${x(index, values.length)},${y(value, max || 1)}`);
  });
  if (current.length > 1) segments.push(current.join(' '));

  const dots = values
    .map((value, index) => ({ value, index }))
    .filter((point) => point.value !== null);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
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
      {/* A single reading has no line to draw, so it needs a mark of its own. */}
      {segments.length === 0 &&
        dots.map(({ value, index }) => (
          <circle
            className="chart__dot"
            key={index}
            cx={x(index, values.length)}
            cy={y(value!, max || 1)}
            r={3}
          />
        ))}
    </svg>
  );
}

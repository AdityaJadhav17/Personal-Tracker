import { render, screen } from '@testing-library/react';
import LineChart from './LineChart';

/** US-61 gave the chart a title, days, a floor and a readout; these tests
    only care about the line, so those are filled in plainly. */
function Chart(props: {
  label: string;
  values: (number | null)[];
  max: number;
}) {
  return (
    <LineChart
      title={props.label}
      days={props.values.map(
        (_, n) => `2026-09-${String(10 + n).padStart(2, '0')}`,
      )}
      min={0}
      read={String}
      {...props}
    />
  );
}

describe('the shapes a real series can take', () => {
  test('a single point does not divide by zero across the width', () => {
    render(<Chart label="one point" values={[3]} max={5} />);

    // With one value there is no line to draw, and the chart still renders.
    expect(screen.getByRole('img', { name: 'one point' })).toBeVisible();
  });

  test('a gap in the middle breaks the line rather than jumping the hole', () => {
    const { container } = render(
      <Chart label="gapped" values={[1, null, 5]} max={5} />,
    );

    // Two one-point runs either side of the gap draw no segment between them.
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
  });

  test('two points either side of a gap draw two separate lines', () => {
    const { container } = render(
      <Chart label="two runs" values={[1, 2, null, 4, 5]} max={5} />,
    );

    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  test('a max of zero does not divide by zero', () => {
    render(<Chart label="all zero" values={[0, 0, 0]} max={0} />);

    expect(screen.getByRole('img', { name: 'all zero' })).toBeVisible();
  });

  test('a series that is entirely gaps draws nothing and does not throw', () => {
    const { container } = render(
      <Chart label="nothing" values={[null, null]} max={5} />,
    );

    expect(container.querySelectorAll('polyline')).toHaveLength(0);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });
});

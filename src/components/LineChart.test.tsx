import { render, screen } from '@testing-library/react';
import LineChart from './LineChart';

describe('the shapes a real series can take', () => {
  test('a single point does not divide by zero across the width', () => {
    render(<LineChart label="one point" values={[3]} max={5} />);

    // With one value there is no line to draw, and the chart still renders.
    expect(screen.getByRole('img', { name: 'one point' })).toBeVisible();
  });

  test('a gap in the middle breaks the line rather than jumping the hole', () => {
    const { container } = render(
      <LineChart label="gapped" values={[1, null, 5]} max={5} />,
    );

    // Two one-point runs either side of the gap draw no segment between them.
    expect(container.querySelectorAll('polyline')).toHaveLength(0);
  });

  test('two points either side of a gap draw two separate lines', () => {
    const { container } = render(
      <LineChart label="two runs" values={[1, 2, null, 4, 5]} max={5} />,
    );

    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  test('a max of zero does not divide by zero', () => {
    render(<LineChart label="all zero" values={[0, 0, 0]} max={0} />);

    expect(screen.getByRole('img', { name: 'all zero' })).toBeVisible();
  });

  test('a series that is entirely gaps draws nothing and does not throw', () => {
    const { container } = render(
      <LineChart label="nothing" values={[null, null]} max={5} />,
    );

    expect(container.querySelectorAll('polyline')).toHaveLength(0);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });
});

import css from '../styles/base.css?raw';

/**
 * AC-69.3. The spacing scale is set in rem, so gaps grow with the text size
 * chosen in Windows or the browser instead of staying fixed while type grows.
 */
test('AC-69.3 every spacing token is in rem', () => {
  const spaces = [...css.matchAll(/--space-\d+:\s*([^;]+);/g)].map(
    ([, value]) => value!.trim(),
  );

  expect(spaces.length).toBeGreaterThanOrEqual(5);
  for (const value of spaces) expect(value).toMatch(/^[\d.]+rem$/);
});

test('AC-69.2 two corner sizes: one for controls, one for containers', () => {
  expect(css).toMatch(/--radius:\s*6px;/);
  expect(css).toMatch(/--radius-card:\s*10px;/);
});

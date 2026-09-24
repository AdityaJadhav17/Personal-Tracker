import css from '../styles/base.css?raw';

/**
 * Aditya's pain point is reading this at 11pm with the lights off, and Phase 4
 * requires checking contrast in dark mode. This turns that from a claim into a
 * gate: the colour tokens are read straight out of styles/base.css, so there is one
 * source of truth and a future palette tweak that quietly breaks legibility
 * fails here instead of on his laptop at midnight.
 *
 * WCAG 2.2 AA for body text is 4.5:1.
 */
const AA = 4.5;

function toLinear(component: number): number {
  const channel = component / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  return (
    0.2126 * toLinear(parseInt(value.slice(0, 2), 16)) +
    0.7152 * toLinear(parseInt(value.slice(2, 4), 16)) +
    0.0722 * toLinear(parseInt(value.slice(4, 6), 16))
  );
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

function tokensIn(block: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found[match[1]!.toLowerCase()] = match[2]!;
  }
  return found;
}

/** The `:root { ... }` block starting at or after `from`. */
function rootBlockAfter(source: string, from: number): string {
  const start = source.indexOf(':root {', from);
  const end = source.indexOf('}', start);
  return source.slice(start, end);
}

const light = tokensIn(rootBlockAfter(css, 0));
const dark = {
  ...light,
  ...tokensIn(rootBlockAfter(css, css.indexOf('prefers-color-scheme: dark'))),
};

/** Every foreground and background that actually meet on screen. */
const PAIRS: [fg: string, bg: string, where: string][] = [
  ['text', 'bg', 'body text on the page'],
  ['text', 'surface', 'item titles on a card'],
  ['text-muted', 'bg', 'the status line'],
  ['text-muted', 'surface', 'due times and field labels'],
  ['accent', 'bg', 'group accents on the page'],
  ['accent', 'surface', 'accents on a card'],
  ['accent', 'accent-soft', 'the Soon marker'],
  ['on-accent', 'accent', 'the Add button label'],
  ['danger', 'bg', 'the Overdue heading'],
  ['danger', 'surface', 'form errors on a card'],
  ['danger', 'danger-soft', 'the import error box'],
  ['text', 'danger-soft', 'body text inside the error state'],
  ['text', 'accent-soft', 'a calendar item sitting on its day'],
  ['text-muted', 'accent-soft', "the more count in today's calendar cell"],
  ['sidebar-text', 'sidebar-bg', 'sidebar links'],
  ['sidebar-current', 'sidebar-bg', 'the sidebar item you are on'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s mode', (mode, tokens) => {
  test('every colour token used for text is a six digit hex', () => {
    for (const [fg, bg] of PAIRS) {
      expect(tokens[fg], `--${fg} missing in ${mode}`).toMatch(
        /^#[0-9a-f]{6}$/i,
      );
      expect(tokens[bg], `--${bg} missing in ${mode}`).toMatch(
        /^#[0-9a-f]{6}$/i,
      );
    }
  });

  test.each(PAIRS)('--%s on --%s reaches 4.5:1 (%s)', (fg, bg) => {
    const ratio = contrast(tokens[fg]!, tokens[bg]!);
    expect(
      Number(ratio.toFixed(2)),
      `--${fg} (${tokens[fg]}) on --${bg} (${tokens[bg]}) in ${mode} mode`,
    ).toBeGreaterThanOrEqual(AA);
  });
});

describe('the two palettes', () => {
  test('dark redefines every colour token, so none leaks from light', () => {
    const darkOnly = tokensIn(
      rootBlockAfter(css, css.indexOf('prefers-color-scheme: dark')),
    );
    const lightColours = Object.keys(light);

    expect(Object.keys(darkOnly).sort()).toEqual(lightColours.sort());
  });

  test('the contrast maths matches known values', () => {
    // Black on white is the textbook 21:1, and a colour against itself is 1:1.
    expect(Number(contrast('#000000', '#ffffff').toFixed(0))).toBe(21);
    expect(contrast('#123456', '#123456')).toBe(1);
  });
});

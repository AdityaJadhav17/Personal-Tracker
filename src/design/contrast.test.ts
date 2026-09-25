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

const HEX = '#[0-9a-f]{6}';
const TOKEN = new RegExp(
  String.raw`--([a-z0-9-]+):\s*(?:light-dark\(\s*(${HEX})\s*,\s*(${HEX})\s*\)|(${HEX}))\s*;`,
  'gi',
);

/**
 * US-51. Each colour token is either one hex, the same in both schemes, or
 * `light-dark(light, dark)`, so both palettes come from one declaration.
 */
function palettes(source: string) {
  const light: Record<string, string> = {};
  const dark: Record<string, string> = {};
  for (const [, name, inLight, inDark, both] of source.matchAll(TOKEN)) {
    light[name!.toLowerCase()] = (inLight ?? both)!;
    dark[name!.toLowerCase()] = (inDark ?? both)!;
  }
  return { light, dark };
}

// US-49. The more-contrast block redefines a few tokens on top of the normal
// ones, so it is read separately and laid over them; read together, its
// values would silently replace the normal palette in every test below.
const [normalCss, moreCss = ''] = css.split('@media (prefers-contrast: more)');
const { light, dark } = palettes(normalCss!);
const more = palettes(moreCss);
const lightMore = { ...light, ...more.light };
const darkMore = { ...dark, ...more.dark };

/** WCAG 2.2 non-text contrast, 1.4.11: a border that marks a control. */
const NON_TEXT = 3;

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
  ['on-accent', 'danger', 'the Yes, delete button label (AC-64.4)'],
  ['bg', 'text', 'the undo toast, page colours swapped (AC-64.1)'],
  ['danger', 'bg', 'the Overdue heading'],
  ['danger', 'surface', 'form errors on a card'],
  ['danger', 'danger-soft', 'the import error box'],
  ['text', 'danger-soft', 'body text inside the error state'],
  ['text', 'accent-soft', 'a calendar item sitting on its day'],
  ['text-muted', 'accent-soft', "the more count in today's calendar cell"],
  ['sidebar-text', 'sidebar-bg', 'sidebar links'],
  ['sidebar-current', 'sidebar-bg', 'the sidebar item you are on'],
  ['sidebar-current', 'sidebar-current-bg', 'its highlight (AC-62.1)'],
];

describe.each([
  ['light', light],
  ['dark', dark],
  ['light, more contrast', lightMore],
  ['dark, more contrast', darkMore],
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

describe.each([
  ['light', light, lightMore],
  ['dark', dark, darkMore],
])('%s mode when the system asks for more contrast', (_, normal, strong) => {
  test('AC-49.2 borders reach 3:1 against the page and a card', () => {
    for (const bg of ['bg', 'surface']) {
      expect(
        Number(contrast(strong.border!, strong[bg]!).toFixed(2)),
      ).toBeGreaterThanOrEqual(NON_TEXT);
    }
  });

  test('AC-49.2 muted text is stronger than it is normally', () => {
    expect(contrast(strong['text-muted']!, strong.surface!)).toBeGreaterThan(
      contrast(normal['text-muted']!, normal.surface!),
    );
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
])('%s mode course colours', (_, tokens) => {
  test.each(['course-1', 'course-2', 'course-3', 'course-4'])(
    'AC-57.8 --%s reaches 3:1 against the page and a card',
    (course) => {
      for (const bg of ['bg', 'surface']) {
        expect(
          Number(contrast(tokens[course]!, tokens[bg]!).toFixed(2)),
        ).toBeGreaterThanOrEqual(NON_TEXT);
      }
    },
  );
});

describe('the two palettes', () => {
  test('AC-51.4 every scheme-dependent colour is declared once, for both schemes', () => {
    // A separate dark block, or one only for the toggle, is two lists that can
    // drift apart. light-dark() keeps each colour's two values side by side.
    expect(css).not.toMatch(/prefers-color-scheme/);
    const differing = Object.keys(light).filter((k) => light[k] !== dark[k]);
    expect(differing.length).toBeGreaterThanOrEqual(10);
  });

  test('the contrast maths matches known values', () => {
    // Black on white is the textbook 21:1, and a colour against itself is 1:1.
    expect(Number(contrast('#000000', '#ffffff').toFixed(0))).toBe(21);
    expect(contrast('#123456', '#123456')).toBe(1);
  });
});

describe('US-62 one visual system', () => {
  test('AC-62.1 the sidebar follows the theme', () => {
    expect(light['sidebar-bg']).not.toBe(dark['sidebar-bg']);
    // Light in light mode: brighter than its own text.
    expect(luminance(light['sidebar-bg']!)).toBeGreaterThan(
      luminance(light['sidebar-text']!),
    );
  });

  test.each([
    ['light', light],
    ['dark', dark],
  ])('AC-62.2 body text is neutral in %s mode, not tinted', (_, tokens) => {
    const hex = tokens.text!.replace('#', '');
    const channels = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
    // A grey or a near-grey: no channel more than 32 away from another.
    expect(Math.max(...channels) - Math.min(...channels)).toBeLessThanOrEqual(
      32,
    );
  });
});

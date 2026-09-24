import { test, expect, type Page } from '@playwright/test';

/** Every style rule in every stylesheet, with its size and tracking. */
function rules(page: Page) {
  return page.evaluate(() => {
    const found: { selector: string; fontSize: string; tracking: string }[] =
      [];
    const walk = (list: CSSRuleList) => {
      for (const rule of list) {
        if (rule instanceof CSSStyleRule) {
          found.push({
            selector: rule.selectorText,
            fontSize: rule.style.fontSize,
            tracking: rule.style.letterSpacing,
          });
        } else if ('cssRules' in rule) {
          walk((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
    return found;
  });
}

test('AC-49.1 no stylesheet sets a font size in pixels', async ({ page }) => {
  await page.goto('/');

  // `font-size: 0` reads back as 0px, and zero needs no unit to scale.
  const inPixels = (await rules(page)).filter(
    ({ fontSize }) => fontSize.endsWith('px') && fontSize !== '0px',
  );

  expect(inPixels).toEqual([]);
});

test("AC-49.1 text follows the browser's font size, not only its zoom", async ({
  page,
}) => {
  await page.goto('/');
  const bodySize = () =>
    page.evaluate(() => getComputedStyle(document.body).fontSize);
  expect(await bodySize()).toBe('15px');

  // What Chrome's "Font size" setting changes: the size rem is measured from.
  await page.addStyleTag({ content: 'html { font-size: 20px; }' });

  expect(await bodySize()).toBe('18.75px');
});

test('AC-49.2 borders and muted text strengthen when the system asks for more contrast', async ({
  page,
}) => {
  await page.goto('/');
  const read = () =>
    page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.borderColor = 'var(--border)';
      probe.style.color = 'var(--text-muted)';
      document.body.append(probe);
      const { borderTopColor, color } = getComputedStyle(probe);
      probe.remove();
      return { border: borderTopColor, muted: color };
    });

  const normal = await read();
  await page.emulateMedia({ contrast: 'more' });
  const strong = await read();

  expect(strong.border).not.toBe(normal.border);
  expect(strong.muted).not.toBe(normal.muted);
});

test('AC-49.4 large text is tracked tighter, and text below body size never is', async ({
  page,
}) => {
  await page.goto('/');
  const all = await rules(page);
  const rem = (size: string) =>
    size.endsWith('rem') ? Number.parseFloat(size) : null;

  const large = all.filter(({ fontSize }) => (rem(fontSize) ?? 0) >= 1.125);
  const tightSmall = all.filter(
    ({ fontSize, tracking }) =>
      (rem(fontSize) ?? 99) < 0.9375 && tracking.startsWith('-'),
  );

  expect(large.length).toBeGreaterThan(0);
  for (const { selector, tracking } of large) {
    expect(tracking, selector).toMatch(/^-/);
  }
  expect(tightSmall).toEqual([]);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).letterSpacing),
  ).toBe('normal');
});

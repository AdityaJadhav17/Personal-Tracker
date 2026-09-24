import { test, expect, type Page } from '@playwright/test';

/** Hold the mouse down on a button and read its scale once the press settles. */
async function pressedScale(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  const scale = await button.evaluate((el) => getComputedStyle(el).scale);
  await page.mouse.up();
  return scale;
}

test('AC-47.1 a button dips when pressed, and comes back', async ({ page }) => {
  await page.goto('/');

  expect(await pressedScale(page, 'Add')).toBe('0.97');
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Add', exact: true })
        .evaluate((el) => getComputedStyle(el).scale),
    )
    .toBe('none');
});

test('AC-47.4 nothing on the page transitions for longer than 300ms or eases in', async ({
  page,
}) => {
  await page.goto('/');

  const offenders = await page.evaluate(() =>
    [...document.querySelectorAll('*')].flatMap((el) => {
      const style = getComputedStyle(el);
      const slow = style.transitionDuration
        .split(',')
        .some((d) => parseFloat(d) > 0.3);
      const easeIn = style.transitionTimingFunction
        .split(',')
        .some((t) => t.trim() === 'ease-in');
      return slow || easeIn ? [el.className || el.tagName] : [];
    }),
  );
  expect(offenders).toEqual([]);
});

test.describe('with reduced motion asked for', () => {
  test.use({ reducedMotion: 'reduce' });

  test('AC-47.2 a press does not move, but colour changes still ease', async ({
    page,
  }) => {
    await page.goto('/');

    expect(await pressedScale(page, 'Add')).toBe('1');
    const duration = await page
      .getByRole('button', { name: 'Export', exact: true })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration.split(',')[0]).toBe('0.15s');
  });
});

test('AC-47.3 every hover rule is gated to a precise pointer, so a tap cannot leave one stuck', async ({
  page,
}) => {
  await page.goto('/');

  // Emulated touch never fires :hover, so a tap test would pass either way.
  // What makes a tap safe is where the rule lives, so that is what is read.
  const ungated = await page.evaluate(() => {
    const found: string[] = [];
    const walk = (rules: CSSRuleList, gated: boolean) => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) {
          walk(
            rule.cssRules,
            gated || rule.conditionText.includes('hover: hover'),
          );
        } else if (
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes(':hover') &&
          !gated
        ) {
          found.push(rule.selectorText);
        }
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules, false);
    return found;
  });

  expect(ungated).toEqual([]);
});

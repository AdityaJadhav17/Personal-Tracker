import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const read = (path) => readFileSync(path, 'utf8');

/** A PNG's width and height, from its header. */
function sizeOf(path) {
  const png = readFileSync(path);
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

test('AC-96.2 the page and the installed app are called Margin', () => {
  const html = read('index.html');
  expect(html).toMatch(/<title>Margin<\/title>/);
  expect(html).toMatch(/name="apple-mobile-web-app-title"\s+content="Margin"/);
  expect(JSON.parse(read('public/manifest.webmanifest'))).toMatchObject({
    name: 'Margin',
    short_name: 'Margin',
    start_url: '/',
    display: 'standalone',
  });
});

test('AC-96.3 the manifest and the iPhone icon are linked, and every icon is the size it says', () => {
  const html = read('index.html');
  expect(html).toMatch(/<link rel="manifest" href="\/manifest.webmanifest"/);
  expect(html).toMatch(
    /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon.png"/,
  );
  expect(html).toMatch(/<link rel="icon" href="\/icon.svg"/);
  expect(sizeOf('public/icons/apple-touch-icon.png')).toBe('180x180');

  const { icons } = JSON.parse(read('public/manifest.webmanifest'));
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of icons) {
    expect(existsSync(`public${icon.src}`)).toBe(true);
    expect(sizeOf(`public${icon.src}`)).toBe(icon.sizes);
  }
});

/**
 * US-96. Draws Margin's icon and writes every size the app ships. Run by hand
 * after changing the drawing: `node scripts/icons.mjs`. Renders in
 * Playwright's Chromium, which is already a dev dependency.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * A notebook page's margin rule, two ruled lines, and a check across them:
 * notes and deadlines, done. `corner` rounds the square; `scale` shrinks the
 * drawing into the safe zone a masked icon keeps.
 */
function drawing({ corner, scale = 1 }) {
  const art = `
    <g stroke="#fff" stroke-linecap="round" fill="none"
       transform="translate(512 512) scale(${scale}) translate(-548 -512)">
      <path d="M430 330H780M430 694H780" stroke-width="30" opacity=".24"/>
      <path d="M320 236V788" stroke-width="48"/>
      <path d="M420 520L540 640L780 392" stroke-width="94" stroke-linejoin="round"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="${corner}" fill="url(#g)"/>${art}
</svg>
`;
}

// Rounded, for the tab, the sidebar and the installed app's own icon.
const rounded = drawing({ corner: 230 });
// Square: iOS rounds the home-screen icon itself, and a masked icon is cut to
// whatever shape the system likes, so neither may carry its own corners.
const square = drawing({ corner: 0 });
const masked = drawing({ corner: 0, scale: 0.8 });

writeFileSync('public/icon.svg', rounded);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, svg, size] of [
  ['public/icons/icon-192.png', rounded, 192],
  ['public/icons/icon-512.png', rounded, 512],
  ['public/icons/apple-touch-icon.png', square, 180],
  ['public/icons/maskable-512.png', masked, 512],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0"><img width="${size}" height="${size}" src="data:image/svg+xml,${encodeURIComponent(svg)}"></body>`,
  );
  await page.locator('img').screenshot({ path: file, omitBackground: true });
}
await browser.close();
console.log('Icons written.');

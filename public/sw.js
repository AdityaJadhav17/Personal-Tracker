/**
 * US-96. Keeps Margin openable with no connection to the laptop: on the
 * iPhone away from it, and on the laptop if the 4180 server stops.
 *
 * The page is network first, so a deploy shows on the next open that can
 * reach the server; hashed assets are cache first, because their names change
 * whenever their content does. Same-origin GETs only: the app makes no other
 * request, and this does not start.
 */
const CACHE = 'margin';
/** AC-103.1. How long a page waits for the laptop before the kept copy opens. */
const WAIT_FOR_LAPTOP = 3000;
const SHELL = [
  '/theme.js',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
];

/** The hashed files a page loads, read as scripts/check-deploy.mjs reads them. */
function assetsIn(html) {
  return [...html.matchAll(/\/assets\/[^"'\s>]+/g)].map((match) => match[0]);
}

/**
 * Keep `page` as the page, fetch the assets it needs that are not kept yet,
 * then drop the assets only an older page used, so deploys do not pile up.
 */
async function keep(page) {
  const cache = await caches.open(CACHE);
  const assets = assetsIn(await page.clone().text());
  for (const asset of assets) {
    if (!(await cache.match(asset))) await cache.add(asset);
  }
  await cache.put('/', page);
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/assets/') && !assets.includes(path)) {
      await cache.delete(request);
    }
  }
}

// One at a time: two open windows, or install racing a navigation, would
// otherwise let an older page's prune delete a newer page's assets.
let keeping = Promise.resolve();
function keepPage(page) {
  keeping = keeping.then(() => keep(page)).catch(() => {});
  return keeping;
}

/**
 * AC-96.6. Only the app's own page is the page. Opening the icon or a script
 * as a page, by hand or because another site opened it, is answered but not
 * kept, so the offline app is never replaced by a file of it.
 */
function isTheApp(url, response) {
  return (
    response.ok &&
    (url.pathname === '/' || url.pathname === '/index.html') &&
    (response.headers.get('Content-Type') ?? '').startsWith('text/html')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await (await caches.open(CACHE)).addAll(SHELL);
      const page = await fetch('/', { cache: 'no-store' });
      if (isTheApp(new URL('/', self.location.origin), page)) {
        await keepPage(page);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Network first, but not for long: a laptop that is asleep over Tailscale
    // never answers, and the kept copy should open instead. A page that
    // arrives late is still kept for next time.
    let kept = Promise.resolve();
    const fresh = fetch(request).then((page) => {
      if (isTheApp(url, page)) kept = keepPage(page.clone());
      return page;
    });
    event.waitUntil(
      fresh.then(
        () => kept,
        () => {},
      ),
    );
    const late = new Promise((_, reject) =>
      self.setTimeout(reject, WAIT_FOR_LAPTOP),
    );
    event.respondWith(
      Promise.race([fresh, late]).catch(
        async () =>
          (await caches.match('/')) ?? fresh.catch(() => Response.error()),
      ),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((kept) => kept ?? fetch(request)),
    );
    return;
  }

  // theme.js, the manifest and the icons: fresh when the server answers.
  event.respondWith(
    fetch(request)
      .then(async (fresh) => {
        if (fresh.ok && SHELL.includes(url.pathname)) {
          await (await caches.open(CACHE)).put(request, fresh.clone());
        }
        return fresh;
      })
      .catch(async () => (await caches.match(request)) ?? Response.error()),
  );
});

/**
 * Throwaway spike server. Serves a minimal PWA, holds one push subscription,
 * and sends notifications that carry the second they were sent.
 *
 * The send time in the body is the whole point: comparing it with when the
 * notification actually appears is the measurement.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(HERE, 'public');
const KEYS = join(HERE, 'vapid.json');
const SUBS = join(HERE, 'subscriptions.json');
/** Overridable, because 8080 is the port everything else wants too. */
const PORT = Number(process.env.PORT ?? 8080);

/** Generated once and kept, because a new key pair invalidates every sub. */
function vapidKeys() {
  if (existsSync(KEYS)) {
    return JSON.parse(readFileSync(KEYS, 'utf8'));
  }
  const keys = webpush.generateVAPIDKeys();
  writeFile(KEYS, JSON.stringify(keys, null, 2));
  return keys;
}

const keys = vapidKeys();
webpush.setVapidDetails(
  'mailto:aditya.jadhav7910@gmail.com',
  keys.publicKey,
  keys.privateKey,
);

function loadSubs() {
  if (!existsSync(SUBS)) return [];
  try {
    return JSON.parse(readFileSync(SUBS, 'utf8'));
  } catch {
    return [];
  }
}

/** What has been sent, so the page can show sent-at against your own eyes. */
const log = [];

async function send(label) {
  const subs = loadSubs();
  if (subs.length === 0) return { ok: false, error: 'nothing is subscribed' };

  const sentAt = new Date();
  const stamp = sentAt.toLocaleTimeString('en-US', { hour12: false });
  const payload = JSON.stringify({
    title: `Spike: ${label}`,
    body: `Sent at ${stamp}. Note when this appeared.`,
    tag: `spike-${sentAt.getTime()}`,
  });

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        return { ok: true };
      } catch (error) {
        // 404 and 410 from the push service mean the subscription is gone,
        // which is question three. Anything else is a local failure and still
        // has to be legible, or a silent spike teaches nothing.
        return {
          ok: false,
          status: error.statusCode ?? null,
          gone: error.statusCode === 404 || error.statusCode === 410,
          error: error.body ?? error.message,
        };
      }
    }),
  );

  const entry = { label, sentAt: sentAt.toISOString(), stamp, results };
  log.unshift(entry);
  return entry;
}

function body(request) {
  return new Promise((resolve) => {
    let text = '';
    request.on('data', (chunk) => (text += chunk));
    request.on('end', () => {
      try {
        resolve(JSON.parse(text || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
};

function json(response, code, value) {
  response.writeHead(code, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/api/vapid') {
    return json(response, 200, { publicKey: keys.publicKey });
  }

  if (url.pathname === '/api/subscribe' && request.method === 'POST') {
    const sub = await body(request);
    const subs = loadSubs().filter((one) => one.endpoint !== sub.endpoint);
    subs.push(sub);
    await writeFile(SUBS, JSON.stringify(subs, null, 2));
    console.log(`subscribed: ${subs.length} device(s)`);
    return json(response, 200, { count: subs.length });
  }

  if (url.pathname === '/api/send' && request.method === 'POST') {
    const { delaySeconds = 0, label = 'now' } = await body(request);
    if (delaySeconds > 0) {
      // Deliberately not awaited: the reply goes back so you can lock the
      // phone before it fires.
      setTimeout(() => {
        void send(label).then((entry) => console.log('sent', entry.stamp));
      }, delaySeconds * 1000);
      return json(response, 200, { scheduled: delaySeconds });
    }
    return json(response, 200, await send(label));
  }

  if (url.pathname === '/api/log') {
    return json(response, 200, { subscriptions: loadSubs().length, log });
  }

  // Static, with no path taken from the request beyond a known filename.
  const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  const file = join(PUBLIC, name);
  if (!file.startsWith(PUBLIC) || !existsSync(file)) {
    response.writeHead(404);
    return response.end('not found');
  }

  response.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // The service worker must not be cached while you are iterating.
    'cache-control': 'no-store',
  });
  response.end(await readFile(file));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`spike on http://127.0.0.1:${PORT}`);
  console.log('put it on the tailnet with:');
  console.log(`  tailscale serve --bg --https=443 http://127.0.0.1:${PORT}`);
});

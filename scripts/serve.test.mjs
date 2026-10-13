import { expect, test } from 'vitest';
import { join, resolve } from 'node:path';
import {
  cacheFor,
  fileFor,
  headersFor,
  hostAllowed,
  tailnetNameFrom,
  typeOf,
} from './serve.mjs';

// Resolved, so the same expectations hold on Windows here and Linux in CI.
const ROOT = resolve('deployed');

test('AC-74.2 the root is the page, and files inside the folder are served', () => {
  expect(fileFor(ROOT, '/')).toBe(join(ROOT, 'index.html'));
  expect(fileFor(ROOT, '/assets/index-abc123.js')).toBe(
    join(ROOT, 'assets', 'index-abc123.js'),
  );
  // A query string is not part of the file's name.
  expect(fileFor(ROOT, '/theme.js?v=2')).toBe(join(ROOT, 'theme.js'));
});

test('AC-74.2 a path that climbs out of the folder is refused', () => {
  expect(fileFor(ROOT, '/../secrets.txt')).toBeNull();
  expect(fileFor(ROOT, '/assets/../../Windows/win.ini')).toBeNull();
  expect(fileFor(ROOT, '/%2e%2e/secrets.txt')).toBeNull();
  expect(fileFor(ROOT, '/..%5csecrets.txt')).toBeNull();
});

test('AC-74.2 a path that is not a valid address is refused, not thrown', () => {
  expect(fileFor(ROOT, '/%E0%A4%A')).toBeNull();
});

test('AC-74.3 the page is never cached, and hashed assets always are', () => {
  expect(cacheFor('/')).toBe('no-cache');
  expect(cacheFor('/theme.js')).toBe('no-cache');
  expect(cacheFor('/assets/index-abc123.js')).toBe(
    'public, max-age=31536000, immutable',
  );
});

test('AC-74.2 each file goes out with its own type', () => {
  expect(typeOf('index.html')).toBe('text/html; charset=utf-8');
  expect(typeOf('a.js')).toBe('text/javascript; charset=utf-8');
  expect(typeOf('a.css')).toBe('text/css; charset=utf-8');
  expect(typeOf('a.svg')).toBe('image/svg+xml');
  expect(typeOf('deployed.txt')).toBe('text/plain; charset=utf-8');
  expect(typeOf('unknown.bin')).toBe('application/octet-stream');
});

test('AC-83.4 localhost and 127.0.0.1 on the server port are answered', () => {
  expect(hostAllowed('localhost:4180', 4180)).toBe(true);
  expect(hostAllowed('127.0.0.1:4180', 4180)).toBe(true);
});

test('AC-83.4 any other name, a rebound domain included, is refused', () => {
  expect(hostAllowed('evil.example:4180', 4180)).toBe(false);
  expect(hostAllowed('localhost.evil.example:4180', 4180)).toBe(false);
  expect(hostAllowed('localhost:9999', 4180)).toBe(false);
  expect(hostAllowed(undefined, 4180)).toBe(false);
});

test('AC-94.1 every file tells the browser never to show it inside a frame', () => {
  for (const [file, url] of [
    [join(ROOT, 'index.html'), '/'],
    [join(ROOT, 'assets', 'index-abc123.js'), '/assets/index-abc123.js'],
  ]) {
    const headers = headersFor(file, url);
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'none'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Content-Type']).toBe(typeOf(file));
    expect(headers['Cache-Control']).toBe(cacheFor(url));
  }
});

const NAME = 'hub.tail1234.ts.net';

test("AC-96.1 the laptop's own Tailscale name is answered, exactly", () => {
  expect(hostAllowed(NAME, 4180, NAME)).toBe(true);
  expect(hostAllowed('localhost:4180', 4180, NAME)).toBe(true);
});

test('AC-96.1 other Tailscale names, and no Tailscale at all, are refused', () => {
  expect(hostAllowed('other.tail1234.ts.net', 4180, NAME)).toBe(false);
  expect(hostAllowed(`evil.${NAME}`, 4180, NAME)).toBe(false);
  expect(hostAllowed(`${NAME}.evil.example`, 4180, NAME)).toBe(false);
  expect(hostAllowed(NAME, 4180, null)).toBe(false);
});

test('AC-96.1 the name is read from tailscale status, without its final dot', () => {
  const status = JSON.stringify({ Self: { DNSName: 'Hub.Tail1234.ts.net.' } });
  expect(tailnetNameFrom(status)).toBe(NAME);
  expect(tailnetNameFrom('{}')).toBeNull();
  expect(tailnetNameFrom('not json')).toBeNull();
  expect(tailnetNameFrom(JSON.stringify({ Self: { DNSName: '' } }))).toBeNull();
});

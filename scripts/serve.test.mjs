import { expect, test } from 'vitest';
import { join, resolve } from 'node:path';
import { cacheFor, fileFor, typeOf } from './serve.mjs';

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

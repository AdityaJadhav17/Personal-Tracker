/**
 * US-74. Serve the deployed app at http://localhost:4180, so the taskbar icon
 * is the whole of opening it. A scheduled task starts this at login with no
 * window, and restarts it if it stops.
 *
 * Node's own modules only, on purpose: the updater reinstalls `node_modules`
 * in its clone on every deploy, and on Windows a server running out of that
 * folder is how a reinstall fails. It listens on loopback, so nothing off
 * this laptop can reach it, and it answers only files inside the folder.
 */
import { readFile } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

/** AC-74.2. The content type a file goes out with, by its extension. */
export function typeOf(name) {
  return TYPES[extname(name).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * AC-74.3. Hashed assets never change under the same name, so they can be
 * kept for good; everything else is checked on every load, so a reload after
 * a deploy always shows the new version.
 */
export function cacheFor(url) {
  return url.startsWith('/assets/')
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';
}

/**
 * AC-74.2. The file a request asks for, or null if it is not one this server
 * gives out: an address that does not decode, a backslash (a separator on
 * Windows, a way round the check anywhere), or a path that climbs out of the
 * folder once `..` is resolved.
 */
export function fileFor(root, url) {
  let path;
  try {
    path = decodeURIComponent(url.split('?')[0] ?? '/');
  } catch {
    return null;
  }
  if (path.includes('\\') || path.includes('\0')) return null;

  const base = resolve(root);
  const file = resolve(base, `.${path === '/' ? '/index.html' : path}`);
  return file.startsWith(base + sep) ? file : null;
}

function serve(root, port) {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    const url = request.url ?? '/';
    const file = fileFor(root, url);
    if (!file) {
      response.writeHead(400).end();
      return;
    }
    // A folder or a missing file both fail here, and both are a 404.
    readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404, { 'Content-Type': TYPES['.txt'] });
        response.end('Not found');
        return;
      }
      response.writeHead(200, {
        'Content-Type': typeOf(file),
        'Cache-Control': cacheFor(url),
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    });
  });

  // Port taken, most likely by an old copy: exit, and the task tries again.
  server.on('error', (error) => {
    console.error(`Could not serve on ${port}: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Overridable so it is tried on a scratch folder and port, never the real
  // app's, the same way the updater is.
  const root =
    process.env.PT_TARGET ??
    join(process.env.LOCALAPPDATA ?? '', 'PersonalTracker');
  serve(root, Number(process.env.PT_PORT ?? 4180));
}

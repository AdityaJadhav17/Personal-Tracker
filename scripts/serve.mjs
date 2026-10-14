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
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { readFile, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dbProblem, readHub, writeHub } from './hub.mjs';

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
  // AC-96.3. The installed app's name and icons.
  '.webmanifest': 'application/manifest+json',
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

/**
 * AC-94.1. What every file goes out with. Besides its type and caching, the
 * page refuses to be shown inside a frame: a <meta> CSP cannot say that, so
 * the server does, and another site cannot dress the app up as its own.
 */
export function headersFor(file, url) {
  return {
    'Content-Type': typeOf(file),
    'Cache-Control': cacheFor(url),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "frame-ancestors 'none'",
  };
}

/**
 * AC-83.4. Whether a request was addressed to this server by its own name. A
 * page that rebinds its domain to 127.0.0.1 reaches the port under that
 * domain's name, so anything else is refused.
 */
export function hostAllowed(host, port, tailnetName = null) {
  return (
    host === `localhost:${port}` ||
    host === `127.0.0.1:${port}` ||
    // AC-96.1. The phone, through `tailscale serve`, which passes on the name
    // it was reached by. Only Tailscale's DNS answers for it, so a rebinding
    // page cannot borrow it.
    (tailnetName !== null && host === tailnetName)
  );
}

/** AC-96.1. This laptop's name on the tailnet, from `tailscale status --json`. */
export function tailnetNameFrom(status) {
  try {
    const name = JSON.parse(status)?.Self?.DNSName;
    return typeof name === 'string' && name !== ''
      ? name.replace(/\.$/, '').toLowerCase()
      : null;
  } catch {
    return null;
  }
}

/** AC-100.4. The login that owns this laptop on the tailnet. */
export function tailnetLoginFrom(status) {
  try {
    const parsed = JSON.parse(status);
    const login = parsed?.User?.[parsed?.Self?.UserID]?.LoginName;
    return typeof login === 'string' && login !== '' ? login : null;
  } catch {
    return null;
  }
}

/**
 * AC-100.4. Fail closed: the Host is sent by the caller, so a request is also
 * the tailnet's if it carries anything only Tailscale's proxy adds.
 */
export function isTailnetRequest(headers, port) {
  return (
    (headers.host !== `localhost:${port}` &&
      headers.host !== `127.0.0.1:${port}`) ||
    'tailscale-user-login' in headers ||
    'x-forwarded-for' in headers ||
    'x-forwarded-proto' in headers
  );
}

/**
 * AC-100.3 and AC-100.4. A page on another site cannot send a custom header
 * or a JSON body without asking first, and this server never answers the
 * asking; through Tailscale, the caller must also be this laptop's owner,
 * as Tailscale itself vouches.
 */
export function syncAllowed(headers, method, isTailnet, login) {
  if (headers['x-margin-sync'] !== '1') return false;
  if (
    method === 'PUT' &&
    !String(headers['content-type'] ?? '').startsWith('application/json')
  ) {
    return false;
  }
  if (isTailnet) {
    return (
      typeof login === 'string' &&
      login !== '' &&
      headers['tailscale-user-login'] === login
    );
  }
  return true;
}

/**
 * AC-96.1. Asked of Tailscale itself, so there is nothing to configure. Not at
 * start: at logon Tailscale may not be up yet. Asked when a request comes in
 * under some other name, and at most once a minute, so a page sending names
 * at the server cannot make it start a process per request.
 */
let tailnet = { name: null, login: null, askedAt: -Infinity };
function tailnetStatus() {
  if (tailnet.name === null && Date.now() - tailnet.askedAt > 60_000) {
    let status = '';
    // On PATH, or where the Windows installer puts it: a process started
    // before Tailscale was installed has a PATH without it.
    for (const command of [
      'tailscale',
      join(process.env.ProgramFiles ?? '', 'Tailscale', 'tailscale.exe'),
    ]) {
      try {
        status = execFileSync(command, ['status', '--json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 5_000,
        });
        break;
      } catch {
        // Not here; and if nowhere, not installed or not running: localhost only.
      }
    }
    tailnet = {
      name: tailnetNameFrom(status),
      login: tailnetLoginFrom(status),
      askedAt: Date.now(),
    };
  }
  return tailnet;
}
// One `tailscale status` call serves both (AC-100.4).
const tailnetName = () => tailnetStatus().name;
const tailnetLogin = () => tailnetStatus().login;

const MAX_BODY = 5 * 1024 * 1024;

/** AC-100.5. Whether a parsed body carries a revision that is a count. */
function validRevision(body) {
  return Number.isInteger(body?.revision) && body.revision >= 0;
}

/** AC-100.1 to AC-100.5. GET and PUT of the shared copy. */
function sync(request, response, dataDir) {
  // Answers once: after any response, including the 413, this does nothing.
  const send = (status, body, extra = {}) => {
    if (response.headersSent) return;
    response.writeHead(status, {
      'Content-Type': TYPES['.json'],
      'Cache-Control': 'no-store',
      ...extra,
    });
    response.end(body === undefined ? undefined : JSON.stringify(body));
  };
  try {
    if (request.method === 'GET') {
      send(200, readHub(dataDir));
    } else if (request.method === 'PUT') {
      const chunks = [];
      let size = 0;
      request.on('error', () => response.destroy());
      request.on('data', (chunk) => {
        if (response.headersSent) return;
        size += chunk.length;
        if (size > MAX_BODY) {
          chunks.length = 0;
          send(413, undefined, { Connection: 'close' });
          response.once('finish', () => request.destroy());
          return;
        }
        chunks.push(chunk);
      });
      request.on('end', () => {
        if (response.headersSent) return;
        try {
          let body;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            send(400);
            return;
          }
          const problem = validRevision(body)
            ? dbProblem(body.db, readHub(dataDir).db)
            : 'revision';
          if (problem) {
            send(400, { error: problem });
            return;
          }
          const result = writeHub(dataDir, body.revision, body.db);
          if (result.ok) send(200, { revision: result.revision });
          else send(409);
        } catch {
          send(500);
        }
      });
    } else {
      response.writeHead(405, { Allow: 'GET, PUT' }).end();
    }
  } catch {
    send(500);
  }
}

export function serve(root, port, dataDir) {
  const server = createServer((request, response) => {
    const host = request.headers.host;
    if (!hostAllowed(host, port) && !hostAllowed(host, port, tailnetName())) {
      response.writeHead(403).end();
      return;
    }
    if (request.url === '/api/sync') {
      const isTailnet = isTailnetRequest(request.headers, port);
      const login = isTailnet ? tailnetLogin() : null;
      if (!syncAllowed(request.headers, request.method, isTailnet, login)) {
        response.writeHead(403).end();
        return;
      }
      sync(request, response, dataDir);
      return;
    }
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
      response.writeHead(200, headersFor(file, url));
      response.end(request.method === 'HEAD' ? undefined : body);
    });
  });

  // Port taken, most likely by an old copy: exit, and the task tries again.
  server.on('error', (error) => {
    console.error(`Could not serve on ${port}: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, '127.0.0.1');
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Overridable so it is tried on a scratch folder and port, never the real
  // app's, the same way the updater is.
  const root =
    process.env.PT_TARGET ??
    join(process.env.LOCALAPPDATA ?? '', 'PersonalTracker');
  const server = serve(
    root,
    Number(process.env.PT_PORT ?? 4180),
    process.env.PT_DATA ??
      join(process.env.LOCALAPPDATA ?? '', 'PersonalTracker-data'),
  );
  // US-100. So a deploy can end this process; the task starts a new one.
  server.once('listening', () => {
    try {
      writeFileSync(
        process.env.PT_PID ??
          join(process.env.LOCALAPPDATA ?? '', 'PersonalTracker-server.pid'),
        String(process.pid),
      );
    } catch (error) {
      // Serving matters more; a deploy then says to restart by hand.
      console.error(`Could not write the pid file: ${error.message}`);
    }
  });
}

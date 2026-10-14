import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { serve } from './serve.mjs';

const PORT = 4197;
const base = `http://127.0.0.1:${PORT}/api/sync`;
let server, data, root;
const headers = { Host: `localhost:${PORT}`, 'X-Margin-Sync': '1' };

beforeAll(async () => {
  data = mkdtempSync(join(tmpdir(), 'pt-data-'));
  root = mkdtempSync(join(tmpdir(), 'pt-root-'));
  server = serve(root, PORT, data);
  await new Promise((r) => server.once('listening', r));
});
afterAll(() => {
  server.close();
  rmSync(data, { recursive: true, force: true });
  rmSync(root, { recursive: true, force: true });
});

const db = {
  version: 11,
  items: [],
  goals: [],
  courses: [],
  reflections: [],
  notes: [],
  lastBackupAt: null,
  lock: null,
  tasks: [],
  deleted: [],
};

const put = (body, extra = {}) =>
  fetch(base, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json', ...extra },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('AC-100.1 and AC-100.2 read, write, and a stale write refused', async () => {
  expect(await (await fetch(base, { headers })).json()).toEqual({
    revision: 0,
    db: null,
  });
  expect((await put({ revision: 0, db })).status).toBe(200);
  expect((await put({ revision: 0, db })).status).toBe(409);
  expect((await (await fetch(base, { headers })).json()).revision).toBe(1);
});

test('AC-100.3 without the header, 403', async () => {
  expect(
    (await fetch(base, { headers: { Host: `localhost:${PORT}` } })).status,
  ).toBe(403);
});

test('AC-100.5 a db that is not a database is refused', async () => {
  expect((await put({ revision: 1, db: { hello: 'x' } })).status).toBe(400);
});

test('AC-100.5 a revision that is not a count is refused', async () => {
  for (const revision of [-1, 1.5, '1', null]) {
    expect((await put({ revision, db })).status).toBe(400);
  }
});

test('AC-100.5 a body that is not JSON is refused', async () => {
  expect((await put('{nope')).status).toBe(400);
});

test('AC-100.5 a body over 5 MB is refused', async () => {
  const big = JSON.stringify({ revision: 1, db, pad: 'x'.repeat(5_300_000) });
  const res = await put(big);
  expect(res.status).toBe(413);
  // Whether or not the upload finished first, the server is still up.
  expect((await fetch(base, { headers })).status).toBe(200);
});

test('AC-100.5 other methods are 405', async () => {
  const res = await fetch(base, { method: 'DELETE', headers });
  expect(res.status).toBe(405);
});

test('AC-100.5 a failed write is a 500, not a dead server', async () => {
  rmSync(data, { recursive: true, force: true });
  // A file where the folder should be makes writeHub throw.
  const { writeFileSync } = await import('node:fs');
  writeFileSync(data, 'in the way');
  expect((await put({ revision: 0, db })).status).toBe(500);
  rmSync(data, { force: true });
  expect((await fetch(base, { headers })).status).toBe(200);
});

test('AC-100.4 local Host with forwarding headers and no login is 403', async () => {
  const res = await fetch(base, {
    headers: { ...headers, 'X-Forwarded-For': '100.64.0.2' },
  });
  expect(res.status).toBe(403);
});

test('AC-100.5 an older database than the held one is refused with a reason', async () => {
  const { revision } = await (await fetch(base, { headers })).json();
  const res = await put({ revision, db: { ...db, version: 10 } });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toEqual(expect.any(String));
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { useDatabase } from './useDatabase';
import { useSync } from './useSync';
import { serialize } from '../domain/transfer';
import type { Database } from '../domain/types';

const DB: Database = {
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

const NOTE = {
  id: 'n1',
  body: 'From the laptop',
  pinned: false,
  sealed: null,
  createdAt: '2026-09-14T10:00:00.000Z',
  updatedAt: '2026-09-14T10:00:00.000Z',
  changedAt: '2026-09-14T10:00:00.000Z',
};

interface Call {
  method: string;
  headers: Record<string, string>;
  body?: string | undefined;
}

/** A server holding `shared`; `put` answers each PUT. */
function server(
  shared: unknown,
  put: (call: Call) => Response = () => Response.json({ revision: 1 }),
) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit = {}) => {
      const call = {
        method: init.method ?? 'GET',
        headers: (init.headers ?? {}) as Record<string, string>,
        body: init.body as string | undefined,
      };
      calls.push(call);
      return Promise.resolve(
        call.method === 'PUT'
          ? put(call)
          : Response.json({ revision: 0, db: shared }),
      );
    }),
  );
  return calls;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

test('AC-101.1 it reads, merges and writes back against the revision it read', async () => {
  const calls = server(null);
  const { result } = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(result.current.state).toBe('synced'));
  expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT']);
  expect(calls[0]!.headers['X-Margin-Sync']).toBe('1');
  expect(JSON.parse(calls[1]!.body!).revision).toBe(0);
});

test('AC-101.2 a newer record on the laptop is adopted', async () => {
  server({ ...DB, notes: [NOTE] });
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(DB, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('synced'));
  expect(adopt).toHaveBeenCalledWith(
    expect.objectContaining({ notes: [expect.objectContaining({ id: 'n1' })] }),
  );
});

test('AC-101.1 a 409 reads again and writes again; three give up', async () => {
  const calls = server(null, () => new Response('{}', { status: 409 }));
  const { result } = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(result.current.state).toBe('failed'));
  expect(calls.map((c) => c.method)).toEqual([
    'GET',
    'PUT',
    'GET',
    'PUT',
    'GET',
    'PUT',
  ]);
});

test('AC-101.1 one 409 then success is synced', async () => {
  let n = 0;
  const calls = server(null, () =>
    n++ === 0
      ? new Response('{}', { status: 409 })
      : Response.json({ revision: 1 }),
  );
  const { result } = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(result.current.state).toBe('synced'));
  expect(calls.map((c) => c.method)).toEqual(['GET', 'PUT', 'GET', 'PUT']);
});

test('AC-101.4 a shared copy the importer refuses is failed, with no adopt and no PUT', async () => {
  const calls = server({ nonsense: true });
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(DB, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('failed'));
  expect(adopt).not.toHaveBeenCalled();
  expect(calls.map((c) => c.method)).toEqual(['GET']);
});

test('AC-101.4 an app older than the shared copy writes nothing and says update', async () => {
  const calls = server({ ...DB, version: 12 });
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(DB, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('failed'));
  expect(result.current.reason).toMatch(/Update the app/);
  expect(adopt).not.toHaveBeenCalled();
  expect(calls.map((c) => c.method)).toEqual(['GET']);
});

test('AC-101.5 a network error is unreachable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
  const { result } = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(result.current.state).toBe('unreachable'));
});

test('AC-101.5 a server without sync (404, or not JSON) is unreachable, quietly', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('<html>', { status: 404 }))),
  );
  const a = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(a.result.current.state).toBe('unreachable'));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('<html>'))),
  );
  const b = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(b.result.current.state).toBe('unreachable'));
});

test('AC-101.5 a 403 says the laptop refused, a PUT 400 says what the laptop said', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response('{}', { status: 403 }))),
  );
  const a = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(a.result.current.state).toBe('failed'));
  expect(a.result.current.reason).toBe('The laptop refused this device.');

  server(null, () => Response.json({ error: 'Too odd.' }, { status: 400 }));
  const b = renderHook(() => useSync(DB, () => true, 0));
  await waitFor(() => expect(b.result.current.state).toBe('failed'));
  expect(b.result.current.reason).toBe('Too odd.');
});

test('AC-101.1 merging a copy with itself sends nothing', async () => {
  const same = { ...DB, notes: [NOTE] };
  const calls = server(same);
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(same, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('synced'));
  expect(calls.map((c) => c.method)).toEqual(['GET']);
  expect(adopt).not.toHaveBeenCalled();
});

test('AC-101.1 an edit made during a sync survives and reaches the next PUT', async () => {
  const puts: Database[] = [];
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  let first = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit = {}) => {
      if (init.method === 'PUT') {
        puts.push(JSON.parse(init.body as string).db as Database);
        return Response.json({ revision: 1 });
      }
      if (first) {
        first = false;
        await held;
      }
      return Response.json({ revision: 0, db: JSON.parse(serialize(DB)) });
    }),
  );
  const { result } = renderHook(() => {
    const d = useDatabase();
    return { d, s: useSync(d.db, d.actions.adoptSynced, 0) };
  });
  await waitFor(() => expect(result.current.s.state).toBe('syncing'));
  act(() => {
    result.current.d.actions.addNote('Typed mid-sync');
  });
  await act(async () => release());
  await waitFor(() => expect(puts.length).toBeGreaterThanOrEqual(1));
  expect(result.current.d.db!.notes).toHaveLength(1);
  expect(puts.at(-1)!.notes).toHaveLength(1);
  await waitFor(() => expect(result.current.s.state).toBe('synced'));
});

test('AC-101.1 adopting synced data does not start an endless loop', async () => {
  const calls = server({ ...DB, notes: [NOTE] });
  const { result } = renderHook(() => {
    const d = useDatabase();
    return { d, s: useSync(d.db, d.actions.adoptSynced, 0) };
  });
  await waitFor(() => expect(result.current.d.db!.notes).toHaveLength(1));
  await act(() => new Promise((r) => setTimeout(r, 100)));
  const gets = calls.filter((c) => c.method === 'GET').length;
  await act(() => new Promise((r) => setTimeout(r, 100)));
  expect(calls.filter((c) => c.method === 'GET').length).toBe(gets);
  expect(gets).toBeLessThanOrEqual(3);
});

test('AC-101.5 an answer that is not a sync answer is failed, not unreachable', async () => {
  for (const body of [
    {},
    null,
    { revision: 'x', db: null },
    { revision: 0, db: 5 },
  ]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(body))),
    );
    const { result } = renderHook(() => useSync(DB, () => true, 0));
    await waitFor(() => expect(result.current.state).toBe('failed'));
    expect(result.current.reason).toBe('The laptop sent something unreadable.');
  }
});

test('AC-101.1 a sync still out when the app goes away adopts nothing', async () => {
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      await held;
      return Response.json({ revision: 0, db: { ...DB, notes: [NOTE] } });
    }),
  );
  const adopt = vi.fn(() => true);
  const { unmount } = renderHook(() => useSync(DB, adopt, 0));
  await act(() => new Promise((r) => setTimeout(r, 20)));
  unmount();
  await act(async () => release());
  await act(() => new Promise((r) => setTimeout(r, 20)));
  expect(adopt).not.toHaveBeenCalled();
});

test('AC-101.1 an edit made while the other device change arrives keeps both', async () => {
  const puts: Database[] = [];
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  let first = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit = {}) => {
      if (init.method === 'PUT') {
        puts.push(JSON.parse(init.body as string).db as Database);
        return Response.json({ revision: 1 });
      }
      if (first) {
        first = false;
        await held;
      }
      return Response.json({ revision: 0, db: { ...DB, notes: [NOTE] } });
    }),
  );
  const { result } = renderHook(() => {
    const d = useDatabase();
    return { d, s: useSync(d.db, d.actions.adoptSynced, 0) };
  });
  await waitFor(() => expect(result.current.s.state).toBe('syncing'));
  act(() => {
    result.current.d.actions.addNote('Typed mid-sync');
  });
  await act(async () => release());
  await waitFor(() => expect(puts.length).toBeGreaterThanOrEqual(1));
  expect(result.current.d.db!.notes).toHaveLength(2);
  expect(puts.at(-1)!.notes).toHaveLength(2);
});

test('AC-101.5 a round in the background leaves the last result showing', async () => {
  let hold: Promise<void> | null = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      await hold;
      return Response.json({ revision: 0, db: JSON.parse(serialize(DB)) });
    }),
  );
  const { result } = renderHook(() => {
    const d = useDatabase();
    return useSync(d.db, d.actions.adoptSynced, 0);
  });
  await waitFor(() => expect(result.current.state).toBe('synced'));
  let release!: () => void;
  hold = new Promise<void>((r) => (release = r));
  let again!: Promise<void>;
  act(() => {
    again = result.current.syncNow();
  });
  expect(result.current.state).toBe('synced');
  await act(async () => {
    release();
    await again;
  });
  expect(result.current.state).toBe('synced');
});

test('AC-101.7 locked notes under a different passcode pause sync with no PUT and no adopt', async () => {
  const lock = (salt: string, changedAt: string) => ({
    salt,
    check: { iv: 'c', data: 'c' },
    changedAt,
  });
  const local = {
    ...DB,
    lock: lock('old', '2026-09-14T09:00:00.000Z'),
    notes: [{ ...NOTE, sealed: { iv: 'i', data: 'd' } }],
  };
  const calls = server({
    ...DB,
    lock: lock('new', '2026-09-14T10:00:00.000Z'),
  });
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(local, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('failed'));
  expect(result.current.reason).toBe(
    'Sync paused: 1 locked note here uses a different passcode than the other device. Open it and remove its lock, then sync.',
  );
  expect(adopt).not.toHaveBeenCalled();
  expect(calls.map((c) => c.method)).toEqual(['GET']);
});

test('AC-101.7 locked notes on the other device under a different passcode pause sync here with no PUT and no adopt', async () => {
  const lock = (salt: string, changedAt: string) => ({
    salt,
    check: { iv: 'c', data: 'c' },
    changedAt,
  });
  const local = { ...DB, lock: lock('new', '2026-09-14T10:00:00.000Z') };
  const calls = server({
    ...DB,
    lock: lock('old', '2026-09-14T09:00:00.000Z'),
    notes: [{ ...NOTE, sealed: { iv: 'i', data: 'd' } }],
  });
  const adopt = vi.fn(() => true);
  const { result } = renderHook(() => useSync(local, adopt, 0));
  await waitFor(() => expect(result.current.state).toBe('failed'));
  expect(result.current.reason).toBe(
    'Sync paused: 1 locked note on your other device uses a different passcode. Open it there and remove its lock, then sync here.',
  );
  expect(adopt).not.toHaveBeenCalled();
  expect(calls.map((c) => c.method)).toEqual(['GET']);
});

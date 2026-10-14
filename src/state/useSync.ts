import { useCallback, useEffect, useRef, useState } from 'react';
import { now } from '../domain/dates';
import { lockConflict, merge, sameRecords } from '../domain/sync';
import { parseImport, serialize } from '../domain/transfer';
import type { Database } from '../domain/types';

/** AC-101.1. Long enough that a burst of typing is one sync, not fifty. */
const SETTLE = 3_000;
const EVERY = 60_000;
const HEADERS = { 'X-Margin-Sync': '1' };

export type SyncState =
  'idle' | 'syncing' | 'synced' | 'unreachable' | 'failed';

/** Nobody to talk to: offline, or this server has no sync. */
class Unreachable extends Error {}

async function get(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Unreachable();
  }
}

/** AC-101.7 and AC-102.4. Why sync stopped, and what to do about it. */
function paused(count: number, here: boolean): string {
  const one = count === 1;
  const notes = `${count} locked note${one ? '' : 's'}`;
  const lock = one ? 'its lock' : 'their lock';
  return here
    ? `Sync paused: ${notes} here ${one ? 'uses' : 'use'} a different passcode than the other device. Open ${one ? 'it' : 'them'} and remove ${lock}, then sync.`
    : `Sync paused: ${notes} on your other device ${one ? 'uses' : 'use'} a different passcode. Open ${one ? 'it' : 'them'} there and remove ${lock}, then sync here.`;
}

/**
 * US-101. One round with the laptop: read its copy, merge, write back against
 * the revision read, and take the merge here. A TypeError means no laptop to
 * talk to (offline, no sync on this server); any other Error is a refusal.
 */
async function syncOnce(
  local: Database,
  adopt: (next: Database) => boolean,
  current: () => Database | null,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await get('/api/sync', { headers: HEADERS });
    if (res.status === 403) throw new Error('The laptop refused this device.');
    if (!res.ok) throw new Unreachable();
    const got = (await res.json().catch(() => {
      throw new Unreachable();
    })) as { revision?: unknown; db?: unknown } | null;
    if (
      !got ||
      typeof got !== 'object' ||
      !Number.isInteger(got.revision) ||
      (got.db !== null && (typeof got.db !== 'object' || got.db === undefined))
    ) {
      throw new Error('The laptop sent something unreadable.');
    }

    let shared: Database | null = null;
    if (got.db !== null) {
      const version = (got.db as { version?: unknown } | null)?.version;
      if (typeof version === 'number' && version > local.version) {
        throw new Error('Update the app: the laptop has a newer version.');
      }
      const parsed = parseImport(JSON.stringify(got.db));
      if (!parsed.ok) {
        throw new Error(`The shared copy is damaged: ${parsed.error}`);
      }
      shared = parsed.db;
    }

    const { count, here } = shared
      ? lockConflict(local, shared)
      : { count: 0, here: false };
    if (count > 0) throw new Error(paused(count, here));

    const merged = shared ? merge(local, shared) : local;
    // AC-102.1. Send nothing the other device's importer would refuse.
    const sendable = parseImport(serialize(merged));
    if (!sendable.ok) {
      throw new Error(
        `This device has data the other device would refuse: ${sendable.error.replace(/\.$/, '')}.`,
      );
    }
    if (!shared || !sameRecords(merged, shared)) {
      const put = await get('/api/sync', {
        method: 'PUT',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: got.revision, db: merged }),
      });
      if (put.status === 409) continue;
      if (!put.ok) {
        const said = (await put.json().catch(() => null)) as {
          error?: unknown;
        } | null;
        throw new Error(
          typeof said?.error === 'string'
            ? said.error
            : `The laptop answered ${put.status}.`,
        );
      }
    }
    if (!sameRecords(merged, local) && !adopt(merged)) {
      // AC-102.4. Refused because a lock was set here since the round began.
      const held = current();
      const now = held ? lockConflict(held, merged) : { count: 0, here: false };
      throw new Error(
        now.count > 0
          ? paused(now.count, now.here)
          : 'This device could not save the synced copy.',
      );
    }
    return;
  }
  throw new Error('Another device kept syncing at the same moment.');
}

/**
 * US-101. Keeps this copy and the laptop's in step: when the app opens,
 * `settle` ms after each change, every minute, and when the device comes
 * back online or the tab is shown again. One at a time; a trigger that
 * arrives mid-sync runs again right after, so an edit made meanwhile is sent.
 */
export function useSync(
  db: Database | null,
  adopt: (next: Database) => boolean,
  settle = SETTLE,
): {
  state: SyncState;
  at: string | null;
  reason: string;
  syncNow: () => Promise<void>;
} {
  const [state, setState] = useState<SyncState>('idle');
  const [at, setAt] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  // Held in refs so a new function or database each render does not restart
  // the timers, and so a sync reads what is true when it starts.
  const latest = useRef(db);
  latest.current = db;
  const adopting = useRef(adopt);
  adopting.current = adopt;
  const running = useRef(false);
  const again = useRef(false);
  const live = useRef(true);

  const syncNow = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        const local = latest.current;
        if (!local) break;
        // AC-101.5. Only before the first result; later rounds keep the last one showing.
        if (live.current) setState((s) => (s === 'idle' ? 'syncing' : s));
        try {
          await syncOnce(
            local,
            (next) => live.current && adopting.current(next),
            () => latest.current,
          );
          if (!live.current) break;
          setAt(now().toISOString());
          setReason('');
          setState('synced');
        } catch (error) {
          if (!live.current) break;
          if (error instanceof Unreachable) {
            setState('unreachable');
          } else {
            setState('failed');
            setReason(error instanceof Error ? error.message : String(error));
          }
        }
      } while (again.current && live.current);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  // On open, and after each change (adopting synced data is one; the sync it
  // causes finds nothing to write and stops).
  useEffect(() => {
    if (!db) return;
    const timer = setTimeout(() => void syncNow(), settle);
    return () => clearTimeout(timer);
  }, [db, settle, syncNow]);

  useEffect(() => {
    const tick = setInterval(() => void syncNow(), EVERY);
    const shown = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    const back = () => void syncNow();
    window.addEventListener('online', back);
    document.addEventListener('visibilitychange', shown);
    return () => {
      clearInterval(tick);
      window.removeEventListener('online', back);
      document.removeEventListener('visibilitychange', shown);
    };
  }, [syncNow]);

  return { state, at, reason, syncNow };
}

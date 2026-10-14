import { useEffect, useRef, useState } from 'react';
import {
  backupName,
  olderBackups,
  relock,
  staleBackups,
} from '../domain/backup';
import { daysBetween, now } from '../domain/dates';
import { parseImport, serialize } from '../domain/transfer';
import type { Database } from '../domain/types';
import {
  canBackUp,
  chooseFolder,
  namesIn,
  readFile,
  removeFile,
  savedFolder,
  writeFile,
} from '../storage/folder';
import type { Folder } from '../storage/folder';

/** AC-95.2. Long enough that a burst of typing is one write, not fifty. */
const SETTLE = 5_000;

const ASK = 'The browser needs your permission again to write to this folder.';
const GONE =
  'This folder could not be written to. If it is on a flash drive, plug it back in.';

export type BackupState = 'off' | 'on' | 'paused';

/**
 * US-95. Keeps a copy of the database in a folder the user picked: when the
 * app opens, and a few seconds after each change. Lives with the app, not
 * with Data, so it runs whichever view is open.
 */
export function useAutoBackup(
  db: Database | null,
  onBackedUp: (stamp: string) => void,
  settle = SETTLE,
  lockChanges = 0,
): {
  supported: boolean;
  folder: string | null;
  state: BackupState;
  reason: string;
  lastAt: string | null;
  choose: () => Promise<void>;
  allow: () => Promise<void>;
} {
  const supported = canBackUp();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [state, setState] = useState<BackupState>('off');
  const [reason, setReason] = useState('');
  const [lastAt, setLastAt] = useState<string | null>(null);
  // A new function every render; held here so a render alone does not
  // restart the wait before writing.
  const recorded = useRef(onBackedUp);
  recorded.current = onBackedUp;

  const current = useRef(db);
  current.current = db;
  const relocked = useRef(-1);

  function pause(why: string) {
    setState('paused');
    setReason(why);
  }

  // A folder picked in an earlier session. AC-95.5: whether the browser
  // still lets the page write there is its decision, asked, not assumed.
  useEffect(() => {
    if (!supported) return;
    let live = true;
    void savedFolder()
      .then(async (saved) => {
        if (!saved || !live) return;
        setFolder(saved);
        if (
          (await saved.queryPermission({ mode: 'readwrite' })) === 'granted'
        ) {
          setState('on');
        } else {
          pause(ASK);
        }
      })
      // No IndexedDB (a private window): there is simply no folder yet.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [supported]);

  useEffect(() => {
    if (state !== 'on' || !folder || !db) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (
            (await folder.queryPermission({ mode: 'readwrite' })) !== 'granted'
          ) {
            pause(ASK);
            return;
          }
          const at = now();
          const stamp = at.toISOString();
          await writeFile(
            folder,
            backupName(at),
            serialize({ ...db, lastBackupAt: stamp }),
          );
          for (const name of staleBackups(await namesIn(folder), at)) {
            await removeFile(folder, name);
          }
          setLastAt(stamp);
          // AC-95.4. Once a day is enough to quiet the reminder, and
          // recording it is itself a change, which would back up again.
          if (
            db.lastBackupAt === null ||
            daysBetween(db.lastBackupAt, at) > 0
          ) {
            recorded.current(stamp);
          }
        } catch {
          pause(GONE);
        }
      })();
    }, settle);
    return () => clearTimeout(timer);
  }, [db, folder, state, settle]);

  // AC-102.3. Older backups keep only the locked version of a note locked
  // since. Each is read, changed and written back under its own name, only
  // once the new text is ready, so a failure never costs a backup.
  useEffect(() => {
    if (state !== 'on' || !folder || lockChanges === relocked.current) return;
    void (async () => {
      try {
        if (
          (await folder.queryPermission({ mode: 'readwrite' })) !== 'granted'
        ) {
          pause(ASK);
          return;
        }
        let failed = false;
        for (const name of olderBackups(await namesIn(folder), now())) {
          try {
            const read = await readFile(folder, name);
            const parsed = parseImport(read);
            if (!parsed.ok || !current.current) continue;
            const text = serialize(relock(parsed.db, current.current));
            if (text !== read) {
              await writeFile(folder, name, text, false);
            }
          } catch {
            failed = true;
          }
        }
        if (failed) pause(GONE);
        else relocked.current = lockChanges;
      } catch {
        pause(GONE);
      }
    })();
  }, [lockChanges, folder, state]);

  return {
    supported,
    folder: folder?.name ?? null,
    state,
    reason,
    lastAt,
    async choose() {
      const picked = await chooseFolder();
      if (!picked) return;
      setFolder(picked);
      setReason('');
      setState('on');
    },
    async allow() {
      if (!folder) return;
      if (
        (await folder.requestPermission({ mode: 'readwrite' })) === 'granted'
      ) {
        setReason('');
        setState('on');
      }
    },
  };
}

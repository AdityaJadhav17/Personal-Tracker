/**
 * US-95. The folder automatic backups go to, and the writing into it.
 *
 * The folder is picked once through the File System Access API and its handle
 * kept in IndexedDB: a handle is not text, so localStorage cannot hold it.
 * Nothing else goes in that database; the data itself stays in localStorage.
 * See the decision log, 12 October.
 */

/** What Chromium has and TypeScript's DOM types do not, yet. */
type Permission = 'granted' | 'denied' | 'prompt';
interface Folder extends FileSystemDirectoryHandle {
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>;
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}
declare global {
  interface Window {
    showDirectoryPicker?: (options: {
      id: string;
      mode: 'readwrite';
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

export type { Folder };

const DATABASE = 'personal-tracker-backup';
const STORE = 'folder';
const KEY = 'backups';

/** AC-95.6. Safari, and so the iPhone, cannot write into a folder. */
export function canBackUp(): boolean {
  return typeof window.showDirectoryPicker === 'function';
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  act: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = act(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** The folder picked before, or null if none was. */
export async function savedFolder(): Promise<Folder | null> {
  const folder = await run<Folder | undefined>('readonly', (store) =>
    store.get(KEY),
  );
  return folder ?? null;
}

/** AC-95.1. Asks for a folder and remembers it; null if the user cancels. */
export async function chooseFolder(): Promise<Folder | null> {
  try {
    const folder = (await window.showDirectoryPicker!({
      id: 'personal-tracker-backups',
      mode: 'readwrite',
    })) as Folder;
    await run('readwrite', (store) => store.put(folder, KEY));
    return folder;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
}

/**
 * Write `text` into the folder as `name`, replacing any file of that name.
 * With `create` false, only a file that is still there (AC-102.3).
 */
export async function writeFile(
  folder: Folder,
  name: string,
  text: string,
  create = true,
): Promise<void> {
  const file = await folder.getFileHandle(name, { create });
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
}

/** The name of every file in the folder; folders are not listed. */
export async function namesIn(folder: Folder): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of folder.entries()) {
    if (handle.kind === 'file') names.push(name);
  }
  return names;
}

export async function removeFile(folder: Folder, name: string): Promise<void> {
  await folder.removeEntry(name);
}

/** AC-102.3. The text of the file called `name`. */
export async function readFile(folder: Folder, name: string): Promise<string> {
  const file = await (await folder.getFileHandle(name)).getFile();
  return file.text();
}

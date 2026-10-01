import type { Lock, Sealed } from './types';

/**
 * US-82. Locked notes, encrypted with the browser's own Web Crypto: PBKDF2
 * turns the passcode into an AES-GCM key, and AES-GCM seals the text. A wrong
 * key fails GCM's check rather than giving back garbage, which is how a
 * wrong passcode is told apart. Nothing here stores the passcode or the key.
 *
 * 600,000 iterations is OWASP's figure for PBKDF2-SHA256. It costs about a
 * tenth of a second per unlock here, and the same per guess to anyone
 * guessing from a copied file.
 */
const ITERATIONS = 600_000;

/** What `check` seals, so opening it proves the key. */
const KNOWN = 'personal-tracker';

/** A byte at a time: spreading a long note's bytes overflows the stack. */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

async function keyFrom(
  passcode: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** AC-82.2. The text, encrypted under a fresh IV every time. */
export async function seal(key: CryptoKey, text: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text),
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

/** AC-82.3. The text back. Throws when the key is not the one that sealed it. */
export async function openSealed(
  key: CryptoKey,
  sealed: Sealed,
): Promise<string> {
  const text = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(sealed.iv) },
    key,
    fromBase64(sealed.data),
  );
  return new TextDecoder().decode(text);
}

/** AC-82.1. A new lock for this passcode, and the key it opens with. */
export async function createLock(
  passcode: string,
): Promise<{ lock: Lock; key: CryptoKey }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await keyFrom(passcode, salt);
  return {
    lock: { salt: toBase64(salt), check: await seal(key, KNOWN) },
    key,
  };
}

/** AC-82.3. The key, or null when the passcode is wrong. */
export async function unlock(
  lock: Lock,
  passcode: string,
): Promise<CryptoKey | null> {
  const key = await keyFrom(passcode, fromBase64(lock.salt));
  try {
    return (await openSealed(key, lock.check)) === KNOWN ? key : null;
  } catch {
    return null;
  }
}

/** AC-86.3. A note's new seal, beside the one it replaces. */
export interface Resealed {
  id: string;
  was: Sealed;
  sealed: Sealed;
}

/**
 * AC-86.3. Every locked note sealed again under a new passcode, in memory.
 * Nothing is written here: the caller stores the new lock and every note in
 * one go, or nothing, so no note is ever left under the old key beside the
 * rest under the new one.
 */
export async function changePasscode(
  lock: Lock,
  notes: { id: string; sealed: Sealed }[],
  current: string,
  next: string,
): Promise<
  | { ok: true; lock: Lock; key: CryptoKey; notes: Resealed[] }
  | { ok: false; error: string }
> {
  const old = await unlock(lock, current);
  if (!old) return { ok: false, error: 'That passcode is not right.' };

  const texts: string[] = [];
  try {
    for (const note of notes) texts.push(await openSealed(old, note.sealed));
  } catch {
    // AC-86.4. Only a note merged in under another passcode does this.
    return {
      ok: false,
      error:
        'A locked note does not open with this passcode, so nothing was changed.',
    };
  }

  const made = await createLock(next);
  const resealed: Resealed[] = [];
  for (const [index, note] of notes.entries()) {
    resealed.push({
      id: note.id,
      was: note.sealed,
      sealed: await seal(made.key, texts[index]!),
    });
  }
  return { ok: true, lock: made.lock, key: made.key, notes: resealed };
}

import { changePasscode, createLock, openSealed, seal, unlock } from './lock';

describe('US-82 the lock', () => {
  test('AC-82.1 the right passcode opens the lock it made', async () => {
    const { lock } = await createLock('hunter22');
    expect(await unlock(lock, 'hunter22')).not.toBeNull();
  });

  test('AC-82.3 a wrong passcode opens nothing', async () => {
    const { lock } = await createLock('hunter22');
    expect(await unlock(lock, 'hunter23')).toBeNull();
  });

  test('AC-82.2 sealed text comes back only with the key', async () => {
    const { key } = await createLock('hunter22');
    const sealed = await seal(key, 'Bank details\nPIN 4412');

    expect(await openSealed(key, sealed)).toBe('Bank details\nPIN 4412');
  });

  test('AC-82.2 what is stored does not contain the text', async () => {
    const { key, lock } = await createLock('hunter22');
    const sealed = await seal(key, 'Bank details\nPIN 4412');

    const stored = JSON.stringify({ sealed, lock });
    expect(stored).not.toMatch(/4412|Bank|hunter22/);
  });

  test('AC-82.2 sealing the same text twice gives different output', async () => {
    const { key } = await createLock('hunter22');
    const a = await seal(key, 'same');
    const b = await seal(key, 'same');

    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  test('AC-82.2 a long note seals and opens whole', async () => {
    const { key } = await createLock('hunter22');
    const long = 'x'.repeat(300_000);

    expect(await openSealed(key, await seal(key, long))).toBe(long);
  });

  test('AC-82.3 a key from another lock cannot open a sealed note', async () => {
    const { key } = await createLock('hunter22');
    const other = await createLock('hunter22');
    const sealed = await seal(key, 'secret');

    await expect(openSealed(other.key, sealed)).rejects.toThrow();
  });
});

describe('US-86 changing the passcode', () => {
  async function lockedNotes() {
    const { lock, key } = await createLock('hunter22');
    const notes = [
      { id: 'bank', sealed: await seal(key, 'Bank details\nPIN 4412') },
      { id: 'wifi', sealed: await seal(key, 'Wifi\nletmein') },
    ];
    return { lock, notes };
  }

  test('AC-86.3 the new passcode opens every note, with its text unchanged', async () => {
    const { lock, notes } = await lockedNotes();

    const result = await changePasscode(lock, notes, 'hunter22', 'sesame99');
    if (!result.ok) throw new Error(result.error);

    const key = await unlock(result.lock, 'sesame99');
    expect(
      await Promise.all(result.notes.map((n) => openSealed(key!, n.sealed))),
    ).toEqual(['Bank details\nPIN 4412', 'Wifi\nletmein']);
    expect(result.notes.map((n) => [n.id, n.was])).toEqual(
      notes.map((n) => [n.id, n.sealed]),
    );
  });

  test('AC-86.3 the old passcode opens nothing afterwards', async () => {
    const { lock, notes } = await lockedNotes();

    const result = await changePasscode(lock, notes, 'hunter22', 'sesame99');
    if (!result.ok) throw new Error(result.error);

    expect(await unlock(result.lock, 'hunter22')).toBeNull();
  });

  test('AC-86.2 a wrong current passcode changes nothing', async () => {
    const { lock, notes } = await lockedNotes();

    const result = await changePasscode(lock, notes, 'hunter23', 'sesame99');

    expect(result).toEqual({ ok: false, error: 'That passcode is not right.' });
  });

  test('AC-86.4 a note the current passcode cannot open stops the change', async () => {
    const { lock, notes } = await lockedNotes();
    const stranger = await createLock('hunter22');
    const foreign = { id: 'merged', sealed: await seal(stranger.key, 'x') };

    const result = await changePasscode(
      lock,
      [...notes, foreign],
      'hunter22',
      'sesame99',
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/nothing was changed/);
  });
});

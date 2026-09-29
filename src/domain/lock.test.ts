import { createLock, openSealed, seal, unlock } from './lock';

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

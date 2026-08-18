import { describe, expect, it } from 'vitest';

import { InMemoryObjectStorage } from './in-memory-storage';

describe('InMemoryObjectStorage', () => {
  it('stores and retrieves an object', async () => {
    const storage = new InMemoryObjectStorage();

    await storage.put('assets/a.png', Buffer.from('png-bytes'), 'image/png');
    const body = await storage.get('assets/a.png');

    expect(body?.toString()).toBe('png-bytes');
  });

  it('returns null for a missing key', async () => {
    const storage = new InMemoryObjectStorage();

    expect(await storage.get('assets/missing.png')).toBeNull();
  });

  it('deletes an object', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.put('assets/a.png', Buffer.from('x'), 'image/png');

    await storage.delete('assets/a.png');

    expect(await storage.get('assets/a.png')).toBeNull();
  });

  it('copies an object', async () => {
    const storage = new InMemoryObjectStorage();
    await storage.put('assets/a.png', Buffer.from('px'), 'image/png');

    await storage.copy('assets/a.png', 'assets/b.png');

    expect((await storage.get('assets/b.png'))?.toString()).toBe('px');
  });

  it('throws when copying an absent source', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(storage.copy('assets/missing.png', 'assets/b.png')).rejects.toThrow(/not found/);
  });

  it('reports healthy (readiness probe resolves)', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(storage.checkHealth()).resolves.toBeUndefined();
  });
});

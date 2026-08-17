import { describe, expect, it } from 'vitest';

import { BcryptPasswordHasher } from './bcrypt-password-hasher';

describe('BcryptPasswordHasher (D19)', () => {
  it('hashes without storing the plaintext and verifies correctly', async () => {
    const hasher = new BcryptPasswordHasher();

    const hash = await hasher.hash('s3cret');

    expect(hash).not.toContain('s3cret');
    expect(await hasher.verify('s3cret', hash)).toBe(true);
    expect(await hasher.verify('wrong', hash)).toBe(false);
  });

  it('treats a malformed stored hash as a mismatch, not an error', async () => {
    const hasher = new BcryptPasswordHasher();

    // Never distinguishes whether an account exists or a hash is well-formed
    // (REQ-SEC-001: a failed login must not disclose the address).
    expect(await hasher.verify('anything', 'not-a-bcrypt-hash')).toBe(false);
  });

  it('produces a distinct salt per hash', async () => {
    const hasher = new BcryptPasswordHasher();

    const a = await hasher.hash('same');
    const b = await hasher.hash('same');

    expect(a).not.toBe(b);
    expect(await hasher.verify('same', a)).toBe(true);
    expect(await hasher.verify('same', b)).toBe(true);
  });
});

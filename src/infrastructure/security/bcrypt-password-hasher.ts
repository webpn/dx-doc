import type { PasswordHasher } from '@project/application/ports/password-hasher';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Password hashing with bcrypt (D19) — an adaptive work factor.
 *
 * Synchronous under an async interface: returns resolved/rejected promises.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  hash(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    // A malformed stored hash must read as a mismatch, never as a failure that
    // distinguishes accounts (REQ-SEC-001: no disclosure of whether an address exists).
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch {
      return false;
    }
  }
}

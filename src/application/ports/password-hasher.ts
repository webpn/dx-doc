/**
 * Password handling port (REQ-SEC-001, D19).
 *
 * Passwords are stored with a modern adaptive hash with no reversible form.
 * The `verify` contract never reveals whether an account exists or a hash is
 * well-formed: a malformed stored hash is treated as a mismatch, and callers
 * must not branch on the hashing implementation.
 */
export interface PasswordHasher {
  /** Hash a plaintext password for storage. */
  hash(plaintext: string): Promise<string>;
  /** Check a plaintext password against a stored hash (false on any mismatch). */
  verify(plaintext: string, hash: string): Promise<boolean>;
}

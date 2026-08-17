/**
 * Password-reset token persistence (REQ-SEC-013).
 *
 * Tokens are single-use and expiring; only the SHA-256 hash is stored. The
 * same hashing scheme as session tokens is used (see auth/tokens).
 */
export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  /** Set once when the token is consumed; single-use by construction. */
  usedAt: string | null;
  createdAt: string;
}

export interface PasswordResetTokenRepository {
  save(token: PasswordResetToken): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  markUsed(id: string, usedAtIso: string): Promise<void>;
}

import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '@project/application/ports/reset-token-repository';

import type { SqliteDb } from './sqlite';

/**
 * SQLite `PasswordResetTokenRepository`. Synchronous under an async interface.
 */
export class SqlitePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: SqliteDb) {}

  save(token: PasswordResetToken): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
         VALUES (@id, @userId, @tokenHash, @expiresAt, @usedAt, @createdAt)`,
      )
      .run({
        id: token.id,
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
        createdAt: token.createdAt,
      });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = this.db
      .prepare(
        `SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt,
                used_at AS usedAt, created_at AS createdAt
         FROM password_reset_tokens WHERE token_hash = ?`,
      )
      .get(tokenHash) as PasswordResetToken | undefined;
    return Promise.resolve(row ?? null);
  }

  markUsed(id: string, usedAtIso: string): Promise<void> {
    this.db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(usedAtIso, id);
    return Promise.resolve();
  }
}

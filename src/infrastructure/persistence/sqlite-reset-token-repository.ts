import type {
  PasswordResetToken,
  PasswordResetTokenRepository,
} from '@project/application/ports/reset-token-repository';
import { Kysely, SqliteDialect } from 'kysely';

import type { Database } from './db-schema';
import type { SqliteDb } from './sqlite';
import type { Db } from './sqlite-kysely';

/**
 * SQLite `PasswordResetTokenRepository` backed by Kysely (ADR-0024).
 */
export class SqlitePasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly db: Db;

  constructor(db: Db | SqliteDb) {
    if ('prepare' in db) {
      this.db = new Kysely<Database>({
        dialect: new SqliteDialect({ database: db }),
      });
    } else {
      this.db = db;
    }
  }

  async save(token: PasswordResetToken): Promise<void> {
    await this.db
      .insertInto('password_reset_tokens')
      .values({
        id: token.id,
        user_id: token.userId,
        token_hash: token.tokenHash,
        expires_at: token.expiresAt,
        used_at: token.usedAt,
        created_at: token.createdAt,
      })
      .execute();
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.db
      .selectFrom('password_reset_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      createdAt: row.created_at,
    };
  }

  async markUsed(id: string, usedAtIso: string): Promise<void> {
    await this.db
      .updateTable('password_reset_tokens')
      .set({ used_at: usedAtIso })
      .where('id', '=', id)
      .execute();
  }
}

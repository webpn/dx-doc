import type {
  SessionRecord,
  SessionRepository,
} from '@project/application/ports/session-repository';

import type { SqliteDb } from './sqlite';

/**
 * SQLite `SessionRepository`. Synchronous under an async interface: prepared
 * statements return resolved/rejected promises.
 */
export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: SqliteDb) {}

  save(session: SessionRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (@id, @userId, @tokenHash, @expiresAt, @createdAt)`,
      )
      .run({
        id: session.id,
        userId: session.userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const row = this.db
      .prepare(
        `SELECT id, user_id AS userId, token_hash AS tokenHash, expires_at AS expiresAt, created_at AS createdAt
         FROM sessions WHERE token_hash = ?`,
      )
      .get(tokenHash) as SessionRecord | undefined;
    return Promise.resolve(row ?? null);
  }

  deleteByTokenHash(tokenHash: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return Promise.resolve();
  }

  deleteAllForUser(userId: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    return Promise.resolve();
  }

  deleteExpired(nowIso: string): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso);
    return Promise.resolve();
  }
}

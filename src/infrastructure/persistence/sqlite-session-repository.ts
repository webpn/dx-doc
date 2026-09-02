import type {
  SessionRecord,
  SessionRepository,
} from '@project/application/ports/session-repository';

import type { Db } from './sqlite-kysely';

/**
 * SQLite `SessionRepository` backed by Kysely (ADR-0024).
 */
export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: Db) {}

  async save(session: SessionRecord): Promise<void> {
    await this.db
      .insertInto('sessions')
      .values({
        id: session.id,
        user_id: session.userId,
        token_hash: session.tokenHash,
        expires_at: session.expiresAt,
        created_at: session.createdAt,
        actor_kind: session.actorKind ?? 'session',
        project_id: session.projectId ?? null,
      })
      .execute();
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    const row = await this.db
      .selectFrom('sessions')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      actorKind: row.actor_kind,
      projectId: row.project_id ?? null,
    };
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('token_hash', '=', tokenHash).execute();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('user_id', '=', userId).execute();
  }

  async deleteExpired(nowIso: string): Promise<void> {
    await this.db.deleteFrom('sessions').where('expires_at', '<=', nowIso).execute();
  }
}

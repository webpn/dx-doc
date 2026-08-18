import type {
  ApiServiceToken,
  NewServiceToken,
  ServiceTokenRepository,
} from '@project/application/ports/service-token-repository';

import type { Db } from './sqlite-kysely';

function toEntity(row: {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}): ApiServiceToken {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * SQLite `ServiceTokenRepository` backed by Kysely (ADR-0024).
 */
export class SqliteServiceTokenRepository implements ServiceTokenRepository {
  constructor(private readonly db: Db) {}

  async create(token: NewServiceToken): Promise<void> {
    await this.db
      .insertInto('api_service_tokens')
      .values({
        id: token.id,
        user_id: token.userId,
        name: token.name,
        token_hash: token.tokenHash,
        created_at: token.createdAt,
        expires_at: token.expiresAt,
        revoked_at: null,
      })
      .execute();
  }

  async findByTokenHash(tokenHash: string): Promise<ApiServiceToken | null> {
    const row = await this.db
      .selectFrom('api_service_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst();
    return row ? toEntity(row) : null;
  }

  async listForUser(userId: string): Promise<ApiServiceToken[]> {
    const rows = await this.db
      .selectFrom('api_service_tokens')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map(toEntity);
  }

  async revoke(id: string, revokedAtIso: string): Promise<void> {
    await this.db
      .updateTable('api_service_tokens')
      .set({ revoked_at: revokedAtIso })
      .where('id', '=', id)
      .execute();
  }
}

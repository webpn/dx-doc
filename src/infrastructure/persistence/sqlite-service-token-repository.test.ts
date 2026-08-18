import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { SqliteServiceTokenRepository } from './sqlite-service-token-repository';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

function t(): string {
  return new Date().toISOString();
}

describe('SqliteServiceTokenRepository (against the real schema)', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteServiceTokenRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-token-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    repo = new SqliteServiceTokenRepository(connection.kysely);
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u1',
        company_id: null,
        email: 'owner@dxdoc.test',
        password_hash: null,
        created_at: t(),
        updated_at: t(),
      })
      .execute();
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('stores a hashed token and finds it by hash', async () => {
    await repo.create({
      id: 'tok1',
      userId: 'u1',
      name: 'import',
      tokenHash: 'a'.repeat(64),
      createdAt: t(),
      expiresAt: t(),
    });

    const found = await repo.findByTokenHash('a'.repeat(64));
    expect(found?.userId).toBe('u1');
    expect(found?.name).toBe('import');
    expect(found?.revokedAt).toBeNull();
    expect(await repo.findByTokenHash('b'.repeat(64))).toBeNull();
  });

  it('lists a user tokens newest-first and revokes one', async () => {
    await repo.create({
      id: 'tok1',
      userId: 'u1',
      name: 'old',
      tokenHash: 'a'.repeat(64),
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: t(),
    });
    await repo.create({
      id: 'tok2',
      userId: 'u1',
      name: 'new',
      tokenHash: 'b'.repeat(64),
      createdAt: '2026-01-02T00:00:00.000Z',
      expiresAt: t(),
    });

    const list = await repo.listForUser('u1');
    expect(list.map((token) => token.id)).toEqual(['tok2', 'tok1']);

    await repo.revoke('tok1', t());
    const after = await repo.listForUser('u1');
    expect(after.find((token) => token.id === 'tok1')?.revokedAt).not.toBeNull();
    expect(after.find((token) => token.id === 'tok2')?.revokedAt).toBeNull();
  });
});

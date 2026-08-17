import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
import { SqlitePasswordResetTokenRepository } from './sqlite-reset-token-repository';

describe('SqlitePasswordResetTokenRepository', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqlitePasswordResetTokenRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-reset-token-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    // User required for foreign key
    await connection.kysely
      .insertInto('company')
      .values({
        id: 'c1',
        name: 'Acme',
        slug: 'acme',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u1',
        company_id: 'c1',
        email: 'u@acme.test',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();
    repo = new SqlitePasswordResetTokenRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('saves and finds a reset token by token hash', async () => {
    const token = {
      id: 't1',
      userId: 'u1',
      tokenHash: 'token-hash-1',
      expiresAt: '2026-02-01T00:00:00.000Z',
      usedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    await repo.save(token);

    const found = await repo.findByTokenHash('token-hash-1');
    expect(found).not.toBeNull();
    expect(found?.userId).toBe('u1');
    expect(found?.usedAt).toBeNull();
  });

  it('marks a reset token as used', async () => {
    await repo.save({
      id: 't2',
      userId: 'u1',
      tokenHash: 'token-hash-2',
      expiresAt: '2026-02-01T00:00:00.000Z',
      usedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await repo.markUsed('t2', '2026-01-02T00:00:00.000Z');

    const found = await repo.findByTokenHash('token-hash-2');
    expect(found?.usedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});

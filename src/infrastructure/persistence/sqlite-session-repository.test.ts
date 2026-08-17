import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
import { SqliteSessionRepository } from './sqlite-session-repository';

describe('SqliteSessionRepository', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteSessionRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-session-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    // A user so sessions have a valid foreign key.
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
        email: 'a@acme.test',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();
    repo = new SqliteSessionRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('saves and finds a session by token hash', async () => {
    const session = {
      id: 's1',
      userId: 'u1',
      tokenHash: 'hash-abc',
      expiresAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    await repo.save(session);

    const found = await repo.findByTokenHash('hash-abc');
    expect(found).not.toBeNull();
    expect(found?.userId).toBe('u1');
  });

  it('deletes by token hash', async () => {
    await repo.save({
      id: 's1',
      userId: 'u1',
      tokenHash: 'hash-abc',
      expiresAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await repo.deleteByTokenHash('hash-abc');

    expect(await repo.findByTokenHash('hash-abc')).toBeNull();
  });

  it('deletes only expired sessions', async () => {
    await repo.save({
      id: 's1',
      userId: 'u1',
      tokenHash: 'old',
      expiresAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await repo.save({
      id: 's2',
      userId: 'u1',
      tokenHash: 'fresh',
      expiresAt: '2026-03-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await repo.deleteExpired('2026-02-01T00:00:00.000Z');

    expect(await repo.findByTokenHash('old')).toBeNull();
    expect(await repo.findByTokenHash('fresh')).not.toBeNull();
  });
});

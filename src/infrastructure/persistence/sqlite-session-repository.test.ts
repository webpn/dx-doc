import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { openSqliteConnection, type SqliteDb } from './sqlite';
import { SqliteSessionRepository } from './sqlite-session-repository';

describe('SqliteSessionRepository', () => {
  let dir: string;
  let db: SqliteDb;
  let repo: SqliteSessionRepository;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-session-repo-'));
    db = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(db);
    // A user so sessions have a valid foreign key.
    db.prepare(
      'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('c1', 'Acme', 'acme', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    db.prepare(
      'INSERT INTO users (id, company_id, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('u1', 'c1', 'a@acme.test', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
    repo = new SqliteSessionRepository(db);
  });

  afterEach(() => {
    db.close();
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

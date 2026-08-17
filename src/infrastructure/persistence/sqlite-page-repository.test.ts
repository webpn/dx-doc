import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PageRecord } from '@project/application/ports/page-repository';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { openSqliteConnection, type SqliteDb } from './sqlite';
import { SqlitePageRepository } from './sqlite-page-repository';

function t(): string {
  return new Date().toISOString();
}

function page(overrides: Partial<PageRecord>): PageRecord {
  return {
    id: 'pg1',
    projectId: 'proj-1',
    parentId: null,
    name: 'Home',
    slug: 'home',
    customId: null,
    createdAt: t(),
    updatedAt: t(),
    ...overrides,
  };
}

describe('SqlitePageRepository (against the real schema)', () => {
  let dir: string;
  let db: SqliteDb;
  let repo: SqlitePageRepository;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-page-repo-'));
    db = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(db);
    db.prepare(
      'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run('c1', 'Acme', 'acme', t(), t());
    db.prepare(
      'INSERT INTO projects (id, company_id, name, slug, platform, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('proj-1', 'c1', 'Web', 'web', 'web', t(), t());
    repo = new SqlitePageRepository(db);
  });

  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads a page back', async () => {
    await repo.createPage(page({}));

    const stored = await repo.getPageById('pg1');
    expect(stored?.name).toBe('Home');
    expect(stored?.slug).toBe('home');
    expect(stored?.parentId).toBeNull();
  });

  it('finds by project + slug', async () => {
    await repo.createPage(page({}));

    expect((await repo.getPageByProjectAndSlug('proj-1', 'home'))?.id).toBe('pg1');
    expect(await repo.getPageByProjectAndSlug('proj-1', 'nope')).toBeNull();
  });

  it('finds by custom_id scoped to the project', async () => {
    await repo.createPage(page({ customId: 'legacy:home' }));

    expect((await repo.getPageByCustomId('proj-1', 'legacy:home'))?.id).toBe('pg1');
    expect(await repo.getPageByCustomId('other-project', 'legacy:home')).toBeNull();
  });

  it('updates a page and its parent', async () => {
    await repo.createPage(page({}));
    await repo.createPage(page({ id: 'pg2', name: 'Child', slug: 'child' }));

    const stored = await repo.getPageById('pg1');
    if (stored === null) {
      throw new Error('expected page to exist');
    }
    stored.parentId = 'pg2';
    stored.name = 'Homepage';
    await repo.updatePage(stored);

    const reloaded = await repo.getPageById('pg1');
    expect(reloaded?.name).toBe('Homepage');
    expect(reloaded?.parentId).toBe('pg2');
  });
});

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PageRecord } from '@project/application/ports/page-repository';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
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
  let connection: Connection;
  let repo: SqlitePageRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-page-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(connection);
    await connection.kysely
      .insertInto('company')
      .values({
        id: 'c1',
        name: 'Acme',
        slug: 'acme',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    await connection.kysely
      .insertInto('projects')
      .values({
        id: 'proj-1',
        company_id: 'c1',
        name: 'Web',
        slug: 'web',
        platform: 'web',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    repo = new SqlitePageRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
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

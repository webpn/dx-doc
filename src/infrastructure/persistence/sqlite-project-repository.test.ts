import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ProjectRecord } from '@project/application/ports/project-repository';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';
import { SqliteProjectRepository } from './sqlite-project-repository';

function t(): string {
  return new Date().toISOString();
}

function project(overrides: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: 'p1',
    companyId: 'c1',
    name: 'Web',
    slug: 'web',
    platform: 'web',
    description: null,
    icon: null,
    tagManager: null,
    lifecycleState: 'active',
    integrationSettings: null,
    customId: null,
    createdAt: t(),
    updatedAt: t(),
    ...overrides,
  };
}

describe('SqliteProjectRepository (against the real schema)', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteProjectRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-project-repo-'));
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
    repo = new SqliteProjectRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads a project back', async () => {
    await repo.createProject(project({}));

    const stored = await repo.getProjectById('p1');
    expect(stored?.name).toBe('Web');
    expect(stored?.platform).toBe('web');
    expect(stored?.lifecycleState).toBe('active');
    expect(stored?.customId).toBeNull();
  });

  it('finds by company + slug', async () => {
    await repo.createProject(project({}));

    expect((await repo.getProjectByCompanyAndSlug('c1', 'web'))?.id).toBe('p1');
    expect(await repo.getProjectByCompanyAndSlug('c1', 'nope')).toBeNull();
  });

  it('finds by custom_id scoped to the company', async () => {
    await repo.createProject(project({ customId: 'legacy:web' }));

    expect((await repo.getProjectByCustomId('c1', 'legacy:web'))?.id).toBe('p1');
    expect(await repo.getProjectByCustomId('other-company', 'legacy:web')).toBeNull();
  });

  it('updates a project', async () => {
    await repo.createProject(project({}));

    const stored = await repo.getProjectById('p1');
    if (stored === null) {
      throw new Error('expected project to exist');
    }
    stored.name = 'Renamed';
    stored.customId = 'legacy:web';
    await repo.updateProject(stored);

    const reloaded = await repo.getProjectById('p1');
    expect(reloaded?.name).toBe('Renamed');
    expect(reloaded?.customId).toBe('legacy:web');
  });
});

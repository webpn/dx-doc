import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { SqliteCompanyRepository } from './sqlite-company-repository';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

describe('SqliteCompanyRepository', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteCompanyRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-company-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    repo = new SqliteCompanyRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and retrieves a company by id', async () => {
    const company = {
      id: 'c-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await repo.createCompany(company);

    const found = await repo.getCompanyById('c-1');
    expect(found).toEqual(company);
  });

  it('returns null when company is not found', async () => {
    const found = await repo.getCompanyById('non-existent');
    expect(found).toBeNull();
  });

  it('updates a company’s name, slug and updatedAt', async () => {
    const company = {
      id: 'c-2',
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await repo.createCompany(company);

    await repo.updateCompany({
      ...company,
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const found = await repo.getCompanyById('c-2');
    expect(found).toEqual({
      id: 'c-2',
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('applies the write and reports true when expectedUpdatedAt matches', async () => {
    const company = {
      id: 'c-3',
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await repo.createCompany(company);

    const applied = await repo.updateCompany(
      { ...company, name: 'Acme Corporation', updatedAt: '2026-01-02T00:00:00.000Z' },
      '2026-01-01T00:00:00.000Z',
    );

    expect(applied).toBe(true);
    const found = await repo.getCompanyById('c-3');
    expect(found?.name).toBe('Acme Corporation');
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('atomically rejects a stale write and leaves the row untouched', async () => {
    const company = {
      id: 'c-4',
      name: 'Acme Corp',
      slug: 'acme-corp',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await repo.createCompany(company);

    // A concurrent writer already updated the row.
    await repo.updateCompany({
      ...company,
      name: 'Concurrent Edit',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    // The stale caller's write, guarded by the updatedAt it originally read,
    // must be rejected atomically rather than clobbering the concurrent edit.
    const applied = await repo.updateCompany(
      { ...company, name: 'Stale Edit', updatedAt: '2026-01-03T00:00:00.000Z' },
      '2026-01-01T00:00:00.000Z',
    );

    expect(applied).toBe(false);
    const found = await repo.getCompanyById('c-4');
    expect(found?.name).toBe('Concurrent Edit');
    expect(found?.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});

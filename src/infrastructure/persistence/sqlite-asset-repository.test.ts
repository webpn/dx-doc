import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AssetRecord } from '@project/application/ports/asset-repository';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { SqliteAssetRepository } from './sqlite-asset-repository';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

function t(): string {
  return new Date().toISOString();
}

const FIXED_TIME = t();

function asset(overrides: Partial<AssetRecord>): AssetRecord {
  return {
    id: 'asset-1',
    companyId: 'c1',
    projectId: 'proj-1',
    customId: null,
    storageKey: 'assets/c1/proj-1/asset-1.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    width: 400,
    height: 300,
    originalFilename: 'screenshot.png',
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    ...overrides,
  };
}

describe('SqliteAssetRepository (ADR-0026)', () => {
  let dir: string;
  let connection: Connection;
  let repo: SqliteAssetRepository;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-asset-repo-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);
    await connection.kysely
      .insertInto('company')
      .values({ id: 'c1', name: 'Acme', slug: 'acme', created_at: t(), updated_at: t() })
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
    repo = new SqliteAssetRepository(connection.kysely);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads an asset back', async () => {
    await repo.createAsset(asset({}));

    const stored = await repo.getAssetById('asset-1');
    expect(stored).toEqual(asset({}));
  });

  it('finds by project + custom_id', async () => {
    await repo.createAsset(asset({ customId: 'legacy:hero.png' }));

    expect((await repo.getAssetByCustomId('proj-1', 'legacy:hero.png'))?.id).toBe('asset-1');
    expect(await repo.getAssetByCustomId('other-project', 'legacy:hero.png')).toBeNull();
    expect(await repo.getAssetByCustomId('proj-1', 'nope')).toBeNull();
  });

  it('lists assets scoped to a project', async () => {
    await repo.createAsset(asset({ id: 'asset-1' }));
    await repo.createAsset(asset({ id: 'asset-2', storageKey: 'assets/c1/proj-1/asset-2.png' }));

    const list = await repo.listAssetsForProject('proj-1');
    expect(list.map((a) => a.id).sort()).toEqual(['asset-1', 'asset-2']);
  });

  it('deletes an asset', async () => {
    await repo.createAsset(asset({}));

    await repo.deleteAsset('asset-1');

    expect(await repo.getAssetById('asset-1')).toBeNull();
  });
});

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { appliedMigrations, definedMigrations, pendingMigrations } from './migrations';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

const MIGRATION_NAMES = [
  '001_create_schema',
  '002_auth_sessions',
  '003_password_reset',
  '004_nullable_company',
  '005_password_must_change',
  '006_tracking_data_model',
  '007_flows_and_navigation',
  '008_versions_and_publication',
  '009_access_and_audit',
  '010_service_tokens_and_audit_kind',
  '011_assets',
  '012_audit_company_nullable',
  '013_query_path_indexes',
  '014_audit_logs_append_only',
  '015_instance_admin_stepups',
  '016_page_description',
  '017_free_page_hierarchy',
  '018_company_deletion_audit_exception',
  '019_reader_sessions',
];

describe('migration introspection (REQ-FDN-024 readiness)', () => {
  let dir: string;
  let connection: Connection;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-mig-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('defines exactly the on-disk migration set', async () => {
    await expect(definedMigrations()).resolves.toEqual(MIGRATION_NAMES);
  });

  it('reports every migration pending on an empty database', async () => {
    await expect(appliedMigrations(connection)).resolves.toEqual([]);
    await expect(pendingMigrations(connection)).resolves.toEqual(MIGRATION_NAMES);
  });

  it('reports none pending after migrations are applied', async () => {
    await applyMigrations(connection);

    await expect(appliedMigrations(connection)).resolves.toEqual(MIGRATION_NAMES);
    await expect(pendingMigrations(connection)).resolves.toEqual([]);
  });

  it('reports a partial migration set as pending', async () => {
    // Apply only the first migration directly, as `scripts/migrate.ts up`
    // would if stopped part-way.
    const first = MIGRATION_NAMES[0] ?? '001_create_schema';
    const firstModule = await import('../../../db/migrations/001_create_schema');
    await applyMigrations(connection, {
      getMigrations: () => Promise.resolve({ [first]: firstModule }),
    });

    const pending = await pendingMigrations(connection);
    expect(pending).toEqual(MIGRATION_NAMES.slice(1));
  });

  it('creates query-path indexes for foreign keys and custom_id columns (M1.14, REQ-NFR-015)', async () => {
    await applyMigrations(connection);

    // Query for index existence in sqlite_master using raw SQL
    const indexes = await sql<{ name: string }>`
      select name from sqlite_master where type = 'index' and name like 'idx_%'
    `.execute(connection.kysely);

    const indexNames = indexes.rows.map((row) => row.name);

    // Verify key foreign key indexes exist
    expect(indexNames).toContain('idx_roles_company_id');
    expect(indexNames).toContain('idx_projects_company_id');
    expect(indexNames).toContain('idx_properties_project_id');
    expect(indexNames).toContain('idx_trackings_project_id');
    expect(indexNames).toContain('idx_module_properties_property_id');
    expect(indexNames).toContain('idx_flow_nodes_flow_id');
    expect(indexNames).toContain('idx_audit_logs_project_id');

    // Verify custom_id indexes exist
    expect(indexNames).toContain('idx_pages_custom_id');
    expect(indexNames).toContain('idx_properties_custom_id');
    expect(indexNames).toContain('idx_trackings_custom_id');
    expect(indexNames).toContain('idx_flows_custom_id');

    // Verify comprehensive coverage
    expect(indexNames.length).toBeGreaterThan(40); // At least 40+ indexes created
  });
});

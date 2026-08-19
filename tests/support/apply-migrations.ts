import {
  FileMigrationProvider,
  Migrator,
  type Migration,
  type MigrationProvider,
} from 'kysely/migration';

import * as m001 from '../../db/migrations/001_create_schema';
import * as m002 from '../../db/migrations/002_auth_sessions';
import * as m003 from '../../db/migrations/003_password_reset';
import * as m004 from '../../db/migrations/004_nullable_company';
import * as m005 from '../../db/migrations/005_password_must_change';
import * as m006 from '../../db/migrations/006_tracking_data_model';
import * as m007 from '../../db/migrations/007_flows_and_navigation';
import * as m008 from '../../db/migrations/008_versions_and_publication';
import * as m009 from '../../db/migrations/009_access_and_audit';
import * as m010 from '../../db/migrations/010_service_tokens_and_audit_kind';
import * as m011 from '../../db/migrations/011_assets';
import * as m012 from '../../db/migrations/012_audit_company_nullable';
import * as m013 from '../../db/migrations/013_query_path_indexes';
import * as m014 from '../../db/migrations/014_audit_logs_append_only';
import type { Connection } from '../../src/infrastructure/persistence/sqlite-kysely';

const staticMigrations: Record<string, Migration> = {
  '001_create_schema': m001,
  '002_auth_sessions': m002,
  '003_password_reset': m003,
  '004_nullable_company': m004,
  '005_password_must_change': m005,
  '006_tracking_data_model': m006,
  '007_flows_and_navigation': m007,
  '008_versions_and_publication': m008,
  '009_access_and_audit': m009,
  '010_service_tokens_and_audit_kind': m010,
  '011_assets': m011,
  '012_audit_company_nullable': m012,
  '013_query_path_indexes': m013,
  '014_audit_logs_append_only': m014,
};

class StaticMigrationProvider implements MigrationProvider {
  getMigrations(): Promise<Record<string, Migration>> {
    return Promise.resolve(staticMigrations);
  }
}

/**
 * Apply migrations using Kysely Migrator (ADR-0024).
 */
export async function applyMigrations(
  connection: Connection,
  provider?: MigrationProvider,
): Promise<void> {
  const migrator = new Migrator({
    db: connection.kysely,
    provider: provider ?? new StaticMigrationProvider(),
  });

  const { error, results } = await migrator.migrateToLatest();

  if (error) {
    throw error instanceof Error ? error : new Error(JSON.stringify(error));
  }

  const failed = results?.filter((r) => r.status === 'Error') ?? [];
  if (failed.length > 0) {
    throw new Error(`Failed to apply migrations: ${failed.map((f) => f.migrationName).join(', ')}`);
  }
}

export { FileMigrationProvider };

/**
 * Schema-migration introspection (REQ-FDN-009, ADR-0024).
 *
 * The startup self-check (REQ-FDN-024) must refuse to boot against a database
 * whose schema is behind the migration set, and the `/api/ready` endpoint
 * re-checks it per request. Both need the set of applied vs. defined
 * migrations — this module is the single source of that comparison, shared
 * with the composition root (which must never run migrations itself: they are
 * applied by the explicit `npm run db:migrate` step, REQ-FDN-009 acceptance).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';
import { FileMigrationProvider } from 'kysely/migration';

import type { Connection } from './sqlite-kysely';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

/**
 * The default migration provider: Kysely's file provider over `db/migrations`,
 * exactly what `scripts/migrate.ts` (`npm run db:migrate`) uses.
 */
export function getMigrationProvider(): FileMigrationProvider {
  return new FileMigrationProvider({
    fs,
    path,
    migrationFolder: MIGRATIONS_DIR,
  });
}

/** The names of the migrations definitionally in the migration set. */
export async function definedMigrations(
  provider: FileMigrationProvider = getMigrationProvider(),
): Promise<string[]> {
  const migrations = await provider.getMigrations();
  return Object.keys(migrations).sort();
}

/** The names of the migrations already applied to `connection`. */
export async function appliedMigrations(connection: Connection): Promise<string[]> {
  // `kysely_migration` (singular) is Kysely's own bookkeeping table, not part
  // of the typed schema, so it is read through a raw query. It does not exist
  // yet on a freshly created database before the first migration — treat that
  // as "none applied".
  try {
    const result = await sql<{ name: string }>`select name from kysely_migration`.execute(
      connection.kysely,
    );
    return result.rows.map((row) => row.name).sort();
  } catch (error) {
    if (isMissingMigrationTable(error)) {
      return [];
    }
    throw error;
  }
}

function isMissingMigrationTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /\bkysely_migration\b/.test(error.message) &&
    /(no such table|does not exist)/i.test(error.message)
  );
}

/** Migration names defined but not yet applied — an empty array means up to date. */
export async function pendingMigrations(connection: Connection): Promise<string[]> {
  const defined = await definedMigrations();
  const applied = await appliedMigrations(connection);
  return defined.filter((name) => !applied.includes(name));
}

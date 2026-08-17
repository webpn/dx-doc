/**
 * Drift guard for the `Database` interface in `db-schema.ts`
 * (ADR-0024 §Consequences).
 *
 * This test reads the live SQLite schema and asserts that every
 * table and column named in the `Database` interface actually
 * exists. The migration files in `db/migrations/` are applied
 * to a fresh in-memory database first, so the assertion is
 * against the schema that the migrations produce, not against
 * whatever happens to be in a developer's local SQLite file.
 *
 * If this test fails after a migration adds (or renames) a
 * column without a matching `Database` interface update, the
 * build fails. The fix is in `db-schema.ts`, not in the
 * repositories: the interface is the type-level source of
 * truth; the migrations are the runtime source of truth; this
 * test is the bridge that ensures they stay in sync.
 *
 * Raw SQL access uses the `Connection#exec` escape hatch, which
 * is the multi-statement-script path on `better-sqlite3`. That
 * path is necessary because the existing migration files
 * contain multiple statements per file (`001_create_schema.sql`
 * has seven `CREATE TABLE` statements) and `better-sqlite3`'s
 * `prepare()` — which is what Kysely's `sql.raw().execute()`
 * uses under the hood — accepts only a single statement. The
 * drift-guard test, like the production migration runner in
 * commit 10, uses `exec()` for the bootstrap and the Kysely
 * query builder for the assertions.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Database, SCHEMA_DEFINITIONS } from './db-schema';
import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../db/migrations',
);

interface TableInfoRow {
  name: string;
}

interface ColumnInfoRow {
  name: string;
}

/**
 * Apply every `.sql` file in `db/migrations/` in numeric order,
 * stripped of dbmate directive lines (`-- migrate:up` /
 * `-- migrate:down`). For the drift-guard test we want the
 * live schema to be the one the SQL migrations produce, not
 * the one the Kysely migrations produce, so the test continues
 * to validate the *raw* schema source of truth.
 *
 * This is intentionally raw SQL via `Connection#exec`: it is a
 * one-shot bootstrap path, not application code, and the SQL
 * files contain multiple statements per file. It is removed in
 * the commit (10) that switches the application to Kysely's
 * `Migrator`; until then it keeps the drift guard running
 * against the existing SQL files.
 */
function applyRawSqliteMigrations(connection: Connection): void {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sqlText = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('-- migrate:'))
      .join('\n');
    connection.exec(sqlText);
  }
}

describe('Database interface drift guard (ADR-0024)', () => {
  let connection: Connection;

  beforeEach(() => {
    connection = openSqliteConnection(':memory:');
    applyRawSqliteMigrations(connection);
  });

  afterEach(async () => {
    await closeSqliteConnection(connection);
  });

  it('every table named in the Database interface exists in the schema', async () => {
    const expected = Object.keys(SCHEMA_DEFINITIONS).sort();
    const result = await sql<TableInfoRow>`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `.execute(connection.kysely);
    const actual = result.rows.map((r) => r.name).sort();
    expect(actual).toEqual(expected);
  });

  it('every column in every table named in the Database interface exists in the schema', async () => {
    const tableNames = Object.keys(SCHEMA_DEFINITIONS) as (keyof Database)[];
    const failures: string[] = [];
    for (const tableName of tableNames) {
      const expectedCols = [...SCHEMA_DEFINITIONS[tableName]].sort();
      const result = await sql<ColumnInfoRow>`PRAGMA table_info(${sql.raw(tableName)})`.execute(
        connection.kysely,
      );
      const actualCols = result.rows.map((r) => r.name).sort();
      const missing = expectedCols.filter((c) => !actualCols.includes(c));
      const extra = actualCols.filter((c) => !(expectedCols as readonly string[]).includes(c));
      if (missing.length > 0 || extra.length > 0) {
        failures.push(`${tableName}: missing=[${missing.join(', ')}] extra=[${extra.join(', ')}]`);
      }
    }
    expect(failures).toEqual([]);
  });
});

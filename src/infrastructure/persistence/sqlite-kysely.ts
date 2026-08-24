/**
 * Kysely factory for the dx-doc persistence layer (ADR-0024).
 *
 * In R1 the only adapter is SQLite. MariaDB and PostgreSQL adapters
 * arrive in R2 (ADR-0020). Each adapter will export its own
 * `openXxxConnection` function that returns a `Connection` for its
 * own driver. The repositories, which take the typed `Kysely<Database>`
 * half of the connection, will not need to change.
 *
 * The PRAGMAs ADR-0020 mandates (`journal_mode = WAL`,
 * `busy_timeout = 5000`, `foreign_keys = ON`) are applied on every
 * SQLite connection inside this factory. The PRAGMA test in
 * `sqlite.test.ts` continues to verify them.
 *
 * The `Connection` type is a small wrapper around `Kysely<Database>`
 * plus a narrow escape hatch for the one operation `better-sqlite3`
 * exposes that Kysely's typed query builder does not: multi-statement
 * script execution via `exec()`. That escape hatch is used by the
 * migration bootstrap path (commit 10's `scripts/migrate.ts`) and
 * by the drift-guard test (`db-schema.test.ts`). Application code
 * — repositories, application services, route handlers — must not
 * use it; they take the `kysely` half and use the typed query
 * builder. The escape hatch is intentionally `exec()`-shaped
 * (multi-statement script), not `prepare()`-shaped (single
 * statement), so it cannot be used to read or write data a row at
 * a time outside the typed query builder.
 */
import SqliteDatabase from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

import type { Database } from './db-schema';

/** A live `Kysely<Database>` instance. Application code takes this. */
export type Db = Kysely<Database>;

/**
 * A dx-doc persistence connection.
 *
 * - `kysely` — the typed query builder. Repositories, application
 *   services, route handlers, and the migration runner's normal
 *   path all use this.
 * - `exec` — the multi-statement script execution escape hatch.
 *   Used only by the migration bootstrap (raw SQL or the Kysely
 *   schema API at the boundaries) and the drift-guard test. Not
 *   for application reads/writes.
 *
 * The wrapper exists because `better-sqlite3` exposes
 * `Database#exec(sql: string)` for multi-statement scripts, and
 * Kysely's `sql.raw(...).execute()` only supports single-statement
 * strings (it goes through `prepare()`). The migration files have
 * multiple statements; this is the only way to run them as a
 * script without reaching into private Kysely state.
 */
export interface Connection {
  readonly kysely: Db;
  readonly exec: (sqlText: string) => void;
  /**
   * Close the underlying `better-sqlite3` handle directly. Prefer
   * `closeSqliteConnection`, which also destroys the Kysely wrapper; this is
   * the low-level half it calls. Idempotent.
   */
  readonly close: () => void;
}

/**
 * Open a SQLite-backed Kysely connection with dx-doc's operational
 * settings applied (ADR-0020):
 *   - `PRAGMA foreign_keys = ON` — SQLite disables foreign keys by
 *     default; a schema whose referential integrity silently does
 *     not apply is worse than none at all. Set explicitly and
 *     tested, not assumed.
 *   - WAL journal mode, so readers do not block the writer.
 *   - A busy timeout, so concurrent writes queue rather than fail.
 */
export function openSqliteConnection(filePath: string): Connection {
  const inner = new SqliteDatabase(filePath);
  inner.pragma('journal_mode = WAL');
  inner.pragma('busy_timeout = 5000');
  inner.pragma('foreign_keys = ON');
  const kysely = new Kysely<Database>({
    dialect: new SqliteDialect({ database: inner }),
  });
  return {
    kysely,
    exec: (sqlText: string): void => {
      inner.exec(sqlText);
    },
    close: (): void => {
      if (inner.open) {
        inner.close();
      }
    },
  };
}

/**
 * Close a connection. The application process owns the connection's
 * lifetime in production; this is for the test setup path which
 * opens and closes per-test connections in `beforeEach` /
 * `afterEach`.
 *
 * Both halves must be closed. `Kysely#destroy()` alone is not enough: the
 * SqliteDialect creates its `better-sqlite3` handle lazily on first query, so
 * a connection used only through the `exec()` escape hatch has an open handle
 * that Kysely's driver never learned about and therefore never closes. On
 * Windows the leaked handle makes the database file undeletable (EBUSY), which
 * surfaced as unrelated-looking test-teardown failures.
 *
 * `close()` is synchronous because `better-sqlite3`'s is; awaiting this
 * function guarantees the file is released before a caller deletes it.
 */
export async function closeSqliteConnection(connection: Connection): Promise<void> {
  await connection.kysely.destroy();
  connection.close();
}

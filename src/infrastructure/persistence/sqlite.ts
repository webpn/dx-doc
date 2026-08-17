import Database from 'better-sqlite3';

/** A live better-sqlite3 connection configured for dx-doc (ADR-0020). */
export type SqliteDb = Database.Database;

/**
 * Open a SQLite connection with dx-doc's operational settings applied on every
 * connection (ADR-0020, REQ-FDN-005). These belong in the adapter, not in
 * deployment documentation:
 *   - `PRAGMA foreign_keys = ON` — SQLite disables foreign keys by default; a
 *     schema whose referential integrity silently does not apply is worse than
 *     none at all. Set explicitly and tested, not assumed.
 *   - WAL journal mode, so readers do not block the writer.
 *   - A busy timeout, so concurrent writes queue rather than fail.
 */
export function openSqliteConnection(filePath: string): SqliteDb {
  const db = new Database(filePath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  return db;
}

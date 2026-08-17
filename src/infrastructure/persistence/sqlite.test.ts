import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { sql } from 'kysely';
import { afterEach, describe, expect, it } from 'vitest';

import { closeSqliteConnection, openSqliteConnection, type Connection } from './sqlite-kysely';

describe('SQLite adapter', () => {
  let dir: string;
  let connection: Connection | null = null;

  afterEach(async () => {
    if (connection) {
      await closeSqliteConnection(connection);
      connection = null;
    }
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function openTempConnection(): Connection {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-sqlite-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    return connection;
  }

  it('sets the operational PRAGMAs on every connection', async () => {
    const conn = openTempConnection();

    // foreign_keys is OFF by default in SQLite; the adapter must turn it on.
    const fk = await sql<{ foreign_keys: number }>`PRAGMA foreign_keys`.execute(conn.kysely);
    // WAL so readers never block the writer.
    const jm = await sql<{ journal_mode: string }>`PRAGMA journal_mode`.execute(conn.kysely);
    // A busy timeout so concurrent writes queue rather than fail.
    const bt = await sql<{ timeout: number }>`PRAGMA busy_timeout`.execute(conn.kysely);

    expect(fk.rows[0]?.foreign_keys).toBe(1);
    expect(jm.rows[0]?.journal_mode).toBe('wal');
    expect(bt.rows[0]?.timeout).toBe(5000);
  });

  it('actually enforces foreign keys, not merely reports the pragma', () => {
    const conn = openTempConnection();

    conn.exec(`
      CREATE TABLE parent (id TEXT PRIMARY KEY);
      CREATE TABLE child (parent_id TEXT NOT NULL REFERENCES parent (id));
    `);

    // A row referencing a missing parent must be rejected.
    expect(() => {
      conn.exec("INSERT INTO child (parent_id) VALUES ('missing')");
    }).toThrow(/FOREIGN KEY constraint failed/);
  });
});

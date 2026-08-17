import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { openSqliteConnection, type SqliteDb } from './sqlite';

describe('SQLite adapter', () => {
  let dir: string;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function openTempConnection(): SqliteDb {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-sqlite-'));
    return openSqliteConnection(path.join(dir, 'test.sqlite'));
  }

  it('sets the operational PRAGMAs on every connection', () => {
    const db = openTempConnection();

    // foreign_keys is OFF by default in SQLite; the adapter must turn it on.
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    // WAL so readers never block the writer.
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    // A busy timeout so concurrent writes queue rather than fail.
    expect(db.pragma('busy_timeout', { simple: true })).toBe(5000);

    db.close();
  });

  it('actually enforces foreign keys, not merely reports the pragma', () => {
    const db = openTempConnection();

    db.exec(`
      CREATE TABLE parent (id TEXT PRIMARY KEY);
      CREATE TABLE child (parent_id TEXT NOT NULL REFERENCES parent (id));
    `);

    // A row referencing a missing parent must be rejected.
    expect(() => db.prepare('INSERT INTO child (parent_id) VALUES (?)').run('missing')).toThrow(
      /FOREIGN KEY constraint failed/,
    );

    db.close();
  });
});

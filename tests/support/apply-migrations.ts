import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type Database from 'better-sqlite3';

/**
 * Apply the repo's real migrations to a SQLite connection, so integration
 * tests exercise the actual schema rather than a hand-rolled copy.
 * dbmate directive lines (`-- migrate:up`/`-- migrate:down`) are stripped;
 * dbmate itself is not required in-process.
 */
export function applyMigrations(db: Database.Database, migrationsDir = defaultMigrationsDir): void {
  const sorted = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of sorted) {
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('-- migrate:'))
      .join('\n');
    db.exec(sql);
  }
}

const defaultMigrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/migrations',
);

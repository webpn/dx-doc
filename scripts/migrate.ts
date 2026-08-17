#!/usr/bin/env node
/**
 * Migration runner — executes Kysely migrations using the dx-doc DB_* config (ADR-0024).
 *
 * Usage:
 *   npm run db:migrate
 *   tsx scripts/migrate.ts [up]
 */
import { mkdirSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FileMigrationProvider, Migrator } from 'kysely/migration';

import {
  closeSqliteConnection,
  openSqliteConnection,
} from '../src/infrastructure/persistence/sqlite-kysely';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveDbFilePath(): string {
  const driver = process.env.DB_DRIVER ?? 'sqlite';
  if (driver === 'sqlite') {
    const dbFile = process.env.DB_FILE ?? './var/db/dxdoc.sqlite';
    const resolvedPath = path.resolve(root, dbFile);
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    return resolvedPath;
  }

  if (driver === 'mariadb' || driver === 'postgres') {
    throw new Error(
      `DB_DRIVER=${driver} is not available yet — only 'sqlite' exists through R1 ` +
        '(MariaDB and PostgreSQL arrive in R2, ADR-0020).',
    );
  }

  throw new Error(`Unknown DB_DRIVER=${driver}`);
}

async function migrate(): Promise<void> {
  const dbPath = resolveDbFilePath();
  const connection = openSqliteConnection(dbPath);

  const migrator = new Migrator({
    db: connection.kysely,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(root, 'db/migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      process.stdout.write(`migration "${it.migrationName}" was executed successfully\n`);
    } else if (it.status === 'Error') {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error('failed to migrate');
    console.error(error);
    await closeSqliteConnection(connection);
    process.exit(1);
  }

  await closeSqliteConnection(connection);
}

void migrate();

#!/usr/bin/env node
/**
 * Migration runner — maps dx-doc's DB_* environment contract onto dbmate.
 *
 * The README configuration surface is DB_DRIVER / DB_FILE (see .env.example
 * and REQ-FDN-013). dbmate speaks DATABASE_URL. This script translates so the
 * configured contract stays the source of truth and `npm run db:migrate` works
 * in CI and on a clean machine without a hand-edited .env (REQ-FDN-011).
 *
 * Usage: node scripts/migrate.mjs [dbmate-args...]   (e.g. `up`)
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const driver = process.env.DB_DRIVER ?? 'sqlite';
  if (driver === 'sqlite') {
    const dbFile = process.env.DB_FILE ?? './var/db/dxdoc.sqlite';
    mkdirSync(path.resolve(root, path.dirname(dbFile)), { recursive: true });
    return `sqlite:${dbFile}`;
  }

  if (driver === 'mariadb' || driver === 'postgres') {
    throw new Error(
      `DB_DRIVER=${driver} is not available yet — only 'sqlite' exists through R1 ` +
        '(MariaDB and PostgreSQL arrive in R2, ADR-0020).',
    );
  }

  throw new Error(`Unknown DB_DRIVER=${driver}`);
}

const dbmate = path.resolve(root, 'node_modules/.bin/dbmate');
const args = process.argv.slice(2);

const result = spawnSync(dbmate, args, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: resolveDatabaseUrl() },
});

process.exit(result.status ?? 1);

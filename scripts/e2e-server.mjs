#!/usr/bin/env node
// Starts a fresh instance for the Playwright acceptance suite: removes any
// leftover SQLite file from a previous run, migrates, then starts the real
// server entry point. All configuration comes from env vars set by
// playwright.config.ts's webServer block — this script adds no config of
// its own (REQ-FDN-023/024: the app boots the same way in every context).
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = process.env.DB_FILE ?? './var/e2e/dxdoc-e2e.sqlite';
const resolvedDbFile = path.resolve(root, dbFile);

if (existsSync(resolvedDbFile)) {
  rmSync(resolvedDbFile);
}

const migrate = spawnSync('npx', ['tsx', 'scripts/migrate.ts', 'up'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const server = spawnSync('npx', ['tsx', 'src/api/server.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(server.status ?? 1);

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

// SQLite in WAL mode keeps committed data in the `-wal`/`-shm` sidecars, so
// removing only the main file leaves a half-populated database behind: the next
// boot finds users already present, `bootstrapFirstAdmin` reports
// `already_initialized`, and the suite fails at the login step with "Invalid
// email or password". Remove all three.
for (const suffix of ['', '-wal', '-shm']) {
  const file = `${resolvedDbFile}${suffix}`;
  if (existsSync(file)) {
    rmSync(file);
  }
}

// `shell: true` is required on Windows: `npx` is a `.cmd` shim there, and
// `spawnSync` without a shell looks for an extension-less executable and fails
// with ENOENT. Harmless on POSIX, where the argv array is passed through
// unchanged (no argument is interpolated into a shell string here).
const migrate = spawnSync('npx', ['tsx', 'scripts/migrate.ts', 'up'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const server = spawnSync('npx', ['tsx', 'src/api/server.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
process.exit(server.status ?? 1);

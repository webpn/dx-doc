import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Resolve @project/* aliases to their source directories so they work
// in both Vite (dev/build) and Vitest. Matches tsconfig.json paths.
const projectAliases: Record<string, string> = {
  '@project/domain': path.resolve(import.meta.dirname, 'src/domain'),
  '@project/application': path.resolve(import.meta.dirname, 'src/application'),
  '@project/infrastructure': path.resolve(import.meta.dirname, 'src/infrastructure'),
  '@project/design-system': path.resolve(import.meta.dirname, 'src/design-system'),
  '@project/shared': path.resolve(import.meta.dirname, 'src/shared'),
  '@project/api': path.resolve(import.meta.dirname, 'src/api'),
  '@project/app': path.resolve(import.meta.dirname, 'src/app'),
};

export default defineConfig({
  plugins: [react(), tailwindcss()],

  test: {
    pool: 'forks',
    fileParallelism: false,
    // Coverage shows which code no test exercises. It is a report to read, not
    // a number to hit: ADR-0017 states that "coverage targets are not a goal.
    // Meaningful coverage is." No thresholds are configured here, and adding
    // one would turn the report into something to satisfy — which is how a
    // suite ends up green over code nobody verified.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/**'],
    },
    // Generous per-test budgets: this repository is typically checked out inside
    // a OneDrive-synced folder, where cold module resolution and SQLite file I/O
    // are far slower than on local disk.
    //
    // NOTE: these do NOT cover worker STARTUP. Vitest hard-codes that budget
    // (START_TIMEOUT 60s / WORKER_START_TIMEOUT 90s in vitest/dist) with no
    // config surface. When a fork exceeds it the run aborts that file with
    // "[vitest-pool-runner]: Timeout waiting for worker to respond" and reports
    // the remaining files as a pass — a green summary that silently omits a
    // suite. If a run's file count is lower than expected, re-run the missing
    // file on its own rather than trusting the total.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 30_000,
    // Split by environment: domain/application/infrastructure/api tests run
    // under Node (they touch the filesystem and real SQLite), while
    // app/design-system component tests need a DOM (React Testing Library).
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          exclude: [
            '**/node_modules/**',
            'src/app/**',
            'src/design-system/**',
            'e2e/**',
            'spikes/**',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: [
            'src/app/**/*.test.{ts,tsx}',
            'src/design-system/**/*.test.{ts,tsx}',
            // ADR-0023 acceptance spike: not application code, but needs the
            // same jsdom + React Testing Library environment as the ui
            // project to drive the real MDXEditor component.
            'spikes/**/*.test.{ts,tsx}',
          ],
          setupFiles: ['./tests/support/setup-ui-tests.ts'],
        },
      },
    ],
  },

  resolve: {
    alias: projectAliases,
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the Fastify backend in development.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

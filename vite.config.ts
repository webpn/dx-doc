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
    // Split by environment: domain/application/infrastructure/api tests run
    // under Node (they touch the filesystem and real SQLite), while
    // app/design-system component tests need a DOM (React Testing Library).
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          exclude: ['**/node_modules/**', 'src/app/**', 'src/design-system/**', 'e2e/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/app/**/*.test.{ts,tsx}', 'src/design-system/**/*.test.{ts,tsx}'],
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

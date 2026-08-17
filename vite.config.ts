import path from 'node:path';

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
  plugins: [react()],

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

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fastifyStatic from '@fastify/static';
import { loadInstanceConfig } from '@project/infrastructure/config/instance-config';
import Fastify, { type FastifyInstance } from 'fastify';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

/**
 * Build a Fastify application instance.
 *
 * In development Vite serves the client and proxies `/api` to this server.
 * In production (`dist/` exists) Fastify serves the built client assets and
 * provides an SPA fallback for unmatched non-API GET paths.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  // ── Health check ─────────────────────────────────────────────
  app.get('/api/health', () => ({ status: 'ok' }));

  // ── Production static serving ────────────────────────────────
  const distDir = path.resolve(process.cwd(), 'dist');
  if (existsSync(distDir) && statSync(distDir).isDirectory()) {
    void app.register(fastifyStatic, { root: distDir, serve: false });

    // SPA fallback: unmatched non-API GET paths serve index.html
    // so that client-side routing (React Router) works on deep links.
    app.setNotFoundHandler(async (request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });
  }

  return app;
}

/**
 * Start the server on the configured port.
 */
export async function start(): Promise<void> {
  // Validate the instance configuration at boot; refuse to start when a
  // required variable is missing, naming each one (REQ-FDN-013).
  try {
    loadInstanceConfig(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const app = buildApp();
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Server listening on http://${HOST}:${String(PORT)}`);
}

// Run directly when called as the entry point.
const currentFile = fileURLToPath(import.meta.url);
const isEntry = process.argv[1] === currentFile;
if (isEntry) {
  void start();
}

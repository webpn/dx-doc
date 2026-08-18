import { fileURLToPath } from 'node:url';

import { assembleComposition, checkStartup } from './composition-root';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

/**
 * Start the server the way the actual deployment does (REQ-FDN-023/024):
 * validate config, assemble every repository and route once, run the startup
 * self-check (database reachability, migrations up to date, first-run
 * bootstrap), then listen. Any failure names the remedy and stops the process.
 */
export async function start(): Promise<void> {
  try {
    const composition = assembleComposition();
    // Error tracking also captures unhandled process-level rejections
    // (REQ-FDN-014); installed once here so repeated in-process builds
    // (tests) do not stack listeners.
    process.on('unhandledRejection', (reason) => {
      composition.errorTracking.captureException(
        reason instanceof Error ? reason : new Error(String(reason)),
      );
    });
    await checkStartup(composition);
    await composition.app.listen({ port: PORT, host: HOST });
    composition.app.log.info(`Server listening on http://${HOST}:${String(PORT)}`);
  } catch (error) {
    // A config, database, migration or bootstrap failure must not leave a
    // process answering requests it cannot serve (REQ-FDN-024).
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run directly when called as the entry point.
const currentFile = fileURLToPath(import.meta.url);
const isEntry = process.argv[1] === currentFile;
if (isEntry) {
  void start();
}

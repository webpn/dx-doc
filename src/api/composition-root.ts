/**
 * Composition root (REQ-FDN-023): the one place that wires the real
 * application.
 *
 * `assembleComposition` — the only non-test call site of any concrete adapter —
 * opens the database connection, constructs every repository and service once,
 * registers `@fastify/cookie` and `registerAllRoutes` (which reaches auth via
 * `registerAuthRoutes`), and mounts liveness (`/api/health`) and readiness
 * (`/api/ready`). Nothing else names a repository or a service; the server
 * entry point and the test suite both call this same function, so a handler
 * that exists in source and is not wired fails the build.
 *
 * Startup steps that must stop the process on failure (REQ-FDN-024) live in
 * `checkStartup` and run in order: database reachability, schema-version check
 * (pending migrations name `npm run db:migrate`), then the first-run bootstrap
 * (REQ-SEC-013). Startup never runs migrations: they are applied by the
 * explicit `npm run db:migrate` step (REQ-FDN-009).
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { AssetService } from '@project/application/asset/asset-service';
import { AuthService } from '@project/application/auth/auth-service';
import { BootstrapService } from '@project/application/auth/bootstrap-service';
import { GrantService } from '@project/application/auth/grant-service';
import { LifecycleService } from '@project/application/auth/lifecycle-service';
import { PermissionService } from '@project/application/auth/permissions';
import { ServiceTokenService } from '@project/application/auth/service-token-service';
import { SessionService } from '@project/application/auth/session-service';
import { CompanyService } from '@project/application/company/company-service';
import { PageService } from '@project/application/page/page-service';
import type { ImageProcessor } from '@project/application/ports/image-processor';
import type { SearchIndex } from '@project/application/ports/search';
import type { ObjectStorage } from '@project/application/ports/storage';
import { ProjectService } from '@project/application/project/project-service';
import { TrackingService } from '@project/application/tracking/tracking-service';
import {
  loadInstanceConfig,
  type InstanceConfig,
} from '@project/infrastructure/config/instance-config';
import { NoopEmailSender } from '@project/infrastructure/email/noop-email-sender';
import { createSmtpEmailSender } from '@project/infrastructure/email/smtp-email-sender';
import {
  createErrorTracking,
  type ErrorTracking,
} from '@project/infrastructure/error-tracking/sentry';
import { SharpImageProcessor } from '@project/infrastructure/images/sharp-image-processor';
import { pendingMigrations } from '@project/infrastructure/persistence/migrations';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import { SqliteAssetRepository } from '@project/infrastructure/persistence/sqlite-asset-repository';
import { SqliteCompanyRepository } from '@project/infrastructure/persistence/sqlite-company-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqlitePageRepository } from '@project/infrastructure/persistence/sqlite-page-repository';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
import { SqlitePasswordResetTokenRepository } from '@project/infrastructure/persistence/sqlite-reset-token-repository';
import { SqliteServiceTokenRepository } from '@project/infrastructure/persistence/sqlite-service-token-repository';
import { SqliteSessionRepository } from '@project/infrastructure/persistence/sqlite-session-repository';
import {
  SqliteAuditLogRepository,
  SqliteDestinationRepository,
  SqliteFlowRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteSharedPasswordRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
  SqliteTriggerRepository,
  SqliteVersionRepository,
} from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { PagefindSearchIndex } from '@project/infrastructure/search/pagefind-search';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import { createS3ObjectStorage } from '@project/infrastructure/storage/s3-storage';
import { parseDurationToMs } from '@project/shared';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { sql } from 'kysely';

import { registerAllRoutes } from './routes';

/** The one session cookie name for the whole application. */
export const SESSION_COOKIE_NAME = 'dxdoc_session';

/** Overridable seams for tests; the defaults are what a stock instance runs. */
export interface CompositionOptions {
  /** Environment to read config from. Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Override the database file (tests use a temp file). */
  dbFile?: string;
  /** Override the search index adapter (tests use the in-memory one). */
  searchIndex?: SearchIndex;
  /** Override the object storage adapter (tests use the in-memory one). */
  storage?: ObjectStorage;
  /** Override the image processor (ADR-0026); the default is `sharp`-backed. */
  imageProcessor?: ImageProcessor;
}

export interface ServedRoute {
  method: string;
  url: string;
}

export type ReadyStatus =
  { ok: true } | { ok: false; reason: 'database' | 'migrations' | 'storage' };

export interface Composition {
  app: FastifyInstance;
  config: InstanceConfig;
  /** Live database connection; `close()` destroys it. */
  connection: Connection;
  storage: ObjectStorage;
  search: SearchIndex;
  errorTracking: ErrorTracking;
  /** The shared bootstrap service used by `checkStartup`. */
  bootstrap: BootstrapService;
  /** Every route registered on `app`, captured via Fastify's `onRoute` hook. */
  servedRoutes: ServedRoute[];
  /** Liveness vs readiness are deliberately separated (REQ-FDN-024). */
  checkReady(): Promise<ReadyStatus>;
  close(): Promise<void>;
}

/** Startup self-check failure, tagged by stage so callers can react (REQ-FDN-024). */
export class StartupError extends Error {
  readonly stage: 'database' | 'migrations' | 'bootstrap';

  constructor(stage: 'database' | 'migrations' | 'bootstrap', message: string) {
    super(message);
    this.name = 'StartupError';
    this.stage = stage;
  }
}

/**
 * Build the fully wired application. Synchronous: opens the connection and
 * registers routes. Never runs migrations and performs no network call beyond
 * the connection open — the readiness and startup probes are separate.
 */
export function assembleComposition(options: CompositionOptions = {}): Composition {
  const config = loadInstanceConfig(options.env ?? process.env);
  assertOnlySqliteDriver(config);

  const dbFile = options.dbFile ?? path.resolve(config.DB_FILE);
  mkdirSync(path.dirname(dbFile), { recursive: true });
  const connection = openSqliteConnection(dbFile);

  // ── Repositories (adapter wiring lives nowhere else, REQ-FDN-023) ────────
  const accounts = new SqliteAccountRepository(connection.kysely);
  const sessions = new SqliteSessionRepository(connection.kysely);
  const resetTokens = new SqlitePasswordResetTokenRepository(connection.kysely);
  const serviceTokens = new SqliteServiceTokenRepository(connection.kysely);
  const companies = new SqliteCompanyRepository(connection.kysely);
  const projects = new SqliteProjectRepository(connection.kysely);
  const pages = new SqlitePageRepository(connection.kysely);
  const properties = new SqlitePropertyRepository(connection.kysely);
  const modules = new SqliteModuleRepository(connection.kysely);
  const destinations = new SqliteDestinationRepository(connection.kysely);
  const navEvents = new SqliteNavigationEventRepository(connection.kysely);
  const trackings = new SqliteTrackingRepository(connection.kysely);
  const templates = new SqliteTrackingTemplateRepository(connection.kysely);
  const freePages = new SqliteFreePageRepository(connection.kysely);
  const flows = new SqliteFlowRepository(connection.kysely);
  const triggers = new SqliteTriggerRepository(connection.kysely);
  const versions = new SqliteVersionRepository(connection.kysely);
  const sharedPasswords = new SqliteSharedPasswordRepository(connection.kysely);
  const auditLogs = new SqliteAuditLogRepository(connection.kysely);
  const assetRepository = new SqliteAssetRepository(connection.kysely);

  const hasher = new BcryptPasswordHasher();
  const sessionTtlMs = parseDurationToMs(config.AUTH_SESSION_TTL);
  const sessionService = new SessionService(sessions, sessionTtlMs, auditLogs);
  const serviceTokenService = new ServiceTokenService(serviceTokens, accounts);
  const permissions = new PermissionService(accounts);
  const auth = new AuthService(accounts, hasher, sessionService, auditLogs);
  const bootstrap = new BootstrapService(accounts, hasher);
  // Email delivery is fire-and-forget; an instance without SMTP configured
  // uses the no-op sender rather than failing resets (REQ-SEC-013).
  const emailSender = config.SMTP_HOST ? createSmtpEmailSender(config) : new NoopEmailSender();
  // Password-reset token lifetime: a constant until per-company settings land
  // (ADR-0014) — one hour is long enough for a human to click, short enough
  // to be useless when forwarded. Deliberately not an environment variable.
  const passwordResetTtlMs = 60 * 60 * 1000;
  const lifecycle = new LifecycleService(
    accounts,
    hasher,
    resetTokens,
    sessions,
    permissions,
    emailSender,
    config.APP_URL,
    passwordResetTtlMs,
    auditLogs,
  );
  const companyService = new CompanyService(accounts, companies, permissions);

  const search =
    options.searchIndex ?? new PagefindSearchIndex(path.resolve(config.SEARCH_INDEX_PATH));
  const storage = options.storage ?? createS3ObjectStorage(config);
  const imageProcessor = options.imageProcessor ?? new SharpImageProcessor();
  // Assets are served directly from storage, not proxied through an
  // authenticated route (ADR-0026).
  const assetPublicBaseUrl =
    config.STORAGE_PUBLIC_BASE_URL ?? `${config.STORAGE_S3_ENDPOINT}/${config.STORAGE_S3_BUCKET}`;

  const projectService = new ProjectService(projects, permissions, accounts);
  const pageService = new PageService(pages, projects, permissions);
  const grantService = new GrantService(accounts, projects, permissions, auditLogs);
  const trackingService = new TrackingService(
    properties,
    modules,
    destinations,
    navEvents,
    trackings,
    templates,
    freePages,
    flows,
    triggers,
    versions,
    sharedPasswords,
    auditLogs,
    hasher,
    projects,
    permissions,
    connection.kysely,
    search,
  );
  const assetService = new AssetService(
    assetRepository,
    projects,
    permissions,
    storage,
    imageProcessor,
    config.UPLOAD_MAX_BYTES,
    config.IMAGE_MAX_DIMENSION,
    assetPublicBaseUrl,
  );

  const errorTracking = createErrorTracking(config.SENTRY_DSN);

  // ── Fastify app ─────────────────────────────────────────────────────────
  const servedRoutes: ServedRoute[] = [];
  // Test builds connect no raw FDs and want quiet output; production logs are
  // governed by LOG_LEVEL (REQ-FDN-024 readiness must not log per request).
  const logger = config.APP_ENV === 'test' ? false : { level: config.LOG_LEVEL };
  const app = Fastify({ logger });

  app.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      servedRoutes.push({ method: String(method).toUpperCase(), url: route.url });
    }
  });

  app.register(cookie);
  app.register(multipart);

  // Liveness: the process is up (REQ-FDN-024).
  app.get('/api/health', () => ({ status: 'ok' }));

  // Readiness: migrations applied and database + storage reachable, evaluated
  // per request so it flips without a restart. Discloses no version, path,
  // driver or config value (REQ-FDN-024).
  app.get('/api/ready', async (_request, reply) => {
    const status = await readiness(connection, storage);
    if (!status.ok) {
      return reply.code(503).send({ status: 'unhealthy' });
    }
    return { status: 'ok' };
  });

  registerAllRoutes(app, {
    projectService,
    pageService,
    trackingService,
    assetService,
    auth,
    sessions: sessionService,
    serviceTokens: serviceTokenService,
    lifecycle,
    companyService,
    grantService,
    accounts,
    cookieName: SESSION_COOKIE_NAME,
    sessionTtlMs,
    auditLogs,
    appUrl: config.APP_URL,
  });

  // Error tracking (REQ-FDN-014): capture unhandled server errors at the
  // Fastify error boundary. Process-level (`unhandledRejection`) capture is
  // installed once by the server entry point, not per composition.
  app.setErrorHandler((error: Error, _request: FastifyRequest, reply: FastifyReply) => {
    errorTracking.captureException(error);
    void reply.send(error);
  });

  // ── Production static serving + SPA fallback ────────────────────────────
  const distDir = path.resolve(process.cwd(), 'dist');
  if (existsSync(distDir) && statSync(distDir).isDirectory()) {
    void app.register(fastifyStatic, { root: distDir, serve: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });
  }

  return {
    app,
    config,
    connection,
    storage,
    search,
    errorTracking,
    bootstrap,
    servedRoutes,
    checkReady: () => readiness(connection, storage),
    close: async () => {
      await closeSqliteConnection(connection);
    },
  };
}

/**
 * Startup self-check (REQ-FDN-024). Runs, in order, database reachability, the
 * schema-version check (pending migrations name `npm run db:migrate`) and the
 * first-run bootstrap (REQ-SEC-013). Any failure throws a `StartupError` naming
 * the remedy; the caller stops the process.
 */
export async function checkStartup(composition: Composition): Promise<void> {
  try {
    await sql`select 1`.execute(composition.connection.kysely);
  } catch {
    throw new StartupError(
      'database',
      'Database is not reachable. Check DB_DRIVER / DB_FILE and that the database is accessible (REQ-FDN-013).',
    );
  }

  const pending = await pendingMigrations(composition.connection);
  if (pending.length > 0) {
    throw new StartupError(
      'migrations',
      `Database is behind by ${String(pending.length)} migration${pending.length === 1 ? '' : 's'}: ${pending.join(
        ', ',
      )}. Run \`npm run db:migrate\` (REQ-FDN-009) before starting.`,
    );
  }

  await composition.bootstrap.bootstrapFirstAdmin({
    email: composition.config.BOOTSTRAP_ADMIN_EMAIL,
    password: composition.config.BOOTSTRAP_ADMIN_PASSWORD,
  });
}

async function readiness(connection: Connection, storage: ObjectStorage): Promise<ReadyStatus> {
  try {
    await sql`select 1`.execute(connection.kysely);
  } catch {
    return { ok: false, reason: 'database' };
  }
  try {
    const pending = await pendingMigrations(connection);
    if (pending.length > 0) {
      return { ok: false, reason: 'migrations' };
    }
  } catch {
    return { ok: false, reason: 'database' };
  }
  try {
    await storage.checkHealth();
  } catch {
    return { ok: false, reason: 'storage' };
  }
  return { ok: true };
}

function assertOnlySqliteDriver(config: InstanceConfig): void {
  if (config.DB_DRIVER !== 'sqlite') {
    throw new Error(
      `DB_DRIVER=${config.DB_DRIVER} is not available yet — only 'sqlite' exists through R1 ` +
        '(MariaDB and PostgreSQL arrive in R2, ADR-0020).',
    );
  }
}

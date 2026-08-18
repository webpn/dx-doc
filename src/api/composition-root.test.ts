import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AuthService } from '@project/application/auth/auth-service';
import type { GrantService } from '@project/application/auth/grant-service';
import type { LifecycleService } from '@project/application/auth/lifecycle-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { CompanyService } from '@project/application/company/company-service';
import type { PageService } from '@project/application/page/page-service';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import { InMemorySearchIndex } from '@project/infrastructure/search/in-memory-search';
import { InMemoryObjectStorage } from '@project/infrastructure/storage/in-memory-storage';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../tests/support/apply-migrations';

import { registerAccessRoutes } from './access/routes';
import { registerAuthRoutes } from './auth/routes';
import {
  assembleComposition,
  checkStartup,
  SESSION_COOKIE_NAME,
  StartupError,
  type Composition,
  type ServedRoute,
} from './composition-root';
import { registerCompanyRoutes } from './company/routes';
import { registerLifecycleRoutes } from './lifecycle/routes';
import { registerMcpRoutes } from './mcp/routes';
import type { McpServerHandler } from './mcp/server';
import { registerPageRoutes } from './pages/routes';
import { registerProjectRoutes } from './projects/routes';
import { registerAllRoutes } from './routes';
import { registerTokenRoutes } from './tokens/routes';
import { registerTrackingRoutes } from './tracking/routes';

const ADMIN_EMAIL = 'admin@dxdoc.test';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';
const NEW_PASSWORD = 'fresh-horse-battery-staple';

/** A full validated instance environment; tests override the file/seams. */
function testEnv(
  overrides: Record<string, string> = {},
): NodeJS.ProcessEnv & Record<string, string> {
  return {
    APP_URL: 'http://localhost:3000',
    APP_SECRET: 'test-secret',
    APP_ENV: 'test',
    DB_DRIVER: 'sqlite',
    STORAGE_S3_ENDPOINT: 'http://localhost:9000',
    STORAGE_S3_REGION: 'us-east-1',
    STORAGE_S3_BUCKET: 'req-fdn-bucket',
    STORAGE_S3_ACCESS_KEY: 'key',
    STORAGE_S3_SECRET_KEY: 'secret',
    BOOTSTRAP_ADMIN_EMAIL: ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
    AUTH_SESSION_TTL: '8h',
    ...overrides,
  };
}

/** The test-scoped seams every composition here uses (no S3, no Pagefind). */
function testComposition(overrides: Record<string, string> = {}): Composition {
  const dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-comp-'));
  const dbFile = path.join(dir, 'test.sqlite');
  return assembleComposition({
    env: testEnv(overrides),
    dbFile,
    storage: new InMemoryObjectStorage(),
    searchIndex: new InMemorySearchIndex(),
  });
}

const open: Composition[] = [];
afterEach(async () => {
  for (const composition of open.splice(0)) {
    await composition.app.close().catch(() => undefined);
    await composition.close().catch(() => undefined);
    rmSync(path.dirname(composition.config.DB_FILE), { recursive: true, force: true });
  }
});

// ── Route-table (REQ-FDN-023 acceptance) ─────────────────────────────────

const stubProject = {} as ProjectService;
const stubPage = {} as PageService;
const stubTracking = {} as TrackingService;
const stubAuth = {} as AuthService;
const stubSessions = {} as SessionService;
const stubServiceTokens = {} as ServiceTokenService;
const stubLifecycle = {} as LifecycleService;
const stubCompany = {} as CompanyService;
const stubGrants = {} as GrantService;

function captureRoutes(register: (app: FastifyInstance) => void): ServedRoute[] {
  const app = Fastify();
  const routes: ServedRoute[] = [];
  app.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      routes.push({ method: String(method).toUpperCase(), url: route.url });
    }
  });
  register(app);
  return routes;
}

function sortRoutes(routes: readonly ServedRoute[]): ServedRoute[] {
  return [...routes].sort((a, b) => `${a.method} ${a.url}`.localeCompare(`${b.method} ${b.url}`));
}

/** Deduplicate routes (Fastify auto-registers HEAD beside every GET). */
function uniqueRoutes(routes: readonly ServedRoute[]): ServedRoute[] {
  const seen = new Map<string, ServedRoute>();
  for (const route of routes) {
    seen.set(`${route.method} ${route.url}`, route);
  }
  return sortRoutes([...seen.values()]);
}

/** The routes the API layer defines through its single registration entry point. */
const ALL_ROUTES = captureRoutes((app) => {
  registerAllRoutes(app, {
    projectService: stubProject,
    pageService: stubPage,
    trackingService: stubTracking,
    auth: stubAuth,
    sessions: stubSessions,
    serviceTokens: stubServiceTokens,
    lifecycle: stubLifecycle,
    companyService: stubCompany,
    grantService: stubGrants,
    cookieName: SESSION_COOKIE_NAME,
    sessionTtlMs: 1000,
  });
});

/** The routes each top-level register function defines, taken independently. */
const INDIVIDUAL_ROUTES = [
  ...captureRoutes((app) => {
    registerAuthRoutes(app, {
      auth: stubAuth,
      sessions: stubSessions,
      cookieName: SESSION_COOKIE_NAME,
      sessionTtlMs: 1000,
    });
  }),
  ...captureRoutes((app) => {
    registerProjectRoutes(app, {
      projects: stubProject,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerPageRoutes(app, {
      pages: stubPage,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerTrackingRoutes(app, {
      trackingService: stubTracking,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerMcpRoutes(app, {
      mcpHandler: {} as McpServerHandler,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerAccessRoutes(app, {
      grants: stubGrants,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerLifecycleRoutes(app, {
      lifecycle: stubLifecycle,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerCompanyRoutes(app, {
      companies: stubCompany,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
  ...captureRoutes((app) => {
    registerTokenRoutes(app, {
      tokens: stubServiceTokens,
      sessions: stubSessions,
      serviceTokens: stubServiceTokens,
      cookieName: SESSION_COOKIE_NAME,
    });
  }),
];

describe('composition root — route table (REQ-FDN-023)', () => {
  it('serves exactly the routes the API layer defines, plus liveness/readiness', () => {
    const composition = testComposition();
    open.push(composition);

    // Fastify registers HEAD beside every GET (including the two lifecycle
    // routes), so the expected surface includes both.
    const expected = uniqueRoutes([
      ...ALL_ROUTES,
      { method: 'GET', url: '/api/health' },
      { method: 'HEAD', url: '/api/health' },
      { method: 'GET', url: '/api/ready' },
      { method: 'HEAD', url: '/api/ready' },
    ]);

    expect(uniqueRoutes(composition.servedRoutes)).toEqual(expected);
  });

  it('serves every route each individual register function defines (nothing unwired)', () => {
    const composition = testComposition();
    open.push(composition);

    const served = sortRoutes(composition.servedRoutes);
    for (const route of sortRoutes(INDIVIDUAL_ROUTES)) {
      expect(served).toContainEqual(route);
    }
  });

  it('exposes the milestone-critical surface an accidentally dropped route would fail', () => {
    const composition = testComposition();
    open.push(composition);

    const served = new Set(composition.servedRoutes.map((r) => `${r.method} ${r.url}`));
    const critical = [
      'GET /api/health',
      'GET /api/ready',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/change-password',
      'POST /api/mcp',
      'POST /api/users/invite',
      'POST /api/companies',
      'POST /api/auth/tokens',
      'PUT /api/projects/:projectId/grants/:userId',
    ];
    for (const route of critical) {
      expect(served).toContain(route);
    }
  });
});

// ── End-to-end startup (M1.11 exit criteria) ─────────────────────────────

describe('composition root — first-run and readiness (M1.11)', () => {
  it('bootstrap admin authenticates end-to-end on the real server and is forced to change the password', async () => {
    const composition = testComposition();
    open.push(composition);
    await applyMigrations(composition.connection);
    await checkStartup(composition);

    await composition.app.listen({ port: 0, host: '127.0.0.1' });
    const address = composition.app.server.address();
    const port = address !== null && typeof address === 'object' ? address.port : -1;
    expect(port).toBeGreaterThan(0);
    const baseUrl = `http://127.0.0.1:${String(port)}`;

    // Company-less login (REQ-SEC-013/014): no companyId in the body.
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    expect(login.status).toBe(200);
    const loginBody = (await login.json()) as { passwordChangeRequired?: boolean };
    expect(loginBody.passwordChangeRequired).toBe(true);

    const setCookie = login.headers.getSetCookie()[0] ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    const token = setCookie.split(';')[0]?.split('=')[1] ?? '';
    expect(token).not.toBe('');
    const cookieHeader = `${SESSION_COOKIE_NAME}=${token}`;

    // The first-run password must be changed (REQ-SEC-013).
    const changed = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieHeader },
      body: JSON.stringify({ currentPassword: ADMIN_PASSWORD, newPassword: NEW_PASSWORD }),
    });
    expect(changed.status).toBe(200);

    // Re-login with the new password; the flag is cleared.
    const relogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: NEW_PASSWORD }),
    });
    expect(relogin.status).toBe(200);
    const reloginBody = (await relogin.json()) as { passwordChangeRequired?: boolean };
    expect(reloginBody.passwordChangeRequired).toBe(false);
  });

  it('fails loudly against an unmigrated database, naming the remedy', async () => {
    const composition = testComposition();
    open.push(composition); // empty database: migrated nowhere

    await expect(checkStartup(composition)).rejects.toThrow(/npm run db:migrate/);
    await expect(checkStartup(composition)).rejects.toBeInstanceOf(StartupError);

    // Readiness agrees: pending migrations make it unhealthy.
    expect(await composition.checkReady()).toEqual({ ok: false, reason: 'migrations' });
  });

  it('fails loudly when the database is unreachable at startup', async () => {
    const composition = testComposition();
    await applyMigrations(composition.connection);
    await composition.close(); // database goes away before startup completes

    await expect(checkStartup(composition)).rejects.toThrow(/not reachable/i);
  });

  it('applies the bootstrap exactly once across restarts against the same database', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-boot-'));
    const dbFile = path.join(dir, 'boot.sqlite');
    const env = testEnv();
    const seams = {
      storage: new InMemoryObjectStorage(),
      searchIndex: new InMemorySearchIndex(),
    };

    const first = assembleComposition({ env, dbFile, ...seams });
    await applyMigrations(first.connection);
    await checkStartup(first);
    await first.close();

    // Second start against the same (migrated, non-empty) database: bootstrap
    // is a no-op and must not throw for missing variables.
    const second = assembleComposition({ env, dbFile, ...seams });
    await checkStartup(second);

    const users = await second.connection.kysely.selectFrom('users').selectAll().execute();
    expect(users).toHaveLength(1);
    expect(users[0]?.email).toBe(ADMIN_EMAIL);

    await second.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('/api/ready is healthy when migrated and flips unhealthy when the database is gone, without a restart', async () => {
    const composition = testComposition();
    open.push(composition);
    await applyMigrations(composition.connection);

    expect(await composition.checkReady()).toEqual({ ok: true });
    const healthy = await composition.app.inject({ method: 'GET', url: '/api/ready' });
    expect(healthy.statusCode).toBe(200);
    expect(healthy.json()).toEqual({ status: 'ok' });

    // Liveness is unaffected by the database (REQ-FDN-024 separation).
    const alive = await composition.app.inject({ method: 'GET', url: '/api/health' });
    expect(alive.statusCode).toBe(200);

    await composition.close(); // database disappears mid-run

    const unhealthy = await composition.app.inject({ method: 'GET', url: '/api/ready' });
    expect(unhealthy.statusCode).toBe(503);
    expect(unhealthy.json()).toEqual({ status: 'unhealthy' });
    expect((await composition.checkReady()).ok).toBe(false);
  });

  it('readiness discloses no version, path, driver or config value', async () => {
    const composition = testComposition();
    open.push(composition);
    await applyMigrations(composition.connection);

    const healthy = await composition.app.inject({ method: 'GET', url: '/api/ready' });
    const body = healthy.json<{ status: string }>();
    expect(body).toEqual({ status: 'ok' });

    await composition.close();
    const unhealthy = await composition.app.inject({ method: 'GET', url: '/api/ready' });
    const bad = unhealthy.json<{ status: string }>();
    expect(bad).toEqual({ status: 'unhealthy' });
  });

  it('refuses a non-sqlite driver with the ADR-0020 message', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-driver-'));
    const dbFile = path.join(dir, 'test.sqlite');

    expect(() =>
      assembleComposition({
        env: testEnv({ DB_DRIVER: 'mariadb' }),
        dbFile,
        storage: new InMemoryObjectStorage(),
        searchIndex: new InMemorySearchIndex(),
      }),
    ).toThrow(/only 'sqlite' exists through R1/);

    rmSync(dir, { recursive: true, force: true });
  });
});

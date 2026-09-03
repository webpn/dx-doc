import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AssetService } from '@project/application/asset/asset-service';
import type { AuthService } from '@project/application/auth/auth-service';
import type { GrantService } from '@project/application/auth/grant-service';
import type { InstanceAdminStepUpService } from '@project/application/auth/instance-admin-stepup-service';
import type { LifecycleService } from '@project/application/auth/lifecycle-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { CompanyService } from '@project/application/company/company-service';
import type { PageService } from '@project/application/page/page-service';
import type { AccountRepository } from '@project/application/ports/account-repository';
import type { AuditLogRepository } from '@project/application/ports/tracking-repositories';
import type { ProjectService } from '@project/application/project/project-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import { InMemorySearchIndex } from '@project/infrastructure/search/in-memory-search';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import { InMemoryObjectStorage } from '@project/infrastructure/storage/in-memory-storage';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../tests/support/apply-migrations';

import { registerAccessRoutes } from './access/routes';
import { registerAssetRoutes } from './assets/routes';
import { registerAuthRoutes } from './auth/routes';
import { registerCompanyRoutes } from './company/routes';
import {
  assembleComposition,
  checkStartup,
  SESSION_COOKIE_NAME,
  StartupError,
  type Composition,
  type ServedRoute,
} from './composition-root';
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
  const composition = assembleComposition({
    env: testEnv(overrides),
    dbFile,
    storage: new InMemoryObjectStorage(),
    searchIndex: new InMemorySearchIndex(),
  });
  // Register the directory we actually created. `config.DB_FILE` is the raw env
  // value, NOT the `dbFile` override passed above, so deriving the path to
  // remove from the config deleted the wrong directory and leaked one temp dir
  // per test.
  open.push({ composition, dir });
  return composition;
}

const open: { composition: Composition; dir: string }[] = [];
afterEach(async () => {
  for (const { composition, dir } of open.splice(0)) {
    await composition.app.close().catch(() => undefined);
    await composition.close().catch(() => undefined);
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Route-table (REQ-FDN-023 acceptance) ─────────────────────────────────

const stubProject = {} as ProjectService;
const stubPage = {} as PageService;
const stubTracking = {} as TrackingService;
const stubAsset = {} as AssetService;
const stubAuth = {} as AuthService;
const stubSessions = {} as SessionService;
const stubServiceTokens = {} as ServiceTokenService;
const stubLifecycle = {} as LifecycleService;
const stubCompany = {} as CompanyService;
const stubGrants = {} as GrantService;
const stubInstanceAdminStepUps = {} as InstanceAdminStepUpService;
const stubAuditLogs = {} as AuditLogRepository;
const stubAccounts = {} as AccountRepository;

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
    assetService: stubAsset,
    auth: stubAuth,
    sessions: stubSessions,
    serviceTokens: stubServiceTokens,
    lifecycle: stubLifecycle,
    companyService: stubCompany,
    grantService: stubGrants,
    instanceAdminStepUpService: stubInstanceAdminStepUps,
    accounts: stubAccounts,
    cookieName: SESSION_COOKIE_NAME,
    sessionTtlMs: 1000,
    auditLogs: stubAuditLogs,
  });
});

/** The routes each top-level register function defines, taken independently. */
const INDIVIDUAL_ROUTES = [
  ...captureRoutes((app) => {
    registerAuthRoutes(app, {
      auth: stubAuth,
      sessions: stubSessions,
      accounts: stubAccounts,
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
    registerAssetRoutes(app, {
      assets: stubAsset,
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

    const served = sortRoutes(composition.servedRoutes);
    for (const route of sortRoutes(INDIVIDUAL_ROUTES)) {
      expect(served).toContainEqual(route);
    }
  });

  it('exposes the milestone-critical surface an accidentally dropped route would fail', () => {
    const composition = testComposition();

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

// ── Catalogue copy at project creation (REQ-DOM-019, Critical Business Rule 3) ──

describe('catalogue copy at project creation over HTTP (REQ-DOM-019, Critical Business Rule 3)', () => {
  /**
   * Seed a company with the four roles and an admin user the routes can
   * authenticate. Optionally seed the company catalogue (one property, one
   * module referencing it, both `project_id` null).
   */
  async function seedCompanyAndCatalogue(
    composition: Composition,
    withCatalogue: boolean,
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    await composition.connection.kysely
      .insertInto('company')
      .values({ id: 'c1', name: 'Acme', slug: 'acme', created_at: nowIso, updated_at: nowIso })
      .execute();
    for (const name of ['admin', 'project_manager', 'editor', 'viewer']) {
      await composition.connection.kysely
        .insertInto('roles')
        .values({
          id: `role-${name}`,
          company_id: 'c1',
          name,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .execute();
    }
    const hasher = new BcryptPasswordHasher();
    await composition.connection.kysely
      .insertInto('users')
      .values({
        id: 'u-admin',
        company_id: 'c1',
        email: 'admin@acme.test',
        password_hash: await hasher.hash(ADMIN_PASSWORD),
        role_id: 'role-admin',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    if (withCatalogue) {
      await composition.connection.kysely
        .insertInto('properties')
        .values({
          id: 'cat-prop-1',
          company_id: 'c1',
          project_id: null,
          name: 'global_user_id',
          business_label: null,
          description: null,
          data_source: 'other',
          type: 'string',
          format_pattern: null,
          allowed_values: null,
          example_values: null,
          pii_flag: 0,
          hashing_policy: null,
          status: 'active',
          introduced_in_version: null,
          analysis_notes: null,
          aep_field_group: null,
          parent_property_id: null,
          derived_from: null,
          custom_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .execute();
      await composition.connection.kysely
        .insertInto('modules')
        .values({
          id: 'cat-mod-1',
          company_id: 'c1',
          project_id: null,
          name: 'Global Identity',
          description: null,
          custom_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .execute();
      await composition.connection.kysely
        .insertInto('module_properties')
        .values({ module_id: 'cat-mod-1', property_id: 'cat-prop-1', created_at: nowIso })
        .execute();
    }
  }

  async function loginAsAdmin(composition: Composition): Promise<string> {
    const login = await composition.app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { companyId: 'c1', email: 'admin@acme.test', password: ADMIN_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    return (
      String(login.headers['set-cookie'] ?? '')
        .split(';')[0]
        ?.split('=')[1] ?? ''
    );
  }

  it('POST /api/projects auto-copies the company catalogue and the manual copy endpoint stays idempotent', async () => {
    const composition = testComposition();
    await applyMigrations(composition.connection);
    await seedCompanyAndCatalogue(composition, true);
    const cookie = await loginAsAdmin(composition);

    // Create the project through the real HTTP route.
    const created = await composition.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${cookie}` },
      payload: { companyId: 'c1', name: 'Web', slug: 'web', platform: 'web' },
    });
    expect(created.statusCode).toBe(201);
    const projectId = created.json<{ id: string }>().id;

    // Project-scoped copies exist, with their own ids — never the catalogue
    // originals (no live link, REQ-DOM-019).
    const props = await composition.connection.kysely
      .selectFrom('properties')
      .selectAll()
      .where('project_id', '=', projectId)
      .execute();
    const mods = await composition.connection.kysely
      .selectFrom('modules')
      .selectAll()
      .where('project_id', '=', projectId)
      .execute();
    expect(props).toHaveLength(1);
    expect(props[0]?.name).toBe('global_user_id');
    expect(props[0]?.id).not.toBe('cat-prop-1');
    expect(mods).toHaveLength(1);
    expect(mods[0]?.name).toBe('Global Identity');
    expect(mods[0]?.id).not.toBe('cat-mod-1');

    // The copied module references the copied property, not the catalogue one.
    const modProps = await composition.connection.kysely
      .selectFrom('module_properties')
      .selectAll()
      .where('module_id', '=', mods[0]?.id ?? '')
      .execute();
    expect(modProps.map((mp) => mp.property_id)).toEqual([props[0]?.id ?? '']);

    // Re-running the manual copy endpoint (the standalone catalogue screen's
    // pull) after the auto-copy adds nothing.
    const reRun = await composition.app.inject({
      method: 'POST',
      url: `/api/companies/c1/projects/${projectId}/copy-catalogue`,
      headers: { cookie: `dxdoc_session=${cookie}` },
      payload: { propertyIds: ['cat-prop-1'], moduleIds: ['cat-mod-1'] },
    });
    expect(reRun.statusCode).toBe(200);
    expect(reRun.json()).toEqual({ copiedProperties: 0, copiedModules: 0 });
    expect(
      await composition.connection.kysely
        .selectFrom('properties')
        .selectAll()
        .where('project_id', '=', projectId)
        .execute(),
    ).toHaveLength(1);
    expect(
      await composition.connection.kysely
        .selectFrom('modules')
        .selectAll()
        .where('project_id', '=', projectId)
        .execute(),
    ).toHaveLength(1);
  });

  it('POST /api/projects creates no project-scoped rows when the company catalogue is empty', async () => {
    const composition = testComposition();
    await applyMigrations(composition.connection);
    await seedCompanyAndCatalogue(composition, false);
    const cookie = await loginAsAdmin(composition);

    const created = await composition.app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${cookie}` },
      payload: { companyId: 'c1', name: 'Bare', slug: 'bare', platform: 'web' },
    });
    expect(created.statusCode).toBe(201);
    const projectId = created.json<{ id: string }>().id;

    expect(
      await composition.connection.kysely
        .selectFrom('properties')
        .selectAll()
        .where('project_id', '=', projectId)
        .execute(),
    ).toHaveLength(0);
    expect(
      await composition.connection.kysely
        .selectFrom('modules')
        .selectAll()
        .where('project_id', '=', projectId)
        .execute(),
    ).toHaveLength(0);
  });
});

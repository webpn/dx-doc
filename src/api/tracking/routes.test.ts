import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { PermissionService } from '@project/application/auth/permissions';
import { ServiceTokenService } from '@project/application/auth/service-token-service';
import { SessionService } from '@project/application/auth/session-service';
import { TrackingService } from '@project/application/tracking/tracking-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqlitePageRepository } from '@project/infrastructure/persistence/sqlite-page-repository';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
import { SqliteServiceTokenRepository } from '@project/infrastructure/persistence/sqlite-service-token-repository';
import { SqliteSessionRepository } from '@project/infrastructure/persistence/sqlite-session-repository';
import {
  SqliteDestinationRepository,
  SqliteFlowRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
  SqliteTriggerRepository,
  SqliteVersionRepository,
  SqliteSharedPasswordRepository,
  SqliteAuditLogRepository,
} from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { InMemorySearchIndex } from '@project/infrastructure/search/in-memory-search';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';
import { registerAuthRoutes } from '../auth/routes';

import { registerTrackingRoutes } from './routes';

const TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD = 'correct-horse-battery-staple';

function t(): string {
  return new Date().toISOString();
}

describe('Import-grade REST API (M1.2, REQ-IMP-002, REQ-IMP-005, REQ-IMP-006, REQ-API-009)', () => {
  let dir: string;
  let connection: Connection;
  let app: FastifyInstance;
  let auth: AuthService;
  let sessions: SessionService;
  let editorCookie: string;
  let adminCookie: string;
  let auditLogRepo: SqliteAuditLogRepository;
  let sessionTokenVal: string;
  const companyId = 'comp-api-test';
  const projectId = 'proj-api-test';
  const otherProjectId = 'proj-api-other';
  const ownPageId = 'page-api-own';
  const otherPageId = 'page-api-other';
  const otherNavEventId = 'nav-api-other';

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-tracking-api-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);

    // Setup base company, role, user, grant, project
    const nowIso = t();
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'API Test Corp',
        slug: 'api-corp',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    const editorRoleId = 'role-editor';
    await connection.kysely
      .insertInto('roles')
      .values({
        id: editorRoleId,
        company_id: companyId,
        name: 'editor',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    const hasher = new BcryptPasswordHasher();
    const hash = await hasher.hash(PASSWORD);
    const editorUserId = 'user-editor';

    await connection.kysely
      .insertInto('users')
      .values({
        id: editorUserId,
        company_id: companyId,
        role_id: editorRoleId,
        email: 'editor@api.com',
        password_hash: hash,
        active: 1,
        password_must_change: 0,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    // Company-catalogue endpoints require company.manage_catalogue, which is
    // an admin's company role — the editor only holds a project grant.
    const adminRoleId = 'role-admin';
    await connection.kysely
      .insertInto('roles')
      .values({
        id: adminRoleId,
        company_id: companyId,
        name: 'admin',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('users')
      .values({
        id: 'user-admin',
        company_id: companyId,
        role_id: adminRoleId,
        email: 'admin@api.com',
        password_hash: hash,
        active: 1,
        password_must_change: 0,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('projects')
      .values({
        id: projectId,
        company_id: companyId,
        name: 'API Test Project',
        slug: 'api-proj',
        platform: 'web',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    // REQ-DOM-028 fixtures need a second project in the same company to prove
    // cross-project references are rejected rather than merely absent.
    await connection.kysely
      .insertInto('projects')
      .values({
        id: otherProjectId,
        company_id: companyId,
        name: 'API Other Project',
        slug: 'api-proj-other',
        platform: 'web',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('pages')
      .values([
        {
          id: ownPageId,
          project_id: projectId,
          parent_id: null,
          name: 'Own Home',
          slug: 'own-home',
          custom_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        },
        {
          id: otherPageId,
          project_id: otherProjectId,
          parent_id: null,
          name: 'Other Home',
          slug: 'other-home',
          custom_id: null,
          created_at: nowIso,
          updated_at: nowIso,
        },
      ])
      .execute();

    await connection.kysely
      .insertInto('navigation_events')
      .values({
        id: otherNavEventId,
        project_id: otherProjectId,
        name: 'Other Screen View',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('project_grants')
      .values({
        id: 'grant-editor',
        project_id: projectId,
        user_id: editorUserId,
        role_id: editorRoleId,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    const accounts = new SqliteAccountRepository(connection.kysely);
    auditLogRepo = new SqliteAuditLogRepository(connection.kysely);
    const sessionRepo = new SqliteSessionRepository(connection.kysely);
    sessions = new SessionService(sessionRepo, TTL_MS, auditLogRepo);
    const serviceTokens = new ServiceTokenService(
      new SqliteServiceTokenRepository(connection.kysely),
      accounts,
    );
    auth = new AuthService(accounts, hasher, sessions, auditLogRepo);
    const permissions = new PermissionService(accounts);

    const projectRepo = new SqliteProjectRepository(connection.kysely);
    const pageRepo = new SqlitePageRepository(connection.kysely);
    const propRepo = new SqlitePropertyRepository(connection.kysely);
    const modRepo = new SqliteModuleRepository(connection.kysely);
    const destRepo = new SqliteDestinationRepository(connection.kysely);
    const navRepo = new SqliteNavigationEventRepository(connection.kysely);
    const trkRepo = new SqliteTrackingRepository(connection.kysely);
    const tplRepo = new SqliteTrackingTemplateRepository(connection.kysely);
    const freePageRepo = new SqliteFreePageRepository(connection.kysely);
    const flowRepo = new SqliteFlowRepository(connection.kysely);
    const triggerRepo = new SqliteTriggerRepository(connection.kysely);
    const versionRepo = new SqliteVersionRepository(connection.kysely);
    const sharedPasswordRepo = new SqliteSharedPasswordRepository(connection.kysely);

    const searchIndex = new InMemorySearchIndex();

    const trackingService = new TrackingService(
      propRepo,
      modRepo,
      destRepo,
      navRepo,
      trkRepo,
      tplRepo,
      freePageRepo,
      flowRepo,
      triggerRepo,
      versionRepo,
      sharedPasswordRepo,
      auditLogRepo,
      hasher,
      projectRepo,
      pageRepo,
      permissions,
      sessions,
      searchIndex,
    );

    app = Fastify();
    await app.register(cookie);

    const cookieName = 'dxdoc_session';
    registerAuthRoutes(app, {
      auth,
      sessions,
      accounts,
      cookieName,
      sessionTtlMs: TTL_MS,
    });

    registerTrackingRoutes(app, {
      trackingService,
      sessions,
      serviceTokens,
      cookieName,
    });

    await app.ready();

    // Login to obtain cookie & session token for Bearer auth
    const loginRes = await auth.login(companyId, 'editor@api.com', PASSWORD);
    if (!loginRes.ok) throw new Error('Login failed');
    sessionTokenVal = loginRes.session.token;
    editorCookie = `${cookieName}=${sessionTokenVal}`;

    const adminLoginRes = await auth.login(companyId, 'admin@api.com', PASSWORD);
    if (!adminLoginRes.ok) throw new Error('Admin login failed');
    adminCookie = `${cookieName}=${adminLoginRes.session.token}`;
  });

  afterEach(async () => {
    await app.close();
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('supports Bearer service-account token authentication (REQ-API-009)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/properties?projectId=${projectId}`,
      headers: {
        authorization: `Bearer ${sessionTokenVal}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it('lists tracking templates for a project (REQ-DOM-009)', async () => {
    // The list route is what a template picker needs; the service had it long
    // before it was reachable over HTTP.
    const emptyRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
      headers: { cookie: editorCookie },
    });
    expect(emptyRes.statusCode).toBe(200);
    expect(emptyRes.json()).toEqual([]);

    const createRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { name: 'Page View', description: 'Standard page view blueprint.' },
    });
    expect(createRes.statusCode).toBe(201);

    const listRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
      headers: { cookie: editorCookie },
    });
    expect(listRes.statusCode).toBe(200);
    const templates: { name: string; projectId: string | null }[] = listRes.json();
    expect(templates).toHaveLength(1);
    expect(templates[0]?.name).toBe('Page View');

    // Catalogue templates are a separate scope needing company.manage_catalogue,
    // which this project-only editor lacks — so the catalogue list is forbidden,
    // not merely empty. That the two scopes diverge is the point.
    const catalogueRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/tracking-templates`,
      headers: { cookie: editorCookie },
    });
    expect(catalogueRes.statusCode).toBe(403);
  });

  it('rejects an unauthenticated template list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('lists free pages and round-trips their hierarchy (REQ-AUTH-003)', async () => {
    // listFreePages existed with permission checks but had no HTTP route, so no
    // client could reach it — the same gap found for pages and templates.
    const rootRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { title: 'Integration', slug: 'integration', content: '# Integration' },
    });
    expect(rootRes.statusCode).toBe(201);
    const rootId = rootRes.json<{ id: string }>().id;

    const childRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { title: 'SDK', slug: 'sdk', content: '# SDK', parentId: rootId },
    });
    expect(childRes.statusCode).toBe(201);

    const fpListRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/free-pages?projectId=${projectId}`,
      headers: { cookie: editorCookie },
    });
    expect(fpListRes.statusCode).toBe(200);
    const pages: { slug: string; parentId: string | null }[] = fpListRes.json();
    expect(pages).toHaveLength(2);
    // The hierarchy must survive the transport, not just the database.
    expect(pages.find((p) => p.slug === 'sdk')?.parentId).toBe(rootId);
    expect(pages.find((p) => p.slug === 'integration')?.parentId).toBeNull();

    // The company catalogue is a separate scope needing company.manage_catalogue.
    const fpCatalogueRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/free-pages`,
      headers: { cookie: editorCookie },
    });
    expect(fpCatalogueRes.statusCode).toBe(403);
  });

  it('creates, reads, and updates full tracking graph via REST API (REQ-IMP-002)', async () => {
    // 1. Create property
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/properties?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'page_language',
        businessLabel: 'Page Language',
        type: 'string',
        customId: 'notion-prop-lang',
      },
    });
    expect(propRes.statusCode).toBe(201);
    const propJson = propRes.json<{ id: string }>();
    const propId = propJson.id;

    // 2. Create navigation event
    const navRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/navigation-events`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'Screen View',
      },
    });
    expect(navRes.statusCode).toBe(201);
    const navJson = navRes.json<{ id: string }>();
    const navId = navJson.id;

    // 3. Create tracking
    const trkRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/trackings`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'Home Page Load',
        slug: 'home-page-load',
        navigationEventId: navId,
        customId: 'notion-trk-home',
      },
    });
    expect(trkRes.statusCode).toBe(201);
    const trkJson = trkRes.json<{ id: string }>();
    const trkId = trkJson.id;

    // 4. Create module with property
    const modRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/modules?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'Localization Module',
        propertyIds: [propId],
      },
    });
    expect(modRes.statusCode).toBe(201);
    const modJson = modRes.json<{ id: string }>();
    const modId = modJson.id;

    // 5. Attach module to tracking
    const attachRes = await app.inject({
      method: 'POST',
      url: `/api/trackings/${trkId}/modules`,
      headers: { cookie: editorCookie },
      payload: { moduleId: modId },
    });
    expect(attachRes.statusCode).toBe(200);

    // 6. Read tracking back
    const getTrkRes = await app.inject({
      method: 'GET',
      url: `/api/trackings/${trkId}`,
      headers: { cookie: editorCookie },
    });
    expect(getTrkRes.statusCode).toBe(200);
    const trkData = getTrkRes.json<{
      properties: { propertyId: string; source: string; presence: string }[];
    }>();
    expect(trkData.properties).toHaveLength(1);
    expect(trkData.properties[0]?.propertyId).toBe(propId);
    expect(trkData.properties[0]?.source).toBe('module');
  });

  it('handles batch write endpoints with per-item status (REQ-IMP-005, D35)', async () => {
    const batchRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/batch`,
      headers: { cookie: editorCookie },
      payload: {
        projectId,
        properties: [
          { name: 'batch_prop_1', type: 'string' },
          { name: '', type: 'string' }, // invalid name -> fails
        ],
      },
    });

    expect(batchRes.statusCode).toBe(200);
    const body = batchRes.json<{
      results: {
        properties: { index: number; success: boolean; id?: string; error?: unknown }[];
      };
    }>();
    expect(body.results.properties).toHaveLength(2);
    expect(body.results.properties[0]?.success).toBe(true);
    expect(body.results.properties[0]?.id).toBeDefined();
    expect(body.results.properties[1]?.success).toBe(false);
  });

  it('generates reconciliation report via GET /api/companies/:companyId/projects/:projectId/reconciliation (REQ-IMP-006)', async () => {
    const reportRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/reconciliation`,
      headers: { cookie: editorCookie },
    });

    expect(reportRes.statusCode).toBe(200);
    const report = reportRes.json<{
      projectId: string;
      counts: { properties: number; trackings: number };
    }>();
    expect(report.projectId).toBe(projectId);
    expect(report.counts).toBeDefined();
  });

  it('syncs search index and executes project-scoped full-text queries (REQ-AUTH-007, REQ-SEC-012)', async () => {
    // 1. Create a property to index
    const createPropRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/properties?projectId=${projectId}`,
      headers: { authorization: `Bearer ${sessionTokenVal}` },
      payload: {
        name: 'page_type',
        businessLabel: 'Page Type',
        dataSource: 'development',
        type: 'string',
        status: 'active',
      },
    });
    expect(createPropRes.statusCode).toBe(201);

    // 2. Sync index
    const syncRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/projects/${projectId}/search/sync`,
      headers: { authorization: `Bearer ${sessionTokenVal}` },
    });
    expect(syncRes.statusCode).toBe(200);
    const syncData = syncRes.json<{ indexedCount: number }>();
    expect(syncData.indexedCount).toBeGreaterThan(0);

    // 3. Query for page_type property
    const searchRes = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/search?q=page_type`,
      headers: { authorization: `Bearer ${sessionTokenVal}` },
    });
    expect(searchRes.statusCode).toBe(200);
    const results = searchRes.json<{ documentId: string; title: string }[]>();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.title).toContain('page_type');
  });

  it("rejects creating a tracking that references another project's page (REQ-DOM-028)", async () => {
    const navRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/navigation-events`,
      headers: { cookie: editorCookie },
      payload: { name: 'Screen View' },
    });
    expect(navRes.statusCode).toBe(201);
    const navId = navRes.json<{ id: string }>().id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/trackings`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'Foreign Page Load',
        slug: 'foreign-page-load',
        navigationEventId: navId,
        pageId: otherPageId,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('CROSS_PROJECT_REFERENCE');
  });

  it("rejects updating a tracking to reference another project's page (REQ-DOM-028)", async () => {
    const navRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/navigation-events`,
      headers: { cookie: editorCookie },
      payload: { name: 'Screen View' },
    });
    expect(navRes.statusCode).toBe(201);
    const navId = navRes.json<{ id: string }>().id;

    const trkRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/trackings`,
      headers: { cookie: editorCookie },
      payload: { name: 'Home Page Load', slug: 'home-page-load', navigationEventId: navId },
    });
    expect(trkRes.statusCode).toBe(201);
    const trkId = trkRes.json<{ id: string }>().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/trackings/${trkId}`,
      headers: { cookie: editorCookie },
      payload: { pageId: otherPageId },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('CROSS_PROJECT_REFERENCE');
  });

  it("rejects updating a tracking to reference another project's navigation event (REQ-DOM-028)", async () => {
    const navRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/navigation-events`,
      headers: { cookie: editorCookie },
      payload: { name: 'Screen View' },
    });
    expect(navRes.statusCode).toBe(201);
    const navId = navRes.json<{ id: string }>().id;

    const trkRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/trackings`,
      headers: { cookie: editorCookie },
      payload: { name: 'Home Page Load', slug: 'home-page-load', navigationEventId: navId },
    });
    expect(trkRes.statusCode).toBe(201);
    const trkId = trkRes.json<{ id: string }>().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/trackings/${trkId}`,
      headers: { cookie: editorCookie },
      payload: { navigationEventId: otherNavEventId },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('CROSS_PROJECT_REFERENCE');
  });

  it('creates a tracking with a same-project page reference (REQ-DOM-028 positive control)', async () => {
    const navRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/navigation-events`,
      headers: { cookie: editorCookie },
      payload: { name: 'Screen View' },
    });
    expect(navRes.statusCode).toBe(201);
    const navId = navRes.json<{ id: string }>().id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/trackings`,
      headers: { cookie: editorCookie },
      payload: {
        name: 'Own Page Load',
        slug: 'own-page-load',
        navigationEventId: navId,
        pageId: ownPageId,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json<{ id: string }>().id).toBeDefined();
  });

  it('creates a property and a module through the project-level routes (M1.16)', async () => {
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: 'page_language', type: 'string', dataSource: 'development' },
    });
    expect(propRes.statusCode).toBe(201);
    const propId = propRes.json<{ id: string }>().id;
    expect(propId).toBeDefined();

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/modules`,
      headers: { cookie: editorCookie },
      payload: { name: 'Localization Module', propertyIds: [propId] },
    });
    expect(modRes.statusCode).toBe(201);
    const modId = modRes.json<{ id: string }>().id;
    expect(modId).toBeDefined();

    // Both land as project-scoped rows: the project list shows the property,
    // and the module's property set resolved the reference it was given.
    const propListRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/properties?projectId=${projectId}`,
      headers: { cookie: editorCookie },
    });
    expect(propListRes.statusCode).toBe(200);
    const props = propListRes.json<{ id: string; projectId: string | null }[]>();
    expect(props.some((p) => p.id === propId && p.projectId === projectId)).toBe(true);

    const modGetRes = await app.inject({
      method: 'GET',
      url: `/api/modules/${modId}`,
      headers: { cookie: editorCookie },
    });
    expect(modGetRes.statusCode).toBe(200);
    expect(
      modGetRes.json<{ module: { projectId: string | null }; propertyIds: string[] }>(),
    ).toMatchObject({
      module: { projectId },
      propertyIds: [propId],
    });
  });

  it('appends an audit entry for every project-scoped entity create (REQ-SEC-006)', async () => {
    // Regression guard: each of these create paths used to resolve its
    // audit-log guard's project with the company id, never matched, and
    // silently wrote no entry — the create event class REQ-SEC-006 requires.
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: 'page_language', type: 'string', dataSource: 'development' },
    });
    expect(propRes.statusCode).toBe(201);
    const propId = propRes.json<{ id: string }>().id;

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/modules`,
      headers: { cookie: editorCookie },
      payload: { name: 'Localization Module' },
    });
    expect(modRes.statusCode).toBe(201);
    const modId = modRes.json<{ id: string }>().id;

    const destRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/destinations?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: {
        platform: 'web',
        variableType: 'js_variable',
        identifier: 'window.dataLayer',
        name: 'Data Layer',
      },
    });
    expect(destRes.statusCode).toBe(201);
    const destId = destRes.json<{ id: string }>().id;

    const tplRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { name: 'Page View' },
    });
    expect(tplRes.statusCode).toBe(201);
    const tplId = tplRes.json<{ id: string }>().id;

    const pageRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { title: 'Integration', slug: 'audit-integration', content: '# Integration' },
    });
    expect(pageRes.statusCode).toBe(201);
    const pageId = pageRes.json<{ id: string }>().id;

    const logs = await auditLogRepo.listLogsForProject(projectId, 500);
    const expectCreateEntry = (action: string, entityId: string, entityType: string): void => {
      const entry = logs.find((l) => l.action === action && l.entityId === entityId);
      expect(entry).toBeDefined();
      expect(entry?.entityType).toBe(entityType);
      expect(entry?.projectId).toBe(projectId);
      expect(entry?.companyId).toBe(companyId);
      expect(entry?.actorId).toBe('user-editor');
    };
    expectCreateEntry('property.created', propId, 'property');
    expectCreateEntry('module.created', modId, 'module');
    expectCreateEntry('destination.created', destId, 'destination');
    expectCreateEntry('tracking_template.created', tplId, 'tracking_template');
    expectCreateEntry('free_page.created', pageId, 'free_page');
  });

  it('appends a company-level audit entry for every catalogue entity create (REQ-SEC-006)', async () => {
    // Catalogue scope requires company.manage_catalogue — an admin company
    // role the project-only editor lacks. The entries must carry a null
    // project: audit_logs.project_id is nullable and the company-level auth
    // events (login, invitation, ...) already write null the same way.
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/properties`,
      headers: { cookie: adminCookie },
      payload: { name: 'catalogue_page_language', type: 'string', dataSource: 'development' },
    });
    expect(propRes.statusCode).toBe(201);
    const propId = propRes.json<{ id: string }>().id;

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/modules`,
      headers: { cookie: adminCookie },
      payload: { name: 'Catalogue Module' },
    });
    expect(modRes.statusCode).toBe(201);
    const modId = modRes.json<{ id: string }>().id;

    const destRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/destinations`,
      headers: { cookie: adminCookie },
      payload: {
        platform: 'web',
        variableType: 'js_variable',
        identifier: 'window.dataLayer',
        name: 'Catalogue Data Layer',
      },
    });
    expect(destRes.statusCode).toBe(201);
    const destId = destRes.json<{ id: string }>().id;

    const tplRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/tracking-templates`,
      headers: { cookie: adminCookie },
      payload: { name: 'Catalogue Page View' },
    });
    expect(tplRes.statusCode).toBe(201);
    const tplId = tplRes.json<{ id: string }>().id;

    const pageRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages`,
      headers: { cookie: adminCookie },
      payload: {
        title: 'Catalogue Integration',
        slug: 'catalogue-integration',
        content: '# Catalogue',
      },
    });
    expect(pageRes.statusCode).toBe(201);
    const pageId = pageRes.json<{ id: string }>().id;

    const logs = await auditLogRepo.listLogsForCompany(companyId, 500);
    const expectCatalogueEntry = (action: string, entityId: string): void => {
      const entry = logs.find((l) => l.action === action && l.entityId === entityId);
      expect(entry).toBeDefined();
      expect(entry?.projectId).toBeNull();
      expect(entry?.companyId).toBe(companyId);
      expect(entry?.actorId).toBe('user-admin');
    };
    expectCatalogueEntry('property.created', propId);
    expectCatalogueEntry('module.created', modId);
    expectCatalogueEntry('destination.created', destId);
    expectCatalogueEntry('tracking_template.created', tplId);
    expectCatalogueEntry('free_page.created', pageId);
  });

  it('appends an audit entry for every project-scoped entity update and delete (REQ-SEC-006)', async () => {
    // Regression guard: each of these update and delete paths used to
    // resolve their audit-log guard's project with the company id, never
    // matched, and silently wrote no entry — the update and delete event
    // classes REQ-SEC-006 requires.
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: 'page_language', type: 'string', dataSource: 'development' },
    });
    expect(propRes.statusCode).toBe(201);
    const propId = propRes.json<{ id: string }>().id;

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/modules`,
      headers: { cookie: editorCookie },
      payload: { name: 'Localization Module' },
    });
    expect(modRes.statusCode).toBe(201);
    const modId = modRes.json<{ id: string }>().id;

    const destRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/destinations?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: {
        platform: 'web',
        variableType: 'js_variable',
        identifier: 'window.dataLayer',
        name: 'Data Layer',
      },
    });
    expect(destRes.statusCode).toBe(201);
    const destId = destRes.json<{ id: string }>().id;

    const tplRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/tracking-templates?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { name: 'Page View' },
    });
    expect(tplRes.statusCode).toBe(201);
    const tplId = tplRes.json<{ id: string }>().id;

    const pageRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages?projectId=${projectId}`,
      headers: { cookie: editorCookie },
      payload: { title: 'Integration', slug: 'audit-integration', content: '# Integration' },
    });
    expect(pageRes.statusCode).toBe(201);
    const pageId = pageRes.json<{ id: string }>().id;

    const updates: { url: string; payload: Record<string, string> }[] = [
      { url: `/api/properties/${propId}`, payload: { name: 'page_language_v2' } },
      { url: `/api/modules/${modId}`, payload: { name: 'Localization Module v2' } },
      { url: `/api/destinations/${destId}`, payload: { name: 'Data Layer v2' } },
      { url: `/api/tracking-templates/${tplId}`, payload: { name: 'Page View v2' } },
      { url: `/api/free-pages/${pageId}`, payload: { title: 'Integration v2' } },
    ];
    for (const update of updates) {
      const res = await app.inject({
        method: 'PATCH',
        url: update.url,
        headers: { cookie: editorCookie },
        payload: update.payload,
      });
      expect(res.statusCode).toBe(200);
    }

    // Freshly created entities with no references delete cleanly — the
    // ADR-0025 referential blockers only fire when trackings, modules or
    // child properties still point at the row.
    const deleteUrls = [
      `/api/properties/${propId}`,
      `/api/modules/${modId}`,
      `/api/destinations/${destId}`,
      `/api/tracking-templates/${tplId}`,
      `/api/free-pages/${pageId}`,
    ];
    for (const url of deleteUrls) {
      const res = await app.inject({ method: 'DELETE', url, headers: { cookie: editorCookie } });
      expect(res.statusCode).toBe(200);
    }

    const logs = await auditLogRepo.listLogsForProject(projectId, 500);
    const expectAuditEntry = (action: string, entityId: string, entityType: string): void => {
      const entry = logs.find((l) => l.action === action && l.entityId === entityId);
      expect(entry).toBeDefined();
      expect(entry?.entityType).toBe(entityType);
      expect(entry?.projectId).toBe(projectId);
      expect(entry?.companyId).toBe(companyId);
      expect(entry?.actorId).toBe('user-editor');
    };
    expectAuditEntry('property.updated', propId, 'property');
    expectAuditEntry('module.updated', modId, 'module');
    expectAuditEntry('destination.updated', destId, 'destination');
    expectAuditEntry('tracking_template.updated', tplId, 'tracking_template');
    expectAuditEntry('free_page.updated', pageId, 'free_page');
    expectAuditEntry('property.deleted', propId, 'property');
    expectAuditEntry('module.deleted', modId, 'module');
    expectAuditEntry('destination.deleted', destId, 'destination');
    expectAuditEntry('tracking_template.deleted', tplId, 'tracking_template');
    expectAuditEntry('free_page.deleted', pageId, 'free_page');
  });

  it('appends company-level audit entries for every catalogue entity update and delete (REQ-SEC-006)', async () => {
    // Catalogue scope requires company.manage_catalogue — an admin company
    // role the project-only editor lacks. The entries must carry a null
    // project: audit_logs.project_id is nullable and the company-level auth
    // events (login, invitation, ...) already write null the same way.
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/properties`,
      headers: { cookie: adminCookie },
      payload: { name: 'catalogue_page_language', type: 'string', dataSource: 'development' },
    });
    expect(propRes.statusCode).toBe(201);
    const propId = propRes.json<{ id: string }>().id;

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/modules`,
      headers: { cookie: adminCookie },
      payload: { name: 'Catalogue Module' },
    });
    expect(modRes.statusCode).toBe(201);
    const modId = modRes.json<{ id: string }>().id;

    const destRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/destinations`,
      headers: { cookie: adminCookie },
      payload: {
        platform: 'web',
        variableType: 'js_variable',
        identifier: 'window.dataLayer',
        name: 'Catalogue Data Layer',
      },
    });
    expect(destRes.statusCode).toBe(201);
    const destId = destRes.json<{ id: string }>().id;

    const tplRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/tracking-templates`,
      headers: { cookie: adminCookie },
      payload: { name: 'Catalogue Page View' },
    });
    expect(tplRes.statusCode).toBe(201);
    const tplId = tplRes.json<{ id: string }>().id;

    const pageRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/free-pages`,
      headers: { cookie: adminCookie },
      payload: {
        title: 'Catalogue Integration',
        slug: 'catalogue-integration',
        content: '# Catalogue',
      },
    });
    expect(pageRes.statusCode).toBe(201);
    const pageId = pageRes.json<{ id: string }>().id;

    const updates: { url: string; payload: Record<string, string> }[] = [
      { url: `/api/properties/${propId}`, payload: { name: 'catalogue_page_language_v2' } },
      { url: `/api/modules/${modId}`, payload: { name: 'Catalogue Module v2' } },
      { url: `/api/destinations/${destId}`, payload: { name: 'Catalogue Data Layer v2' } },
      { url: `/api/tracking-templates/${tplId}`, payload: { name: 'Catalogue Page View v2' } },
      { url: `/api/free-pages/${pageId}`, payload: { title: 'Catalogue Integration v2' } },
    ];
    for (const update of updates) {
      const res = await app.inject({
        method: 'PATCH',
        url: update.url,
        headers: { cookie: adminCookie },
        payload: update.payload,
      });
      expect(res.statusCode).toBe(200);
    }

    const deleteUrls = [
      `/api/properties/${propId}`,
      `/api/modules/${modId}`,
      `/api/destinations/${destId}`,
      `/api/tracking-templates/${tplId}`,
      `/api/free-pages/${pageId}`,
    ];
    for (const url of deleteUrls) {
      const res = await app.inject({ method: 'DELETE', url, headers: { cookie: adminCookie } });
      expect(res.statusCode).toBe(200);
    }

    const logs = await auditLogRepo.listLogsForCompany(companyId, 500);
    const expectCatalogueEntry = (action: string, entityId: string): void => {
      const entry = logs.find((l) => l.action === action && l.entityId === entityId);
      expect(entry).toBeDefined();
      expect(entry?.projectId).toBeNull();
      expect(entry?.companyId).toBe(companyId);
      expect(entry?.actorId).toBe('user-admin');
    };
    expectCatalogueEntry('property.updated', propId);
    expectCatalogueEntry('module.updated', modId);
    expectCatalogueEntry('destination.updated', destId);
    expectCatalogueEntry('tracking_template.updated', tplId);
    expectCatalogueEntry('free_page.updated', pageId);
    expectCatalogueEntry('property.deleted', propId);
    expectCatalogueEntry('module.deleted', modId);
    expectCatalogueEntry('destination.deleted', destId);
    expectCatalogueEntry('tracking_template.deleted', tplId);
    expectCatalogueEntry('free_page.deleted', pageId);
  });

  it('rejects an unauthenticated project-level property create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      payload: { name: 'page_language' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a project-level property create with an invalid name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: '', type: 'string' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION');
  });

  it('rejects a project-level module create with an invalid name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/modules`,
      headers: { cookie: editorCookie },
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('VALIDATION');
  });

  it('returns 404 for a project-level create on an unknown project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects/proj-does-not-exist/properties',
      headers: { cookie: editorCookie },
      payload: { name: 'page_language' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects a project-level create for a project the editor has no grant on (REQ-SEC-018)', async () => {
    // The editor's grant covers `projectId` only; `otherProjectId` belongs to
    // the same company, so this proves the project — not just the company —
    // is the authorization boundary for these routes.
    const propRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${otherProjectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: 'page_language' },
    });
    expect(propRes.statusCode).toBe(403);

    const modRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${otherProjectId}/modules`,
      headers: { cookie: editorCookie },
      payload: { name: 'Foreign Module' },
    });
    expect(modRes.statusCode).toBe(403);
  });

  it('reports unpublished changes and previews the diff before publishing (M1.17, REQ-VER-002, REQ-VER-005)', async () => {
    // An empty project with no publication has nothing to publish yet.
    const cleanIndicator = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/unpublished-changes`,
      headers: { cookie: editorCookie },
    });
    expect(cleanIndicator.statusCode).toBe(200);
    expect(cleanIndicator.json()).toEqual({ hasUnpublishedChanges: false, changedEntityCount: 0 });

    // A draft edit makes the indicator true and names the change in the diff.
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: editorCookie },
      payload: { name: 'page_language' },
    });
    expect(createRes.statusCode).toBe(201);

    const dirtyIndicator = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/unpublished-changes`,
      headers: { cookie: editorCookie },
    });
    expect(dirtyIndicator.statusCode).toBe(200);
    expect(dirtyIndicator.json()).toEqual({ hasUnpublishedChanges: true, changedEntityCount: 1 });

    const diffRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/preview-diff`,
      headers: { cookie: editorCookie },
    });
    expect(diffRes.statusCode).toBe(200);
    const diff = diffRes.json<{
      changelog: { type: string; entityType: string; entityId: string; name: string }[];
    }>();
    expect(diff.changelog).toHaveLength(1);
    expect(diff.changelog[0]).toMatchObject({
      type: 'added',
      entityType: 'property',
      name: 'page_language',
    });
    expect(typeof diff.changelog[0]?.entityId).toBe('string');
  });

  it('clears the indicator and the diff once the draft is published (M1.17, REQ-VER-001)', async () => {
    const publishRes = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/projects/${projectId}/versions`,
      headers: { cookie: editorCookie },
      payload: { title: 'First release' },
    });
    expect(publishRes.statusCode).toBe(201);
    const published = publishRes.json<{ versionId: string; versionNumber: number }>();
    expect(published.versionNumber).toBe(1);
    expect(typeof published.versionId).toBe('string');

    const indicator = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/unpublished-changes`,
      headers: { cookie: editorCookie },
    });
    expect(indicator.statusCode).toBe(200);
    expect(indicator.json()).toEqual({ hasUnpublishedChanges: false, changedEntityCount: 0 });

    const diffRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/preview-diff`,
      headers: { cookie: editorCookie },
    });
    expect(diffRes.statusCode).toBe(200);
    expect(diffRes.json()).toEqual({ changelog: [] });
  });

  it('rejects the publication preview and publish for a mismatched company scope', async () => {
    // The company in the path is part of the command's address: a project
    // fetched under a foreign company id is refused, not silently emptied.
    const diffRes = await app.inject({
      method: 'GET',
      url: `/api/companies/comp-foreign/projects/${projectId}/versions/preview-diff`,
      headers: { cookie: editorCookie },
    });
    expect(diffRes.statusCode).toBe(403);

    const indicatorRes = await app.inject({
      method: 'GET',
      url: `/api/companies/comp-foreign/projects/${projectId}/versions/unpublished-changes`,
      headers: { cookie: editorCookie },
    });
    expect(indicatorRes.statusCode).toBe(403);

    const publishRes = await app.inject({
      method: 'POST',
      url: `/api/companies/comp-foreign/projects/${projectId}/versions`,
      headers: { cookie: editorCookie },
      payload: { title: 'Foreign scope' },
    });
    expect(publishRes.statusCode).toBe(403);
  });

  it('rejects an unauthenticated publication preview and indicator', async () => {
    const diffRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/preview-diff`,
    });
    expect(diffRes.statusCode).toBe(401);

    const indicatorRes = await app.inject({
      method: 'GET',
      url: `/api/companies/${companyId}/projects/${projectId}/versions/unpublished-changes`,
    });
    expect(indicatorRes.statusCode).toBe(401);
  });

  it('issues a project-scoped reader session for published content only', async () => {
    const passwordRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/shared-passwords`,
      headers: { cookie: editorCookie },
      payload: { password: 'reader-password' },
    });
    expect(passwordRes.statusCode).toBe(201);

    const verifyRes = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/shared-passwords/verify`,
      payload: { password: 'reader-password' },
    });
    expect(verifyRes.statusCode).toBe(200);
    const verified = verifyRes.json<{ verified: boolean; sharedPasswordId: string }>();
    expect(verified.verified).toBe(true);
    expect(verified.sharedPasswordId).toMatch(/.+/);
    const readerCookie = String(verifyRes.headers['set-cookie'] ?? '').split(';')[0] ?? '';
    expect(readerCookie).toMatch(/^dxdoc_session=.+/);

    await connection.kysely
      .insertInto('free_pages')
      .values({
        id: 'non-publishable-reader-page',
        company_id: companyId,
        project_id: projectId,
        title: 'Internal credentials',
        slug: 'internal-credentials',
        content: 'do-not-release-this-content',
        // Direct kysely insert: the column is integer, better-sqlite3 cannot bind booleans.
        publishable: 0,
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const published = await app.inject({
      method: 'POST',
      url: `/api/companies/${companyId}/projects/${projectId}/versions`,
      headers: { cookie: editorCookie },
      payload: { title: 'Reader release' },
    });
    expect(published.statusCode).toBe(201);

    const reader = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/reader`,
      headers: { cookie: readerCookie },
    });
    expect(reader.statusCode).toBe(200);
    const readerBody = reader.json<{
      title: string;
      snapshot: { freePages: { content: string }[] };
    }>();
    expect(readerBody.title).toBe('Reader release');
    expect(readerBody.snapshot.freePages).toEqual([]);
    expect(reader.body).not.toContain('do-not-release-this-content');

    const otherProject = await app.inject({
      method: 'GET',
      url: `/api/projects/${otherProjectId}/reader`,
      headers: { cookie: readerCookie },
    });
    expect(otherProject.statusCode).toBe(401);

    const mutation = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/properties`,
      headers: { cookie: readerCookie },
      payload: { name: 'blocked' },
    });
    expect(mutation.statusCode).toBe(401);

    const token = readerCookie.split('=')[1] ?? '';
    await connection.kysely
      .updateTable('sessions')
      .set({ expires_at: '2000-01-01T00:00:00.000Z' })
      .where('token_hash', '=', createHash('sha256').update(token).digest('hex'))
      .execute();
    const expired = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}/reader`,
      headers: { cookie: readerCookie },
    });
    expect(expired.statusCode).toBe(401);
  });
});

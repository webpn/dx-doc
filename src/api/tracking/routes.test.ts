import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { PermissionService } from '@project/application/auth/permissions';
import { SessionService } from '@project/application/auth/session-service';
import { TrackingService } from '@project/application/tracking/tracking-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
import { SqliteSessionRepository } from '@project/infrastructure/persistence/sqlite-session-repository';
import {
  SqliteDestinationRepository,
  SqliteFreePageRepository,
  SqliteModuleRepository,
  SqliteNavigationEventRepository,
  SqlitePropertyRepository,
  SqliteTrackingRepository,
  SqliteTrackingTemplateRepository,
} from '@project/infrastructure/persistence/sqlite-tracking-repositories';
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
  let sessionTokenVal: string;
  const companyId = 'comp-api-test';
  const projectId = 'proj-api-test';

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
    const sessionRepo = new SqliteSessionRepository(connection.kysely);
    sessions = new SessionService(sessionRepo, TTL_MS);
    auth = new AuthService(accounts, hasher, sessions);
    const permissions = new PermissionService(accounts);

    const projectRepo = new SqliteProjectRepository(connection.kysely);
    const propRepo = new SqlitePropertyRepository(connection.kysely);
    const modRepo = new SqliteModuleRepository(connection.kysely);
    const destRepo = new SqliteDestinationRepository(connection.kysely);
    const navRepo = new SqliteNavigationEventRepository(connection.kysely);
    const trkRepo = new SqliteTrackingRepository(connection.kysely);
    const tplRepo = new SqliteTrackingTemplateRepository(connection.kysely);
    const freePageRepo = new SqliteFreePageRepository(connection.kysely);

    const trackingService = new TrackingService(
      propRepo,
      modRepo,
      destRepo,
      navRepo,
      trkRepo,
      tplRepo,
      freePageRepo,
      projectRepo,
      permissions,
    );

    app = Fastify();
    await app.register(cookie);

    const cookieName = 'dxdoc_session';
    registerAuthRoutes(app, {
      auth,
      sessions,
      cookieName,
      sessionTtlMs: TTL_MS,
    });

    registerTrackingRoutes(app, {
      trackingService,
      sessions,
      cookieName,
    });

    await app.ready();

    // Login to obtain cookie & session token for Bearer auth
    const loginRes = await auth.login(companyId, 'editor@api.com', PASSWORD);
    if (!loginRes.ok) throw new Error('Login failed');
    sessionTokenVal = loginRes.session.token;
    editorCookie = `${cookieName}=${sessionTokenVal}`;
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
});

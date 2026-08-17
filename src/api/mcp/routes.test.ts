import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { PermissionService } from '@project/application/auth/permissions';
import { SessionService } from '@project/application/auth/session-service';
import { PageService } from '@project/application/page/page-service';
import { ProjectService } from '@project/application/project/project-service';
import { TrackingService } from '@project/application/tracking/tracking-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqlitePageRepository } from '@project/infrastructure/persistence/sqlite-page-repository';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
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
} from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';
import { registerAuthRoutes } from '../auth/routes';

import { registerMcpRoutes } from './routes';
import { McpServerHandler, MCP_TOOLS } from './server';

const TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD = 'correct-horse-battery-staple';

function t(): string {
  return new Date().toISOString();
}

describe('MCP Server (M1.3, REQ-API-003, REQ-API-004, REQ-API-006, D37, D38)', () => {
  let dir: string;
  let connection: Connection;
  let app: FastifyInstance;
  let auth: AuthService;
  let sessions: SessionService;
  let token: string;
  const companyId = 'comp-mcp-test';
  const projectId = 'proj-mcp-test';

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-mcp-test-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);

    const nowIso = t();
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'MCP Test Corp',
        slug: 'mcp-corp',
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
    const editorUserId = 'user-mcp-editor';

    await connection.kysely
      .insertInto('users')
      .values({
        id: editorUserId,
        company_id: companyId,
        role_id: editorRoleId,
        email: 'mcp-editor@test.com',
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
        name: 'MCP Test Project',
        slug: 'mcp-proj',
        platform: 'web',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();

    await connection.kysely
      .insertInto('project_grants')
      .values({
        id: 'grant-mcp-editor',
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

    const projectService = new ProjectService(projectRepo, permissions);
    const pageService = new PageService(pageRepo, projectRepo, permissions);
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
      projectRepo,
      permissions,
    );

    const mcpHandler = new McpServerHandler(projectService, pageService, trackingService);

    app = Fastify();
    await app.register(cookie);

    const cookieName = 'dxdoc_session';
    registerAuthRoutes(app, {
      auth,
      sessions,
      cookieName,
      sessionTtlMs: TTL_MS,
    });

    registerMcpRoutes(app, {
      mcpHandler,
      sessions,
      cookieName,
    });

    await app.ready();

    const loginRes = await auth.login(companyId, 'mcp-editor@test.com', PASSWORD);
    if (!loginRes.ok) throw new Error('Login failed');
    token = loginRes.session.token;
  });

  afterEach(async () => {
    await app.close();
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('handles MCP initialize and tools/list', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json<{ result: { tools: typeof MCP_TOOLS } }>();
    expect(json.result.tools).toHaveLength(MCP_TOOLS.length);

    // Verify publication / delete tools are ABSENT (REQ-API-004)
    const toolNames = json.result.tools.map((t) => t.name);
    expect(toolNames).not.toContain('publish_version');
    expect(toolNames).not.toContain('delete_user');
    expect(toolNames).not.toContain('change_permissions');
  });

  it('exposes naming guidelines as MCP resource (REQ-API-006)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: { uri: 'dxdoc://guidelines/naming' },
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json<{ result: { contents: { uri: string; text: string }[] } }>();
    expect(json.result.contents[0]?.uri).toBe('dxdoc://guidelines/naming');
    expect(json.result.contents[0]?.text).toContain('Naming and Documentation Guidelines');
  });

  it('executes MCP write and read tools in draft (REQ-API-003, REQ-API-004)', async () => {
    // 1. Create property via MCP tool
    const writePropRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'create_property',
          arguments: {
            companyId,
            projectId,
            name: 'mcp_user_id',
            businessLabel: 'MCP User ID',
            type: 'string',
          },
        },
      },
    });

    expect(writePropRes.statusCode).toBe(200);
    const writeJson = writePropRes.json<{
      result: { content: { type: string; text: string }[] };
    }>();
    const propCreated = JSON.parse(writeJson.result.content[0]?.text ?? '{}') as {
      propertyId: string;
    };
    expect(propCreated.propertyId).toBeDefined();

    // 2. Read back property via MCP tool
    const readPropRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'get_property',
          arguments: {
            propertyId: propCreated.propertyId,
          },
        },
      },
    });

    expect(readPropRes.statusCode).toBe(200);
    const readJson = readPropRes.json<{ result: { content: { type: string; text: string }[] } }>();
    const propData = JSON.parse(readJson.result.content[0]?.text ?? '{}') as { name: string };
    expect(propData.name).toBe('mcp_user_id');
  });
});

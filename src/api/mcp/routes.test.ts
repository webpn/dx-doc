import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { PermissionService } from '@project/application/auth/permissions';
import { ServiceTokenService } from '@project/application/auth/service-token-service';
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
    const auditLogRepo = new SqliteAuditLogRepository(connection.kysely);
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

    const projectService = new ProjectService(projectRepo, permissions, accounts);
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
      versionRepo,
      sharedPasswordRepo,
      auditLogRepo,
      hasher,
      projectRepo,
      pageRepo,
      permissions,
    );

    const mcpHandler = new McpServerHandler(
      projectService,
      pageService,
      trackingService,
      auditLogRepo,
      accounts,
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

    registerMcpRoutes(app, {
      mcpHandler,
      sessions,
      serviceTokens,
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

  it('allows an agent to construct a complete tracking via MCP tools (M1.3, M1.12, REQ-API-003, REQ-API-004)', async () => {
    // Full workflow: page -> module -> property -> tracking -> specific value -> destination mapping -> flow -> trigger
    // All read back to verify the chain

    // 1. Create a page
    const pageRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'create_page',
          arguments: {
            projectId,
            name: 'Product Page',
            slug: 'product-page',
          },
        },
      },
    });
    expect(pageRes.statusCode).toBe(200);
    const pageData = JSON.parse(
      pageRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { pageId: string };
    const pageId = pageData.pageId;
    expect(pageId).toBeDefined();

    // 2. Create a property
    const propRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'create_property',
          arguments: {
            companyId,
            projectId,
            name: 'product_id',
            type: 'string',
          },
        },
      },
    });
    expect(propRes.statusCode).toBe(200);
    const propData = JSON.parse(
      propRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { propertyId: string };
    const propertyId = propData.propertyId;

    // 3. Create a module with the property
    const modRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'create_module',
          arguments: {
            companyId,
            projectId,
            name: 'Product Module',
            propertyIds: [propertyId],
          },
        },
      },
    });
    expect(modRes.statusCode).toBe(200);
    const modData = JSON.parse(
      modRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { moduleId: string };
    const moduleId = modData.moduleId;

    // 4. Create a destination
    const destRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'create_destination',
          arguments: {
            companyId,
            projectId,
            platform: 'GA4',
            variableType: 'event_parameter',
            identifier: 'product_id',
            name: 'GA4 Product ID',
          },
        },
      },
    });
    expect(destRes.statusCode).toBe(200);
    const destData = JSON.parse(
      destRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { destinationId: string };
    const destinationId = destData.destinationId;

    // 5. Create a navigation event (required for trackings)
    const navRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'create_navigation_event',
          arguments: {
            projectId,
            name: 'Product View',
          },
        },
      },
    });
    expect(navRes.statusCode).toBe(200);
    const navData = JSON.parse(
      navRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { eventId: string };
    const navigationEventId = navData.eventId;

    // 6. Create a tracking with the navigation event
    const trkRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'create_tracking',
          arguments: {
            projectId,
            pageId,
            navigationEventId,
            name: 'Product Viewed',
            slug: 'product-viewed',
          },
        },
      },
    });
    expect(trkRes.statusCode).toBe(200);
    const trkData = JSON.parse(
      trkRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { trackingId: string };
    const trackingId = trkData.trackingId;

    // 7. Apply module to tracking
    const applyRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'apply_module_to_tracking',
          arguments: {
            trackingId,
            moduleId,
          },
        },
      },
    });
    expect(applyRes.statusCode).toBe(200);

    // 8. Set specific value for the property
    const specValRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'set_specific_value',
          arguments: {
            trackingId,
            propertyId,
            value: 'SKU_[sku]',
          },
        },
      },
    });
    expect(specValRes.statusCode).toBe(200);

    // 9. Set property destinations
    const setPropDestRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'set_property_destinations',
          arguments: {
            propertyId,
            destinationIds: [destinationId],
          },
        },
      },
    });
    expect(setPropDestRes.statusCode).toBe(200);

    // 10. Create a flow
    const flowRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: {
          name: 'create_flow',
          arguments: {
            projectId,
            name: 'Product Flow',
            slug: 'product-flow',
            description: 'Main product tracking flow',
          },
        },
      },
    });
    expect(flowRes.statusCode).toBe(200);
    const flowData = JSON.parse(
      flowRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { flowId: string };
    const flowId = flowData.flowId;

    // 11. Create a trigger
    const triggerRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 15,
        method: 'tools/call',
        params: {
          name: 'create_trigger',
          arguments: {
            projectId,
            name: 'Product View Trigger',
            type: 'tracking',
            trackingId,
          },
        },
      },
    });
    expect(triggerRes.statusCode).toBe(200);
    const triggerData = JSON.parse(
      triggerRes.json<{ result: { content: { type: string; text: string }[] } }>().result.content[0]
        ?.text ?? '{}',
    ) as { triggerId: string };
    const triggerId = triggerData.triggerId;

    // 12. Verify reads: list and get operations
    const listPagesRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 16,
        method: 'tools/call',
        params: {
          name: 'get_page_structure',
          arguments: { projectId },
        },
      },
    });
    expect(listPagesRes.statusCode).toBe(200);
    const pagesData = JSON.parse(
      listPagesRes.json<{ result: { content: { type: string; text: string }[] } }>().result
        .content[0]?.text ?? '[]',
    ) as { id: string; name: string }[];
    expect(pagesData.some((p) => p.id === pageId)).toBe(true);

    const listNavEventsRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 17,
        method: 'tools/call',
        params: {
          name: 'list_navigation_events',
          arguments: { projectId },
        },
      },
    });
    expect(listNavEventsRes.statusCode).toBe(200);
    const navEventsData = JSON.parse(
      listNavEventsRes.json<{ result: { content: { type: string; text: string }[] } }>().result
        .content[0]?.text ?? '[]',
    ) as { id: string }[];
    expect(navEventsData.some((e) => e.id === navigationEventId)).toBe(true);

    const getNavEventRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 18,
        method: 'tools/call',
        params: {
          name: 'get_navigation_event',
          arguments: { navigationEventId },
        },
      },
    });
    expect(getNavEventRes.statusCode).toBe(200);

    const getDestRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 19,
        method: 'tools/call',
        params: {
          name: 'get_destination',
          arguments: { destinationId },
        },
      },
    });
    expect(getDestRes.statusCode).toBe(200);

    const getPropDestRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'get_property_destinations',
          arguments: { propertyId },
        },
      },
    });
    expect(getPropDestRes.statusCode).toBe(200);

    const getFlowRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'get_flow',
          arguments: { flowId },
        },
      },
    });
    expect(getFlowRes.statusCode).toBe(200);

    const listFlowsRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'list_flows',
          arguments: { projectId },
        },
      },
    });
    expect(listFlowsRes.statusCode).toBe(200);

    const getTriggerRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 23,
        method: 'tools/call',
        params: {
          name: 'get_trigger',
          arguments: { triggerId },
        },
      },
    });
    expect(getTriggerRes.statusCode).toBe(200);

    const listTriggersRes = await app.inject({
      method: 'POST',
      url: '/api/mcp',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jsonrpc: '2.0',
        id: 24,
        method: 'tools/call',
        params: {
          name: 'list_triggers',
          arguments: { projectId },
        },
      },
    });
    expect(listTriggersRes.statusCode).toBe(200);
    const triggersData = JSON.parse(
      listTriggersRes.json<{ result: { content: { type: string; text: string }[] } }>().result
        .content[0]?.text ?? '[]',
    ) as { id: string }[];
    expect(triggersData.some((t) => t.id === triggerId)).toBe(true);
  });
});

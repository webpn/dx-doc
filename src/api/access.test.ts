import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { GrantService } from '@project/application/auth/grant-service';
import { LifecycleService } from '@project/application/auth/lifecycle-service';
import { PermissionService } from '@project/application/auth/permissions';
import { ServiceTokenService } from '@project/application/auth/service-token-service';
import { SessionService } from '@project/application/auth/session-service';
import { CompanyService } from '@project/application/company/company-service';
import { PageService } from '@project/application/page/page-service';
import type { EmailMessage, EmailSender } from '@project/application/ports/email-sender';
import { ProjectService } from '@project/application/project/project-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
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
import { SqliteAuditLogRepository } from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../tests/support/apply-migrations';

import { registerAccessRoutes } from './access/routes';
import { registerAuthRoutes } from './auth/routes';
import { registerCompanyRoutes } from './company/routes';
import { registerLifecycleRoutes } from './lifecycle/routes';
import { registerPageRoutes } from './pages/routes';
import { registerProjectRoutes } from './projects/routes';
import { registerTokenRoutes } from './tokens/routes';

const TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD = 'correct-horse-battery-staple';

function t(): string {
  return new Date().toISOString();
}

class CapturingEmail implements EmailSender {
  sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    await Promise.resolve();
  }
}

const RESET_TTL_MS = 60 * 60 * 1000;
const APP_URL = 'https://dx.test';

describe('Access administration and service tokens over HTTP (M1.12 first half)', () => {
  let dir: string;
  let connection: Connection;
  let app: FastifyInstance;
  let accounts: SqliteAccountRepository;
  let email: CapturingEmail;
  let viewerId: string;
  let projects: ProjectService;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-access-routes-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);

    const companyId = 'c1';
    await connection.kysely
      .insertInto('company')
      .values({ id: companyId, name: 'Acme', slug: 'acme', created_at: t(), updated_at: t() })
      .execute();
    for (const name of ['admin', 'project_manager', 'editor', 'viewer']) {
      await connection.kysely
        .insertInto('roles')
        .values({
          id: `role-${name}`,
          company_id: companyId,
          name,
          created_at: t(),
          updated_at: t(),
        })
        .execute();
    }

    const hasher = new BcryptPasswordHasher();
    async function addUser(id: string, emailAddress: string, roleId: string | null): Promise<void> {
      await connection.kysely
        .insertInto('users')
        .values({
          id,
          company_id: companyId,
          email: emailAddress,
          password_hash: await hasher.hash(PASSWORD),
          role_id: roleId,
          created_at: t(),
          updated_at: t(),
        })
        .execute();
    }
    await addUser('u-admin', 'admin@acme.test', 'role-admin');
    await addUser('u-viewer', 'viewer@acme.test', 'role-viewer');
    viewerId = 'u-viewer';

    accounts = new SqliteAccountRepository(connection.kysely);
    const auditLogRepo = new SqliteAuditLogRepository(connection.kysely);
    const sessions = new SessionService(
      new SqliteSessionRepository(connection.kysely),
      TTL_MS,
      auditLogRepo,
    );
    const serviceTokens = new ServiceTokenService(
      new SqliteServiceTokenRepository(connection.kysely),
      accounts,
    );
    const permissions = new PermissionService(accounts);
    const auth = new AuthService(accounts, hasher, sessions, auditLogRepo);
    email = new CapturingEmail();
    const lifecycle = new LifecycleService(
      accounts,
      hasher,
      new SqlitePasswordResetTokenRepository(connection.kysely),
      new SqliteSessionRepository(connection.kysely),
      permissions,
      email,
      APP_URL,
      RESET_TTL_MS,
      auditLogRepo,
    );
    const companyService = new CompanyService(
      accounts,
      new SqliteCompanyRepository(connection.kysely),
      permissions,
    );
    const projectRepo = new SqliteProjectRepository(connection.kysely);
    projects = new ProjectService(projectRepo, permissions, accounts);
    const grants = new GrantService(accounts, projectRepo, permissions, auditLogRepo);
    const pages = new PageService(
      new SqlitePageRepository(connection.kysely),
      projectRepo,
      permissions,
    );

    app = Fastify();
    await app.register(cookie);
    registerAuthRoutes(app, {
      auth,
      sessions,
      accounts,
      cookieName: 'dxdoc_session',
      sessionTtlMs: TTL_MS,
    });
    registerProjectRoutes(app, { projects, sessions, serviceTokens, cookieName: 'dxdoc_session' });
    registerPageRoutes(app, { pages, sessions, serviceTokens, cookieName: 'dxdoc_session' });
    registerAccessRoutes(app, { grants, sessions, serviceTokens, cookieName: 'dxdoc_session' });
    registerLifecycleRoutes(app, {
      lifecycle,
      sessions,
      serviceTokens,
      cookieName: 'dxdoc_session',
    });
    registerCompanyRoutes(app, {
      companies: companyService,
      sessions,
      serviceTokens,
      cookieName: 'dxdoc_session',
    });
    registerTokenRoutes(app, {
      tokens: serviceTokens,
      sessions,
      serviceTokens,
      cookieName: 'dxdoc_session',
    });
  });

  afterEach(async () => {
    await app.close();
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  async function loginToken(
    emailAddress: string,
    companyId: string | null = 'c1',
  ): Promise<string> {
    const payload: Record<string, unknown> = { email: emailAddress, password: PASSWORD };
    if (companyId !== null) {
      payload.companyId = companyId;
    }
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload,
    });
    return (
      String(res.headers['set-cookie'] ?? '')
        .split(';')[0]
        ?.split('=')[1] ?? ''
    );
  }

  async function createProject(adminCookie: string, name: string, slug: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { companyId: 'c1', name, slug, platform: 'web' },
    });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: string }>().id;
  }

  it('a newly created project is readable by its creator with no manual database write (REQ-SEC-003 exit)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const projectId = await createProject(adminCookie, 'Web', 'web');

    const got = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(got.statusCode).toBe(200);
    expect(got.json<{ name: string }>().name).toBe('Web');

    // The creator's grant row exists in the database (auto-granted), so the
    // permission model is not closed anymore.
    const rows = await connection.kysely
      .selectFrom('project_grants')
      .selectAll()
      .where('project_id', '=', projectId)
      .execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe('u-admin');
  });

  it('an Admin grants a Viewer on one project and that Viewer reaches it and no other (REQ-SEC-003 exit)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const viewerCookie = await loginToken('viewer@acme.test');
    const projectA = await createProject(adminCookie, 'Alpha', 'alpha');
    const projectB = await createProject(adminCookie, 'Beta', 'beta');

    // Before the grant: the Viewer reaches neither.
    const beforeA = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectA}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    const beforeB = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectB}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    expect(beforeA.statusCode).toBe(403);
    expect(beforeB.statusCode).toBe(403);

    // Admin grants the Viewer on project A only.
    const grant = await app.inject({
      method: 'PUT',
      url: `/api/projects/${projectA}/grants/${viewerId}`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { roleName: 'viewer' },
    });
    expect(grant.statusCode).toBe(200);

    // The Viewer reaches exactly project A.
    const afterA = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectA}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    const afterB = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectB}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    expect(afterA.statusCode).toBe(200);
    expect(afterB.statusCode).toBe(403);

    // Revoke: the Viewer loses reach within one request.
    const revoke = await app.inject({
      method: 'DELETE',
      url: `/api/projects/${projectA}/grants/${viewerId}`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(revoke.statusCode).toBe(200);
    const afterRevoke = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectA}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    expect(afterRevoke.statusCode).toBe(403);
  });

  it('grant administration requires project.manage_access (an Editor cannot grant)', async () => {
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u-editor',
        company_id: 'c1',
        email: 'editor@acme.test',
        password_hash: await new BcryptPasswordHasher().hash(PASSWORD),
        role_id: 'role-editor',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    const adminCookie = await loginToken('admin@acme.test');
    const editorCookie = await loginToken('editor@acme.test');
    const projectId = await createProject(adminCookie, 'Web', 'web');

    const attempt = await app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/grants/${viewerId}`,
      headers: { cookie: `dxdoc_session=${editorCookie}` },
      payload: { roleName: 'viewer' },
    });
    expect(attempt.statusCode).toBe(403);
  });

  it('invites a user with no role and no grants (REQ-SEC-013)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/invite',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { companyId: 'c1', email: 'newbie@acme.test' },
    });
    expect(res.statusCode).toBe(201);
    const userId = res.json<{ userId: string }>().userId;
    const user = await accounts.getUserById(userId);
    expect(user?.roleId).toBeNull();
    expect(await accounts.listGrantsForUser(userId)).toHaveLength(0);
  });

  it('a deactivated user session stops working within one request (REQ-SEC-013)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const viewerCookie = await loginToken('viewer@acme.test');
    const projectId = await createProject(adminCookie, 'Web', 'web');
    // Grant the Viewer so the session is demonstrably live before deactivation.
    await app.inject({
      method: 'PUT',
      url: `/api/projects/${projectId}/grants/${viewerId}`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { roleName: 'viewer' },
    });
    const before = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    expect(before.statusCode).toBe(200);

    const deactivate = await app.inject({
      method: 'POST',
      url: `/api/users/${viewerId}/deactivate`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { companyId: 'c1' },
    });
    expect(deactivate.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
    });
    expect(after.statusCode).toBe(401);
  });

  it('the instance-admin flag is set and revoked through the API (REQ-SEC-014)', async () => {
    // A company-less instance administrator holds the capability.
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u-sysadmin',
        company_id: null,
        email: 'root@dx.test',
        password_hash: await new BcryptPasswordHasher().hash(PASSWORD),
        role_id: null,
        instance_admin: 1,
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    const sysCookie = await loginToken('root@dx.test', null);

    const set = await app.inject({
      method: 'POST',
      url: `/api/users/${viewerId}/instance-admin`,
      headers: { cookie: `dxdoc_session=${sysCookie}` },
      payload: { value: true },
    });
    expect(set.statusCode).toBe(200);
    expect((await accounts.getUserById(viewerId))?.instanceAdmin).toBe(true);

    const revoke = await app.inject({
      method: 'POST',
      url: `/api/users/${viewerId}/instance-admin`,
      headers: { cookie: `dxdoc_session=${sysCookie}` },
      payload: { value: false },
    });
    expect(revoke.statusCode).toBe(200);
    expect((await accounts.getUserById(viewerId))?.instanceAdmin).toBe(false);

    // A non-holder cannot change the flag.
    const adminCookie = await loginToken('admin@acme.test');
    const denied = await app.inject({
      method: 'POST',
      url: `/api/users/${viewerId}/instance-admin`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { value: true },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('password reset request is non-disclosing and confirm consumes a single-use token (REQ-SEC-013)', async () => {
    // Request path: uniform success whether or not the address exists.
    const known = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset/request',
      payload: { companyId: 'c1', email: 'viewer@acme.test' },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset/request',
      payload: { companyId: 'c1', email: 'nobody@acme.test' },
    });
    expect(known.statusCode).toBe(200);
    expect(unknown.statusCode).toBe(200);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('viewer@acme.test');

    // Extract the emailed token and confirm the reset.
    const match = email.sent[0]?.text.match(/token=([a-f0-9]+)/);
    const token = match?.[1];
    if (token === undefined) {
      throw new Error('reset email missing token');
    }
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset/confirm',
      payload: { token, newPassword: 'brand-new-password-123' },
    });
    expect(confirm.statusCode).toBe(200);

    // Replay is rejected: the token is single-use.
    const replay = await app.inject({
      method: 'POST',
      url: '/api/auth/password-reset/confirm',
      payload: { token, newPassword: 'another-password-123' },
    });
    expect(replay.statusCode).toBe(400);
    expect(replay.json<{ error: { code: string } }>().error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('only an instance administrator can create a company (REQ-SEC-014)', async () => {
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u-sysadmin',
        company_id: null,
        email: 'root@dx.test',
        password_hash: await new BcryptPasswordHasher().hash(PASSWORD),
        role_id: null,
        instance_admin: 1,
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const adminCookie = await loginToken('admin@acme.test');
    const denied = await app.inject({
      method: 'POST',
      url: '/api/companies',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { name: 'Beta', slug: 'beta' },
    });
    expect(denied.statusCode).toBe(403);

    const sysCookie = await loginToken('root@dx.test', null);
    const created = await app.inject({
      method: 'POST',
      url: '/api/companies',
      headers: { cookie: `dxdoc_session=${sysCookie}` },
      payload: { name: 'Beta', slug: 'beta' },
    });
    expect(created.statusCode).toBe(201);
    const companyId = created.json<{ companyId: string }>().companyId;
    const roles = await accounts.listRolesForCompany(companyId);
    expect(roles.map((role) => role.name).sort()).toEqual([
      'admin',
      'editor',
      'project_manager',
      'viewer',
    ]);
  });

  it('a company reads its own identity; a member of another company cannot (REQ-SEC-014)', async () => {
    await connection.kysely
      .insertInto('company')
      .values({ id: 'c2', name: 'Globex', slug: 'globex', created_at: t(), updated_at: t() })
      .execute();
    await connection.kysely
      .insertInto('roles')
      .values({
        id: 'role-c2-admin',
        company_id: 'c2',
        name: 'admin',
        created_at: t(),
        updated_at: t(),
      })
      .execute();
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u-c2-admin',
        company_id: 'c2',
        email: 'admin@globex.test',
        password_hash: await new BcryptPasswordHasher().hash(PASSWORD),
        role_id: 'role-c2-admin',
        created_at: t(),
        updated_at: t(),
      })
      .execute();

    const adminCookie = await loginToken('admin@acme.test');
    const own = await app.inject({
      method: 'GET',
      url: '/api/companies/c1',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(own.statusCode).toBe(200);
    expect(own.json<{ name: string }>().name).toBe('Acme');

    const otherCompanyCookie = await loginToken('admin@globex.test', 'c2');
    const crossTenant = await app.inject({
      method: 'GET',
      url: '/api/companies/c1',
      headers: { cookie: `dxdoc_session=${otherCompanyCookie}` },
    });
    expect(crossTenant.statusCode).toBe(403);
  });

  it("the company's own Admin renames it; a Viewer cannot (REQ-SEC-014)", async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const renamed = await app.inject({
      method: 'PATCH',
      url: '/api/companies/c1',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { name: 'Acme Corporation' },
    });
    expect(renamed.statusCode).toBe(200);

    const got = await app.inject({
      method: 'GET',
      url: '/api/companies/c1',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(got.json<{ name: string }>().name).toBe('Acme Corporation');

    const viewerCookie = await loginToken('viewer@acme.test');
    const denied = await app.inject({
      method: 'PATCH',
      url: '/api/companies/c1',
      headers: { cookie: `dxdoc_session=${viewerCookie}` },
      payload: { name: 'Nope' },
    });
    expect(denied.statusCode).toBe(403);
  });

  it('issues, lists and revokes service tokens; the revoked token dies within one request (REQ-API-009)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const projectId = await createProject(adminCookie, 'Web', 'web');

    const issued = await app.inject({
      method: 'POST',
      url: '/api/auth/tokens',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { name: 'import-run' },
    });
    expect(issued.statusCode).toBe(201);
    const body = issued.json<{ tokenId: string; token: string; expiresAt: string }>();
    expect(body.token).toMatch(/^[a-f0-9]{64}$/);

    // The token authenticates as its owner: the admin's project is reachable.
    const withToken = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(withToken.statusCode).toBe(200);

    // Listing shows the token but never its value.
    const listed = await app.inject({
      method: 'GET',
      url: '/api/auth/tokens',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(listed.statusCode).toBe(200);
    const listBody = listed.json<{ tokens: { id: string; name: string; active: boolean }[] }>();
    expect(listBody.tokens).toHaveLength(1);
    expect(listBody.tokens[0]).toMatchObject({ name: 'import-run', active: true });
    expect(JSON.stringify(listBody)).not.toContain(body.token);

    // Revocation kills the token within one request.
    const revoked = await app.inject({
      method: 'DELETE',
      url: `/api/auth/tokens/${body.tokenId}`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
    });
    expect(revoked.statusCode).toBe(200);
    const afterRevoke = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${body.token}` },
    });
    expect(afterRevoke.statusCode).toBe(401);
  });

  it('a service token stops working when its owner is deactivated, within one request (REQ-API-009, REQ-SEC-013)', async () => {
    const adminCookie = await loginToken('admin@acme.test');
    const projectId = await createProject(adminCookie, 'Web', 'web');
    const issued = await app.inject({
      method: 'POST',
      url: '/api/auth/tokens',
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { name: 'import-run' },
    });
    const token = issued.json<{ token: string }>().token;

    const deactivate = await app.inject({
      method: 'POST',
      url: `/api/users/u-admin/deactivate`,
      headers: { cookie: `dxdoc_session=${adminCookie}` },
      payload: { companyId: 'c1' },
    });
    expect(deactivate.statusCode).toBe(200);

    const after = await app.inject({
      method: 'GET',
      url: `/api/projects/${projectId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(after.statusCode).toBe(401);
  });
});

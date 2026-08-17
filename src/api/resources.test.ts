import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { PermissionService } from '@project/application/auth/permissions';
import { SessionService } from '@project/application/auth/session-service';
import { PageService } from '@project/application/page/page-service';
import { ProjectService } from '@project/application/project/project-service';
import type { ProjectCreateInput } from '@project/application/validation/schemas';
import { openSqliteConnection } from '@project/infrastructure/persistence/sqlite';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import { SqliteCompanyRepository } from '@project/infrastructure/persistence/sqlite-company-repository';
import { SqlitePageRepository } from '@project/infrastructure/persistence/sqlite-page-repository';
import { SqliteProjectRepository } from '@project/infrastructure/persistence/sqlite-project-repository';
import { SqliteSessionRepository } from '@project/infrastructure/persistence/sqlite-session-repository';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../tests/support/apply-migrations';

import { registerAuthRoutes } from './auth/routes';
import { registerPageRoutes } from './pages/routes';
import { registerProjectRoutes } from './projects/routes';

const TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD = 'correct-horse-battery-staple';

function t(): string {
  return new Date().toISOString();
}

describe('Project and Page REST routes (REQ-API-001)', () => {
  let dir: string;
  let db: ReturnType<typeof openSqliteConnection>;
  let app: FastifyInstance;
  let projects: ProjectService;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-crud-routes-'));
    db = openSqliteConnection(path.join(dir, 'test.sqlite'));
    applyMigrations(db);

    const companyId = 'c1';
    db.prepare(
      'INSERT INTO company (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(companyId, 'Acme', 'acme', t(), t());
    for (const name of ['admin', 'project_manager', 'editor', 'viewer']) {
      db.prepare(
        'INSERT INTO roles (id, company_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(`role-${name}`, companyId, name, t(), t());
    }

    const hasher = new BcryptPasswordHasher();
    db.prepare(
      'INSERT INTO users (id, company_id, email, password_hash, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('u1', companyId, 'admin@acme.test', await hasher.hash(PASSWORD), 'role-admin', t(), t());

    const accounts = new SqliteAccountRepository(db);
    const sessionsRepo = new SqliteSessionRepository(db);
    const sessions = new SessionService(sessionsRepo, TTL_MS);
    const auth = new AuthService(accounts, hasher, sessions);
    const permissions = new PermissionService(accounts);
    const companyRepo = new SqliteCompanyRepository(db);
    projects = new ProjectService(
      new SqliteProjectRepository(db),
      permissions,
      () => new Date(),
      () => randomUuid(),
    );
    const pages = new PageService(
      new SqlitePageRepository(db),
      new SqliteProjectRepository(db),
      permissions,
      () => new Date(),
      () => randomUuid(),
    );

    app = Fastify();
    await app.register(cookie);
    registerAuthRoutes(app, { auth, sessions, cookieName: 'dxdoc_session', sessionTtlMs: TTL_MS });
    registerProjectRoutes(app, { projects, sessions, cookieName: 'dxdoc_session' });
    registerPageRoutes(app, { pages, sessions, cookieName: 'dxdoc_session' });
    // companyRepo is wired so the create flow has a tenant; unused directly here.
    void companyRepo;
  });

  afterEach(async () => {
    await app.close();
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function loginToken(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@acme.test', password: PASSWORD, companyId: 'c1' },
    });
    return (
      String(res.headers['set-cookie'] ?? '')
        .split(';')[0]
        ?.split('=')[1] ?? ''
    );
  }

  it('rejects an invalid project identically through the HTTP API and a direct service call', async () => {
    const token = await loginToken();
    const invalid = { name: '', slug: '', platform: 'banana' };

    const http = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: { companyId: 'c1', ...invalid },
    });
    expect(http.statusCode).toBe(400);
    const httpBody = http.json<{ error: { issues: unknown[] } }>();

    const direct = await projects.create('u1', 'c1', invalid as unknown as ProjectCreateInput);

    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(direct.error.kind).toBe('validation');
      if (direct.error.kind === 'validation') {
        expect(httpBody.error.issues).toEqual(direct.error.issues);
      }
    }
  });

  it('creates a project and upserts idempotently on custom_id', async () => {
    const token = await loginToken();

    const first = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: {
        companyId: 'c1',
        name: 'Web',
        slug: 'web',
        platform: 'web',
        customId: 'legacy:web',
      },
    });
    expect(first.statusCode).toBe(201);
    const firstBody = first.json<{ id: string; created: boolean }>();
    expect(firstBody.created).toBe(true);

    const second = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: {
        companyId: 'c1',
        name: 'Renamed',
        slug: 'web',
        platform: 'web',
        customId: 'legacy:web',
      },
    });
    expect(second.statusCode).toBe(201);
    const secondBody = second.json<{ id: string; created: boolean }>();
    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.created).toBe(false);

    // Reading content requires a grant on the project (REQ-SEC-003), even for
    // the Admin who created it.
    db.prepare(
      'INSERT INTO project_grants (id, project_id, user_id, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('g-admin', firstBody.id, 'u1', 'role-admin', t(), t());

    const got = await app.inject({
      method: 'GET',
      url: `/api/projects/${firstBody.id}`,
      headers: { cookie: `dxdoc_session=${token}` },
    });
    expect(got.statusCode).toBe(200);
    expect(got.json<{ name: string }>().name).toBe('Renamed');
  });

  it('requires authentication for writes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { companyId: 'c1', name: 'Web', slug: 'web', platform: 'web' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('creates and reads a page within a project', async () => {
    const token = await loginToken();
    const project = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: { companyId: 'c1', name: 'Web', slug: 'web', platform: 'web' },
    });
    const projectId = project.json<{ id: string }>().id;
    // Grant the admin the editor role on the project so page creation is allowed.
    db.prepare(
      'INSERT INTO project_grants (id, project_id, user_id, role_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('g1', projectId, 'u1', 'role-editor', t(), t());

    const created = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/pages`,
      headers: { cookie: `dxdoc_session=${token}` },
      payload: { name: 'Home', slug: 'home' },
    });
    expect(created.statusCode).toBe(201);
    const pageId = created.json<{ id: string }>().id;

    const got = await app.inject({
      method: 'GET',
      url: `/api/pages/${pageId}`,
      headers: { cookie: `dxdoc_session=${token}` },
    });
    expect(got.statusCode).toBe(200);
    expect(got.json<{ name: string }>().name).toBe('Home');
  });
});

let counter = 0;
function randomUuid(): string {
  return 'id-' + String(++counter);
}

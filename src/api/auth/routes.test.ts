import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import cookie from '@fastify/cookie';
import { AuthService } from '@project/application/auth/auth-service';
import { SessionService } from '@project/application/auth/session-service';
import { SqliteAccountRepository } from '@project/infrastructure/persistence/sqlite-account-repository';
import {
  closeSqliteConnection,
  openSqliteConnection,
  type Connection,
} from '@project/infrastructure/persistence/sqlite-kysely';
import { SqliteSessionRepository } from '@project/infrastructure/persistence/sqlite-session-repository';
import { SqliteAuditLogRepository } from '@project/infrastructure/persistence/sqlite-tracking-repositories';
import { BcryptPasswordHasher } from '@project/infrastructure/security/bcrypt-password-hasher';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyMigrations } from '../../../tests/support/apply-migrations';

import { registerAuthRoutes } from './routes';

const TTL_MS = 8 * 60 * 60 * 1000;
const PASSWORD = 'correct-horse-battery-staple';

describe('auth routes (email + password)', () => {
  let dir: string;
  let connection: Connection;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'dxdoc-auth-'));
    connection = openSqliteConnection(path.join(dir, 'test.sqlite'));
    await applyMigrations(connection);

    const companyId = 'c1';
    await connection.kysely
      .insertInto('company')
      .values({
        id: companyId,
        name: 'Acme',
        slug: 'acme',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();

    for (const name of ['admin', 'project_manager', 'editor', 'viewer']) {
      await connection.kysely
        .insertInto('roles')
        .values({
          id: `role-${name}`,
          company_id: companyId,
          name,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        })
        .execute();
    }

    const hasher = new BcryptPasswordHasher();
    const passwordHash = await hasher.hash(PASSWORD);
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'u1',
        company_id: companyId,
        email: 'u@acme.test',
        password_hash: passwordHash,
        role_id: 'role-editor',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();

    const accounts = new SqliteAccountRepository(connection.kysely);
    const auditLogs = new SqliteAuditLogRepository(connection.kysely);
    const sessions = new SessionService(
      new SqliteSessionRepository(connection.kysely),
      TTL_MS,
      auditLogs,
    );
    const auth = new AuthService(accounts, hasher, sessions, auditLogs);

    app = Fastify();
    await app.register(cookie);
    registerAuthRoutes(app, {
      auth,
      sessions,
      accounts,
      cookieName: 'dxdoc_session',
      sessionTtlMs: TTL_MS,
      appUrl: 'https://dx.test',
    });
  });

  afterEach(async () => {
    await app.close();
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
  });

  it('sets the secure session cookie flag for HTTPS application URLs (REQ-SEC-019)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'u@acme.test', password: PASSWORD, companyId: 'c1' },
    });

    expect(response.statusCode).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain('Secure');
  });

  function loginPayload(overrides: Record<string, string> = {}): Record<string, string> {
    return { email: 'u@acme.test', password: PASSWORD, companyId: 'c1', ...overrides };
  }

  it('logs in with valid credentials and sets an HttpOnly session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload(),
    });

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['set-cookie'] ?? '';
    expect(setCookie).toContain('dxdoc_session=');
    expect(setCookie).toContain('HttpOnly');
  });

  it('rejects a wrong password and an unknown account with the same response', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload({ password: 'nope' }),
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload({ email: 'nobody@acme.test' }),
    });

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json()).toEqual(unknown.json());
  });

  it('rejects a deactivated account without disclosing it', async () => {
    await connection.kysely
      .updateTable('users')
      .set({ active: 0 })
      .where('id', '=', 'u1')
      .execute();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload(),
    });

    expect(res.statusCode).toBe(401);
    const body = res.json<{ error: { code: string } }>();
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the current session for a valid cookie so a reloaded client can rehydrate', async () => {
    // The session lives in an httpOnly cookie, which survives a full page load
    // while the client's in-memory store does not. Without this endpoint a
    // refresh or a pasted URL looks unauthenticated. GET /api/auth/me lets the
    // client rebuild its session from the cookie the server already trusts.
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload(),
    });
    const setCookie = String(login.headers['set-cookie'] ?? '');
    const token = setCookie.split(';')[0]?.split('=')[1] ?? '';

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: `dxdoc_session=${token}` },
    });

    expect(me.statusCode).toBe(200);
    const body = me.json<{
      userId: string;
      companyId: string | null;
      instanceAdmin: boolean;
      passwordChangeRequired: boolean;
    }>();
    expect(body.userId).toBe('u1');
    expect(body.companyId).toBe('c1');
  });

  it('answers /api/auth/me with 401 when there is no session cookie', async () => {
    const me = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(me.statusCode).toBe(401);
    expect(me.json<{ error: { code: string } }>().error.code).toBe('UNAUTHENTICATED');
  });

  it('logs out by destroying the session and clearing the cookie', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload(),
    });
    const setCookie = String(login.headers['set-cookie'] ?? '');
    const token = setCookie.split(';')[0]?.split('=')[1] ?? '';

    const out = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: `dxdoc_session=${token}` },
    });

    expect(out.statusCode).toBe(200);
    expect(String(out.headers['set-cookie'])).toContain('dxdoc_session=;');
  });

  it('requires a password change at first login and clearing it unlocks the account', async () => {
    // Simulate a bootstrap administrator: initial password must be changed.
    await connection.kysely
      .updateTable('users')
      .set({ password_must_change: 1 })
      .where('id', '=', 'u1')
      .execute();

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload(),
    });
    expect(login.statusCode).toBe(200);
    const loginBody = login.json<{ passwordChangeRequired?: boolean }>();
    expect(loginBody.passwordChangeRequired).toBe(true);
    const token =
      String(login.headers['set-cookie'] ?? '')
        .split(';')[0]
        ?.split('=')[1] ?? '';

    // Wrong current password is rejected.
    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: { currentPassword: 'wrong', newPassword: 'fresh-password-1' },
    });
    expect(bad.statusCode).toBe(401);

    // Correct current password changes it and clears the flag.
    const good = await app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: { cookie: `dxdoc_session=${token}` },
      payload: { currentPassword: PASSWORD, newPassword: 'fresh-password-1' },
    });
    expect(good.statusCode).toBe(200);

    // The new password logs in and the flag is cleared.
    const relogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: loginPayload({ password: 'fresh-password-1' }),
    });
    expect(relogin.statusCode).toBe(200);
    const reloginBody = relogin.json<{ passwordChangeRequired?: boolean }>();
    expect(reloginBody.passwordChangeRequired).toBe(false);
  });

  it('logs in a company-less administrator without a companyId (REQ-SEC-013)', async () => {
    // A second connection not needed: seed a company-less instance admin
    // directly, mirroring what BootstrapService.createUser produces.
    const hasher = new BcryptPasswordHasher();
    await connection.kysely
      .insertInto('users')
      .values({
        id: 'admin-null',
        company_id: null,
        email: 'root@instance.test',
        password_hash: await hasher.hash(PASSWORD),
        role_id: null,
        instance_admin: 1,
        password_must_change: 1,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      })
      .execute();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'root@instance.test', password: PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      user: { companyId: string | null };
      passwordChangeRequired?: boolean;
    }>();
    expect(body.user.companyId).toBeNull();
    expect(body.passwordChangeRequired).toBe(true);
  });

  it('rejects a company-less login for an unknown address without disclosure', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@instance.test', password: 'whatever' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json<{ error: { code: string } }>().error.code).toBe('INVALID_CREDENTIALS');
  });
});

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
    const sessions = new SessionService(new SqliteSessionRepository(connection.kysely), TTL_MS);
    const auth = new AuthService(accounts, hasher, sessions);

    app = Fastify();
    await app.register(cookie);
    registerAuthRoutes(app, { auth, sessions, cookieName: 'dxdoc_session', sessionTtlMs: TTL_MS });
  });

  afterEach(async () => {
    await app.close();
    await closeSqliteConnection(connection);
    rmSync(dir, { recursive: true, force: true });
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
});

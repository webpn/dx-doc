import cookie from '@fastify/cookie';
import type { InstanceAdminStepUpService } from '@project/application/auth/instance-admin-stepup-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';


import { registerInstanceAdminStepUpRoutes } from './routes';

/**
 * Transport-level tests for the ADR-0027 step-up routes.
 *
 * The rules themselves (capability, re-authentication, TTL) belong to the
 * service and are tested there; what matters here is that the route
 * authenticates the caller, passes the actor through, and maps each service
 * error to the right HTTP status. `invalid_password` is the interesting one:
 * it is not part of the shared `replyServiceError` table, so the route must
 * map it deliberately rather than fall through to a 500.
 */

const SESSION_COOKIE = 'dxdoc_session';

interface Recorded {
  actorId: string;
  companyId: string;
  password: string;
}

async function buildApp(overrides: {
  open?: InstanceAdminStepUpService['openStepUp'];
  close?: InstanceAdminStepUpService['closeStepUp'];
  list?: InstanceAdminStepUpService['listOpenStepUps'];
  authenticatedUserId?: string | null;
}): Promise<{ app: FastifyInstance; recorded: Recorded[] }> {
  const recorded: Recorded[] = [];

  const stepUps = {
    openStepUp:
      overrides.open ??
      ((actorId: string, companyId: string, password: string) => {
        recorded.push({ actorId, companyId, password });
        return Promise.resolve({ ok: true as const, value: { expiresAt: '2026-08-21T12:15:00Z' } });
      }),
    closeStepUp:
      overrides.close ?? (() => Promise.resolve({ ok: true as const, value: undefined })),
    listOpenStepUps: overrides.list ?? (() => Promise.resolve({ ok: true as const, value: [] })),
  } as unknown as InstanceAdminStepUpService;

  // A session cookie resolves to a user id; anything else is unauthenticated.
  const sessions = {
    resolve: (token: string) =>
      Promise.resolve(
        token === 'good-session' && overrides.authenticatedUserId !== null
          ? (overrides.authenticatedUserId ?? 'admin-1')
          : null,
      ),
  } as unknown as SessionService;

  const serviceTokens = {
    resolve: () => Promise.resolve(null),
  } as unknown as ServiceTokenService;

  const app = Fastify();
  await app.register(cookie);
  registerInstanceAdminStepUpRoutes(app, {
    stepUps,
    sessions,
    serviceTokens,
    cookieName: SESSION_COOKIE,
  });
  return { app, recorded };
}

describe('instance-admin step-up routes (ADR-0027)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await app.close();
  });

  it('opens a step-up window and returns its expiry', async () => {
    const built = await buildApp({});
    app = built.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/instance-admin/step-up',
      cookies: { [SESSION_COOKIE]: 'good-session' },
      payload: { companyId: 'company-9', password: 'correct-horse' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ expiresAt: '2026-08-21T12:15:00Z' });
    // The actor comes from the session, never from the request body: a caller
    // must not be able to open a window for somebody else.
    expect(built.recorded).toEqual([
      { actorId: 'admin-1', companyId: 'company-9', password: 'correct-horse' },
    ]);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const built = await buildApp({});
    app = built.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/instance-admin/step-up',
      payload: { companyId: 'company-9', password: 'correct-horse' },
    });

    expect(response.statusCode).toBe(401);
    expect(built.recorded).toHaveLength(0);
  });

  it('maps a wrong password to 401 rather than a 500', async () => {
    const built = await buildApp({
      open: () => Promise.resolve({ ok: false, error: { kind: 'invalid_password' } }),
    } as never);
    app = built.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/instance-admin/step-up',
      cookies: { [SESSION_COOKIE]: 'good-session' },
      payload: { companyId: 'company-9', password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect.' },
    });
  });

  it('maps a non-instance-admin actor to 403', async () => {
    const built = await buildApp({
      open: () => Promise.resolve({ ok: false, error: { kind: 'forbidden' } }),
    } as never);
    app = built.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/instance-admin/step-up',
      cookies: { [SESSION_COOKIE]: 'good-session' },
      payload: { companyId: 'company-9', password: 'correct-horse' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('maps an unknown company to 404', async () => {
    const built = await buildApp({
      open: () => Promise.resolve({ ok: false, error: { kind: 'not_found' } }),
    } as never);
    app = built.app;

    const response = await app.inject({
      method: 'POST',
      url: '/api/instance-admin/step-up',
      cookies: { [SESSION_COOKIE]: 'good-session' },
      payload: { companyId: 'ghost', password: 'correct-horse' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('closes a step-up window', async () => {
    const built = await buildApp({});
    app = built.app;

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/instance-admin/step-up/company-9',
      cookies: { [SESSION_COOKIE]: 'good-session' },
    });

    expect(response.statusCode).toBe(204);
  });

  it('lists the open step-up windows for the calling admin', async () => {
    const built = await buildApp({
      list: () =>
        Promise.resolve({
          ok: true,
          value: [
            {
              id: 's1',
              userId: 'admin-1',
              companyId: 'company-9',
              createdAt: '2026-08-21T12:00:00Z',
              expiresAt: '2026-08-21T12:15:00Z',
            },
          ],
        }),
    } as never);
    app = built.app;

    const response = await app.inject({
      method: 'GET',
      url: '/api/instance-admin/step-up',
      cookies: { [SESSION_COOKIE]: 'good-session' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject([{ companyId: 'company-9' }]);
  });
});

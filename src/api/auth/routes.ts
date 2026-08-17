import type { AuthService } from '@project/application/auth/auth-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

export interface AuthRoutesOptions {
  auth: AuthService;
  sessions: SessionService;
  cookieName: string;
  sessionTtlMs: number;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
  companyId?: unknown;
}

/**
 * Email + password authentication routes (REQ-SEC-001, D18). Transport only:
 * HTTP in, application-service call, HTTP out. Validation of business rules
 * lives in the application/domain layer (REQ-FDN-010, ADR-0007).
 */
export function registerAuthRoutes(app: FastifyInstance, options: AuthRoutesOptions): void {
  app.post('/api/auth/login', async (request, reply) => {
    const body = (request.body ?? {}) as LoginBody;
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';

    if (email === '' || password === '' || companyId === '') {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: 'email, password and companyId are required' },
      });
    }

    const result = await options.auth.login(companyId, email, password);
    if (!result.ok) {
      // One message for every failure mode — no disclosure of whether the
      // address exists (REQ-SEC-001).
      return reply
        .code(401)
        .send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    reply.setCookie(options.cookieName, result.session.token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(options.sessionTtlMs / 1000),
      secure: false,
    });
    return { ok: true, user: result.user, passwordChangeRequired: result.passwordChangeRequired };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies[options.cookieName];
    if (token !== undefined) {
      await options.sessions.destroy(token);
    }
    reply.clearCookie(options.cookieName, { path: '/' });
    return { ok: true };
  });

  app.post('/api/auth/change-password', async (request, reply) => {
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies[options.cookieName];
    if (token === undefined) {
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } });
    }
    const userId = await options.sessions.resolve(token);
    if (userId === null) {
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHENTICATED', message: 'Session expired' } });
    }

    const body = (request.body ?? {}) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (currentPassword === '' || newPassword === '') {
      return reply.code(400).send({
        error: { code: 'INVALID_INPUT', message: 'currentPassword and newPassword are required' },
      });
    }

    const result = await options.auth.changePassword(userId, currentPassword, newPassword);
    if (!result.ok) {
      const status = result.error.kind === 'invalid_current_password' ? 401 : 400;
      const code =
        result.error.kind === 'invalid_current_password'
          ? 'INVALID_CURRENT_PASSWORD'
          : result.error.kind === 'weak_password'
            ? 'WEAK_PASSWORD'
            : 'NOT_FOUND';
      return reply.code(status).send({ error: { code, message: 'Could not change password' } });
    }
    return { ok: true };
  });
}

import type { AuthService } from '@project/application/auth/auth-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { AccountRepository } from '@project/application/ports/account-repository';
import type { FastifyInstance } from 'fastify';

export interface AuthRoutesOptions {
  auth: AuthService;
  sessions: SessionService;
  accounts: AccountRepository;
  cookieName: string;
  sessionTtlMs: number;
  appUrl?: string;
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
    // An absent or empty companyId means the company-less instance
    // administrator (REQ-SEC-013/014): resolved against `company_id IS NULL`.
    const companyId =
      typeof body.companyId === 'string' && body.companyId.trim() !== '' ? body.companyId : null;

    if (email === '' || password === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'email and password are required' } });
    }

    const result = await options.auth.login(companyId, email, password);
    if (!result.ok) {
      // The address holds accounts in several companies and the password was
      // correct, so the client must pick one. Returned as 409 rather than 401:
      // the credentials were accepted, only the target is ambiguous. Reached
      // only after a successful password check, so it discloses nothing about
      // addresses that do not exist (REQ-SEC-001).
      if (result.reason === 'company_selection_required') {
        return reply.code(409).send({
          error: {
            code: 'COMPANY_SELECTION_REQUIRED',
            message: 'This email is registered with more than one company. Choose one to continue.',
            companyIds: result.companyIds,
          },
        });
      }
      // One message for every other failure mode — no disclosure of whether the
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
      secure: options.appUrl !== undefined && new URL(options.appUrl).protocol === 'https:',
    });
    return { ok: true, user: result.user, passwordChangeRequired: result.passwordChangeRequired };
  });

  /**
   * The current session, rebuilt from the cookie. The session itself is an
   * httpOnly cookie, which survives a full page load while the client's
   * in-memory store does not — so after a refresh or a pasted URL the client
   * needs somewhere to ask "who am I?" instead of assuming it is signed out.
   *
   * Read-only and derived entirely from server state: the cookie is resolved to
   * a session, then to the live user row, so a deactivated or deleted account
   * stops rehydrating immediately rather than living on in a stale client.
   */
  app.get('/api/auth/me', async (request, reply) => {
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
    const user = await options.accounts.getUserById(userId);
    if (!user?.active) {
      return reply
        .code(401)
        .send({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } });
    }
    return {
      userId: user.id,
      companyId: user.companyId,
      instanceAdmin: user.instanceAdmin,
      passwordChangeRequired: user.passwordMustChange,
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const cookies = request.cookies as Record<string, string | undefined>;
    const token = cookies[options.cookieName];
    if (token !== undefined) {
      const userId = await options.sessions.resolve(token);
      let companyId: string | null = null;
      if (userId !== null) {
        const user = await options.accounts.getUserById(userId);
        companyId = user?.companyId ?? null;
      }
      await options.sessions.destroy(token, userId, companyId);
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

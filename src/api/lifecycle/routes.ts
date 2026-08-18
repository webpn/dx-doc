import type { LifecycleService } from '@project/application/auth/lifecycle-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface LifecycleRoutesOptions {
  lifecycle: LifecycleService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Account-lifecycle routes (REQ-SEC-013/014, M1.12): invitation, deactivation,
 * password reset (self-service, unauthenticated request + confirm), and the
 * instance-administration flag. Transport only — permission and non-disclosure
 * rules live in LifecycleService.
 */
export function registerLifecycleRoutes(
  app: FastifyInstance,
  options: LifecycleRoutesOptions,
): void {
  // Invitation: issued by an Admin, Project Manager or Editor (REQ-SEC-013).
  app.post('/api/users/invite', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const body = (request.body ?? {}) as { companyId?: unknown; email?: unknown };
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    const email = typeof body.email === 'string' ? body.email : '';
    if (companyId === '' || email === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'companyId and email are required' } });
    }
    const result = await options.lifecycle.inviteUser(actor.userId, companyId, email);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply.code(201).send({ userId: result.value.userId });
  });

  // Deactivation: ends the target's sessions and revokes access without
  // deleting the account (REQ-SEC-013).
  app.post('/api/users/:id/deactivate', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { companyId?: unknown };
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    if (companyId === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'companyId is required' } });
    }
    const result = await options.lifecycle.deactivateUser(actor.userId, companyId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });

  // Instance-administration flag (REQ-SEC-014): only an existing holder can
  // grant or revoke it; checked in the service.
  app.post('/api/users/:id/instance-admin', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { value?: unknown };
    const value = body.value === true || body.value === false ? body.value : null;
    if (value === null) {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'value must be a boolean' } });
    }
    const result = await options.lifecycle.setInstanceAdmin(actor.userId, id, value);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });

  // Password reset request — deliberately unauthenticated and non-disclosing
  // (REQ-SEC-013): the service answers uniformly whether or not the address
  // exists, has a local password, or is active.
  app.post('/api/auth/password-reset/request', async (request, reply) => {
    const body = (request.body ?? {}) as { companyId?: unknown; email?: unknown };
    const companyId = typeof body.companyId === 'string' ? body.companyId : null;
    const email = typeof body.email === 'string' ? body.email : '';
    if (email === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'email is required' } });
    }
    await options.lifecycle.requestPasswordReset(companyId, email);
    // One response for every outcome — no disclosure (REQ-SEC-001/013).
    return { ok: true };
  });

  // Password reset confirmation — unauthenticated, single-use token.
  app.post('/api/auth/password-reset/confirm', async (request, reply) => {
    const body = (request.body ?? {}) as { token?: unknown; newPassword?: unknown };
    const token = typeof body.token === 'string' ? body.token : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    if (token === '' || newPassword === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'token and newPassword are required' } });
    }
    const result = await options.lifecycle.resetPassword(token, newPassword);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });
}

import type { InstanceAdminStepUpService } from '@project/application/auth/instance-admin-stepup-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface InstanceAdminStepUpRoutesOptions {
  stepUps: InstanceAdminStepUpService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

interface OpenStepUpBody {
  companyId?: unknown;
  password?: unknown;
}

/**
 * `invalid_password` is deliberately not in the shared `replyServiceError`
 * table: it only arises from a re-authentication step, and it must not be
 * confused with the 403 that a missing capability produces. A wrong password
 * is 401 — "prove who you are again" — while a valid identity without the
 * capability is 403.
 */
function replyStepUpError(
  reply: FastifyReply,
  error: Parameters<typeof replyServiceError>[1] | { kind: 'invalid_password' },
): FastifyReply {
  if (error.kind === 'invalid_password') {
    return reply
      .code(401)
      .send({ error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect.' } });
  }
  return replyServiceError(reply, error);
}

/**
 * Instance-administration step-up routes (ADR-0027).
 *
 * Transport only: the capability check, the re-authentication and the TTL all
 * live in `InstanceAdminStepUpService` so the MCP server gets the same rules
 * (AGENTS.md, ADR-0007). The actor id always comes from the authenticated
 * session — never from the request body — so a caller cannot open a window in
 * somebody else's name.
 */
export function registerInstanceAdminStepUpRoutes(
  app: FastifyInstance,
  options: InstanceAdminStepUpRoutesOptions,
): void {
  app.post('/api/instance-admin/step-up', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }

    const body = (request.body ?? {}) as OpenStepUpBody;
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const result = await options.stepUps.openStepUp(actor.userId, companyId, password);
    if (!result.ok) {
      return replyStepUpError(reply, result.error);
    }
    return reply.code(201).send(result.value);
  });

  app.get('/api/instance-admin/step-up', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }

    const result = await options.stepUps.listOpenStepUps(actor.userId);
    if (!result.ok) {
      return replyStepUpError(reply, result.error);
    }
    return reply.code(200).send(result.value);
  });

  app.delete<{ Params: { companyId: string } }>(
    '/api/instance-admin/step-up/:companyId',
    async (request, reply) => {
      const actor = await authenticateRequest(
        request,
        options.sessions,
        options.serviceTokens,
        options.cookieName,
      );
      if (actor === null) {
        return unauthenticated(reply);
      }

      const result = await options.stepUps.closeStepUp(actor.userId, request.params.companyId);
      if (!result.ok) {
        return replyStepUpError(reply, result.error);
      }
      return reply.code(204).send();
    },
  );
}

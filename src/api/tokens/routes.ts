import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface TokenRoutesOptions {
  tokens: ServiceTokenService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Service-account API token lifecycle routes (REQ-API-009, M1.12): issue,
 * list, revoke. A token is bound to the authenticated actor's own identity
 * and never carries more privilege than its owner; the raw value is returned
 * exactly once, at issuance.
 */
export function registerTokenRoutes(app: FastifyInstance, options: TokenRoutesOptions): void {
  // Issue a token bound to the caller.
  app.post('/api/auth/tokens', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const body = (request.body ?? {}) as { name?: unknown };
    const name = typeof body.name === 'string' ? body.name : '';
    const result = await options.tokens.issue(actor.userId, name);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply.code(201).send({
      tokenId: result.value.tokenId,
      token: result.value.token,
      expiresAt: result.value.expiresAt,
    });
  });

  // List the caller's own tokens (no token value is ever returned).
  app.get('/api/auth/tokens', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    return { tokens: await options.tokens.list(actor.userId) };
  });

  // Revoke one of the caller's own tokens.
  app.delete('/api/auth/tokens/:id', async (request, reply) => {
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
    const result = await options.tokens.revoke(actor.userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });
}

import type { GrantService } from '@project/application/auth/grant-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface AccessRoutesOptions {
  grants: GrantService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Per-project grant administration routes (REQ-SEC-003, M1.12). Transport
 * only; every rule — the `project.manage_access` gate, role validity, same
 * company ownership — lives in GrantService. One project at a time, exactly
 * as the requirement demands: there is no bulk endpoint and no cross-project
 * view.
 */
export function registerAccessRoutes(app: FastifyInstance, options: AccessRoutesOptions): void {
  // Create or change a grant (PUT is an idempotent set of the role).
  app.put('/api/projects/:projectId/grants/:userId', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const { projectId, userId } = request.params as { projectId: string; userId: string };
    const body = (request.body ?? {}) as { roleName?: unknown };
    const roleName = typeof body.roleName === 'string' ? body.roleName : '';
    const result = await options.grants.setRole(actor.userId, projectId, userId, roleName);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { projectId, userId, roleName: result.value.roleName };
  });

  // Revoke a grant.
  app.delete('/api/projects/:projectId/grants/:userId', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const { projectId, userId } = request.params as { projectId: string; userId: string };
    const result = await options.grants.revoke(actor.userId, projectId, userId);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });

  // List the grants on one project.
  app.get('/api/projects/:projectId/grants', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const { projectId } = request.params as { projectId: string };
    const result = await options.grants.list(actor.userId, projectId);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { grants: result.value };
  });
}

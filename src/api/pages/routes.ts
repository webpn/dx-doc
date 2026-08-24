import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { PageService } from '@project/application/page/page-service';
import type { PageCreateInput, PageUpdateInput } from '@project/application/validation/schemas';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface PageRoutesOptions {
  pages: PageService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Page/Screen REST routes (REQ-API-001). Transport only; rules live in the
 * application layer (ADR-0007, REQ-FDN-010).
 */
export function registerPageRoutes(app: FastifyInstance, options: PageRoutesOptions): void {
  app.post('/api/projects/:projectId/pages', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const userId = actor.userId;
    const { projectId } = request.params as { projectId: string };
    const result = await options.pages.create(userId, projectId, request.body as PageCreateInput);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply.code(201).send({ id: result.value.pageId, created: result.value.created });
  });

  app.get('/api/projects/:projectId/pages', async (request, reply) => {
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
    const result = await options.pages.listForProject(actor.userId, projectId);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return result.value;
  });

  app.get('/api/pages/:id', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const userId = actor.userId;
    const { id } = request.params as { id: string };
    const result = await options.pages.get(userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return result.value;
  });

  app.patch('/api/pages/:id', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const userId = actor.userId;
    const { id } = request.params as { id: string };
    const result = await options.pages.update(userId, id, request.body as PageUpdateInput);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });

  app.delete('/api/pages/:id', async (request, reply) => {
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
    const result = await options.pages.delete(actor.userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });
}

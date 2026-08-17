import type { SessionService } from '@project/application/auth/session-service';
import type { ProjectService } from '@project/application/project/project-service';
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from '@project/application/validation/schemas';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface ProjectRoutesOptions {
  projects: ProjectService;
  sessions: SessionService;
  cookieName: string;
}

/**
 * Project REST routes (REQ-API-001). Transport only: HTTP in, application
 * service call, HTTP out. Every business rule and validation lives in the
 * application/domain layer (ADR-0007, REQ-FDN-010) and is shared with the MCP
 * server and direct calls.
 */
export function registerProjectRoutes(app: FastifyInstance, options: ProjectRoutesOptions): void {
  app.post('/api/projects', async (request, reply) => {
    const userId = await authenticateRequest(request, options.sessions, options.cookieName);
    if (userId === null) {
      return unauthenticated(reply);
    }
    const body = (request.body ?? {}) as { companyId?: unknown };
    const companyId = typeof body.companyId === 'string' ? body.companyId : '';
    if (companyId === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'companyId is required' } });
    }

    const result = await options.projects.create(
      userId,
      companyId,
      request.body as ProjectCreateInput,
    );
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply.code(201).send({ id: result.value.projectId, created: result.value.created });
  });

  app.get('/api/projects/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, options.sessions, options.cookieName);
    if (userId === null) {
      return unauthenticated(reply);
    }
    const { id } = request.params as { id: string };
    const result = await options.projects.get(userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return result.value;
  });

  app.patch('/api/projects/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, options.sessions, options.cookieName);
    if (userId === null) {
      return unauthenticated(reply);
    }
    const { id } = request.params as { id: string };
    const result = await options.projects.update(userId, id, request.body as ProjectUpdateInput);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });
}

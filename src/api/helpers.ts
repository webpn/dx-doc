import type { SessionService } from '@project/application/auth/session-service';
import type { ValidationIssue } from '@project/application/validation/issues';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Resolve the authenticated user id from the session cookie, or null when
 * unauthenticated. Transport concern: the session store decides validity.
 */
export async function authenticateRequest(
  request: FastifyRequest,
  sessions: SessionService,
  cookieName: string,
): Promise<string | null> {
  const cookies = request.cookies as Record<string, string | undefined>;
  const token = cookies[cookieName];
  if (token === undefined) {
    return null;
  }
  return sessions.resolve(token);
}

export function unauthenticated(reply: FastifyReply): FastifyReply {
  return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } });
}

/** The error shapes the application services return (discriminated by kind). */
interface ServiceErrorShape {
  kind: string;
  issues?: ValidationIssue[];
}

/**
 * Map an application-service error to a uniform HTTP error body (REQ-FDN-010:
 * error shapes are consistent across entry points).
 */
export function replyServiceError(reply: FastifyReply, error: ServiceErrorShape): FastifyReply {
  switch (error.kind) {
    case 'forbidden':
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
    case 'not_found':
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    case 'validation':
      return reply.code(400).send({
        error: { code: 'VALIDATION', message: 'Validation failed', issues: error.issues },
      });
    case 'duplicate_custom_id':
      return reply.code(409).send({
        error: { code: 'DUPLICATE_CUSTOM_ID', message: 'custom_id is already in use' },
      });
    case 'cross_project_parent':
      return reply.code(400).send({
        error: { code: 'CROSS_PROJECT_PARENT', message: 'Parent page belongs to another project' },
      });
    default:
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal error' } });
  }
}

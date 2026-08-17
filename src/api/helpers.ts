import type { SessionService } from '@project/application/auth/session-service';
import type { ValidationIssue } from '@project/application/validation/issues';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Resolve the authenticated user id from the session cookie or Bearer header (REQ-API-009, D38).
 * Transport concern: the session store decides validity.
 */
export async function authenticateRequest(
  request: FastifyRequest,
  sessions: SessionService,
  cookieName: string,
): Promise<string | null> {
  // 1. Check Bearer token (service-account / script auth, REQ-API-009)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken.length > 0) {
      return sessions.resolve(bearerToken);
    }
  }

  // 2. Check Cookie
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
    case 'stale_write':
      return reply.code(409).send({
        error: {
          code: 'STALE_WRITE',
          message: 'Conflict: record has been modified by another edit (REQ-AUTH-005, ADR-0016)',
          currentUpdatedAt: (error as { currentUpdatedAt?: string }).currentUpdatedAt,
        },
      });
    case 'cross_project_parent':
    case 'cross_project_reference':
      return reply.code(400).send({
        error: {
          code: 'CROSS_PROJECT_REFERENCE',
          message: 'Referenced entity belongs to a different project (REQ-DOM-028)',
        },
      });
    case 'hierarchy_cycle':
      return reply.code(400).send({
        error: {
          code: 'HIERARCHY_CYCLE',
          message: 'Hierarchy cycle detected in property parent references (REQ-DOM-004)',
        },
      });
    default:
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal error' } });
  }
}

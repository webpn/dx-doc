import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { ValidationIssue } from '@project/application/validation/issues';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** Who is acting: a human session, or a service-account token (REQ-API-009). */
export type ActorKind = 'session' | 'service_token';

export interface AuthenticatedActor {
  userId: string;
  actorKind: ActorKind;
}

/**
 * Resolve the authenticated actor from the session cookie or Bearer header
 * (REQ-API-009, D38). Transport concern: the session store and the
 * service-token store decide validity; a revoked token or a deactivated
 * owner's token stops resolving within one request.
 */
export async function authenticateRequest(
  request: FastifyRequest,
  sessions: SessionService,
  serviceTokens: ServiceTokenService,
  cookieName: string,
): Promise<AuthenticatedActor | null> {
  // 1. Check Bearer token. Service-account tokens first (REQ-API-009); the
  // legacy fallback — a session cookie token sent as Bearer — keeps working
  // exactly as it did before M1.12.
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken.length > 0) {
      const serviceUserId = await serviceTokens.resolve(bearerToken);
      if (serviceUserId !== null) {
        return { userId: serviceUserId, actorKind: 'service_token' };
      }
      const sessionUserId = await sessions.resolve(bearerToken);
      if (sessionUserId !== null) {
        return { userId: sessionUserId, actorKind: 'session' };
      }
      return null;
    }
  }

  // 2. Check Cookie
  const cookies = request.cookies as Record<string, string | undefined>;
  const token = cookies[cookieName];
  if (token === undefined) {
    return null;
  }
  const userId = await sessions.resolve(token);
  if (userId === null) {
    return null;
  }
  return { userId, actorKind: 'session' };
}

export function unauthenticated(reply: FastifyReply): FastifyReply {
  return reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' } });
}

/** The error shapes the application services return (discriminated by kind). */
interface ServiceErrorShape {
  kind: string;
  issues?: ValidationIssue[];
  reason?: string;
  maxBytes?: number;
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
    case 'in_use':
      return reply.code(409).send({
        error: {
          code: 'IN_USE',
          message: `Cannot delete: ${(error as { reason?: string }).reason ?? 'still in use'} (ADR-0025)`,
        },
      });
    case 'stale_write':
      return reply.code(409).send({
        error: {
          code: 'STALE_WRITE',
          message: 'Conflict: record has been modified by another edit (REQ-AUTH-005, ADR-0016)',
          currentUpdatedAt: (error as { currentUpdatedAt?: string }).currentUpdatedAt,
        },
      });
    case 'publication_integrity':
      return reply.code(409).send({
        error: {
          code: 'PUBLICATION_INTEGRITY',
          message: 'Publication contains a reference to excluded content',
          reason: error.reason,
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
    case 'invalid_role':
      return reply.code(400).send({
        error: {
          code: 'INVALID_ROLE',
          message: 'Must be one of the four company roles (admin, project_manager, editor, viewer)',
        },
      });
    case 'invalid_email':
      return reply.code(400).send({ error: { code: 'INVALID_EMAIL', message: 'Invalid email' } });
    case 'invalid_input':
      return reply.code(400).send({ error: { code: 'INVALID_INPUT', message: 'Invalid input' } });
    case 'invalid_or_expired_token':
      return reply.code(400).send({
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Reset token is invalid or expired' },
      });
    case 'weak_password':
      return reply.code(400).send({
        error: { code: 'WEAK_PASSWORD', message: 'New password is too short' },
      });
    case 'too_large':
      return reply.code(413).send({
        error: {
          code: 'TOO_LARGE',
          message: `File exceeds the ${String((error as { maxBytes?: number }).maxBytes ?? 0)}-byte upload cap (REQ-AUTH-002)`,
        },
      });
    case 'unsupported_format':
      return reply.code(400).send({
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: 'Only jpeg, png, webp and gif images are accepted',
        },
      });
    default:
      return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal error' } });
  }
}

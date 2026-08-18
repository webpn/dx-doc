import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { CompanyService } from '@project/application/company/company-service';
import type { CompanyCreateInput } from '@project/application/validation/schemas';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface CompanyRoutesOptions {
  companies: CompanyService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Company routes (REQ-FDN-002, REQ-SEC-015): creating a company is an
 * instance-administration power, gated in the service. Transport only.
 */
export function registerCompanyRoutes(app: FastifyInstance, options: CompanyRoutesOptions): void {
  app.post('/api/companies', async (request, reply) => {
    const actor = await authenticateRequest(
      request,
      options.sessions,
      options.serviceTokens,
      options.cookieName,
    );
    if (actor === null) {
      return unauthenticated(reply);
    }
    const result = await options.companies.createCompany(
      actor.userId,
      request.body as CompanyCreateInput,
    );
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply.code(201).send({ companyId: result.value.companyId });
  });
}

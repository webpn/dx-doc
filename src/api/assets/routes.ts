import type { AssetService } from '@project/application/asset/asset-service';
import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface AssetRoutesOptions {
  assets: AssetService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * Asset upload routes (REQ-IMP-004, REQ-AUTH-002, ADR-0026). Multipart
 * parsing is the only transport concern here; size cap, format validation
 * and resize live in `AssetService`. `customId` (REQ-IMP-003) travels as a
 * query parameter since the upload is a single file, not a form with other
 * fields.
 */
export function registerAssetRoutes(app: FastifyInstance, options: AssetRoutesOptions): void {
  app.post('/api/projects/:projectId/assets', async (request, reply) => {
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
    const query = request.query as { companyId?: string; customId?: string };
    const companyId = typeof query.companyId === 'string' ? query.companyId : '';
    if (companyId === '') {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'companyId is required' } });
    }

    const file = await request.file();
    if (file === undefined) {
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'A file part is required' } });
    }
    const buffer = await file.toBuffer();

    const result = await options.assets.upload(actor.userId, companyId, projectId, {
      buffer,
      filename: file.filename,
      ...(query.customId !== undefined ? { customId: query.customId } : {}),
    });
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return reply
      .code(201)
      .send({ id: result.value.assetId, url: result.value.url, created: result.value.created });
  });

  app.get('/api/projects/:projectId/assets', async (request, reply) => {
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
    const result = await options.assets.list(actor.userId, projectId);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return result.value.map(({ asset, url }) => ({ ...asset, url }));
  });

  app.get('/api/assets/:id', async (request, reply) => {
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
    const result = await options.assets.get(actor.userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ...result.value.asset, url: result.value.url };
  });

  app.delete('/api/assets/:id', async (request, reply) => {
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
    const result = await options.assets.delete(actor.userId, id);
    if (!result.ok) {
      return replyServiceError(reply, result.error);
    }
    return { ok: true };
  });
}

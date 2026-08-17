import type { SessionService } from '@project/application/auth/session-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type {
  DestinationCreateInput,
  DestinationUpdateInput,
  FreePageCreateInput,
  FreePageUpdateInput,
  ModuleCreateInput,
  ModuleUpdateInput,
  NavigationEventCreateInput,
  NavigationEventUpdateInput,
  PropertyCreateInput,
  PropertyUpdateInput,
  SpecificValueCreateInput,
  TrackingCreateInput,
  TrackingPropertyPresenceInput,
  TrackingTemplateCreateInput,
  TrackingTemplateUpdateInput,
  TrackingUpdateInput,
} from '@project/application/validation/schemas';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface TrackingRoutesOptions {
  trackingService: TrackingService;
  sessions: SessionService;
  cookieName: string;
}

/**
 * REST routes for Tracking Data Model (M1.2, REQ-IMP-002, REQ-API-001).
 * Exposes all R1 entities, batch write endpoints (REQ-IMP-005), and reconciliation reports (REQ-IMP-006).
 */
export function registerTrackingRoutes(app: FastifyInstance, options: TrackingRoutesOptions): void {
  const { trackingService, sessions, cookieName } = options;

  // ── PROPERTIES ────────────────────────────────────────────────
  app.post('/api/companies/:companyId/properties', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.createProperty(
      userId,
      companyId,
      projectId,
      request.body as PropertyCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.propertyId });
  });

  app.get('/api/companies/:companyId/properties', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listProperties(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/properties/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getProperty(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/properties/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateProperty(
      userId,
      id,
      request.body as PropertyUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── MODULES ───────────────────────────────────────────────────
  app.post('/api/companies/:companyId/modules', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.createModule(
      userId,
      companyId,
      projectId,
      request.body as ModuleCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.moduleId });
  });

  app.get('/api/companies/:companyId/modules', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listModules(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/modules/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getModule(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/modules/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateModule(
      userId,
      id,
      request.body as ModuleUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── DESTINATIONS ──────────────────────────────────────────────
  app.post('/api/companies/:companyId/destinations', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.createDestination(
      userId,
      companyId,
      projectId,
      request.body as DestinationCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.destinationId });
  });

  app.get('/api/companies/:companyId/destinations', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listDestinations(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/destinations/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getDestination(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/destinations/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateDestination(
      userId,
      id,
      request.body as DestinationUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.put('/api/properties/:id/destinations', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const body = request.body as {
      mappings: {
        destinationId: string;
        destinationNameOverride: string | null;
      }[];
    };

    const result = await trackingService.setPropertyDestinations(userId, id, body.mappings);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── NAVIGATION EVENTS ─────────────────────────────────────────
  app.post('/api/projects/:projectId/navigation-events', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.createNavigationEvent(
      userId,
      projectId,
      request.body as NavigationEventCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.eventId });
  });

  app.get('/api/projects/:projectId/navigation-events', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listNavigationEvents(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/navigation-events/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateNavigationEvent(
      userId,
      id,
      request.body as NavigationEventUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── TRACKING TEMPLATES ────────────────────────────────────────
  app.post('/api/companies/:companyId/tracking-templates', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.createTrackingTemplate(
      userId,
      companyId,
      projectId,
      request.body as TrackingTemplateCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.templateId });
  });

  app.get('/api/tracking-templates/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getTrackingTemplate(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/tracking-templates/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateTrackingTemplate(
      userId,
      id,
      request.body as TrackingTemplateUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── FREE PAGES ────────────────────────────────────────────────
  app.post('/api/companies/:companyId/free-pages', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.createFreePage(
      userId,
      companyId,
      projectId,
      request.body as FreePageCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.freePageId });
  });

  app.get('/api/free-pages/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getFreePage(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/free-pages/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateFreePage(
      userId,
      id,
      request.body as FreePageUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── TRACKINGS & COMPOSITION ───────────────────────────────────
  app.post('/api/projects/:projectId/trackings', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.createTracking(
      userId,
      projectId,
      request.body as TrackingCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.trackingId });
  });

  app.get('/api/projects/:projectId/trackings', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listTrackingsForProject(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/trackings/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.getTracking(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/trackings/:id', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const result = await trackingService.updateTracking(
      userId,
      id,
      request.body as TrackingUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.post('/api/trackings/:id/duplicate', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { nameOverride?: string };
    const result = await trackingService.duplicateTracking(userId, id, body.nameOverride);
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.duplicatedTrackingId });
  });

  app.post('/api/trackings/:id/modules', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id } = request.params as { id: string };
    const body = request.body as { moduleId: string };
    const result = await trackingService.applyModuleToTracking(userId, id, body.moduleId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/trackings/:id/properties/:propertyId', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id, propertyId } = request.params as {
      id: string;
      propertyId: string;
    };
    const result = await trackingService.removePropertyFromTracking(userId, id, propertyId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/trackings/:id/properties/:propertyId/presence', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { id, propertyId } = request.params as {
      id: string;
      propertyId: string;
    };
    const result = await trackingService.updateTrackingPropertyPresence(
      userId,
      id,
      propertyId,
      request.body as TrackingPropertyPresenceInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.post('/api/tracking-properties/:tpId/specific-values', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { tpId } = request.params as { tpId: string };
    const result = await trackingService.setSpecificValue(
      userId,
      tpId,
      request.body as SpecificValueCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.specificValueId });
  });

  // ── CATALOGUE COPY (REQ-DOM-019) ──────────────────────────────
  app.post(
    '/api/companies/:companyId/projects/:projectId/copy-catalogue',
    async (request, reply) => {
      const userId = await authenticateRequest(request, sessions, cookieName);
      if (!userId) return unauthenticated(reply);

      const { companyId, projectId } = request.params as {
        companyId: string;
        projectId: string;
      };
      const body = request.body as {
        propertyIds?: string[];
        moduleIds?: string[];
      };
      const result = await trackingService.copyCatalogueToProject(
        userId,
        companyId,
        projectId,
        body,
      );
      if (!result.ok) return replyServiceError(reply, result.error);
      return result.value;
    },
  );

  // ── RECONCILIATION REPORT (REQ-IMP-006) ───────────────────────
  app.get(
    '/api/companies/:companyId/projects/:projectId/reconciliation',
    async (request, reply) => {
      const userId = await authenticateRequest(request, sessions, cookieName);
      if (!userId) return unauthenticated(reply);

      const { companyId, projectId } = request.params as {
        companyId: string;
        projectId: string;
      };
      const result = await trackingService.generateReconciliationReport(
        userId,
        companyId,
        projectId,
      );
      if (!result.ok) return replyServiceError(reply, result.error);
      return result.value;
    },
  );

  // ── BATCH WRITE ENDPOINT (REQ-IMP-005, D35) ──────────────────
  app.post('/api/companies/:companyId/batch', async (request, reply) => {
    const userId = await authenticateRequest(request, sessions, cookieName);
    if (!userId) return unauthenticated(reply);

    const { companyId } = request.params as { companyId: string };
    const body = request.body as {
      projectId?: string;
      properties?: PropertyCreateInput[];
      modules?: ModuleCreateInput[];
      destinations?: DestinationCreateInput[];
      trackings?: TrackingCreateInput[];
    };

    const projectId = body.projectId ?? null;
    const results: {
      properties: { index: number; success: boolean; id?: string; error?: unknown }[];
      modules: { index: number; success: boolean; id?: string; error?: unknown }[];
      destinations: { index: number; success: boolean; id?: string; error?: unknown }[];
      trackings: { index: number; success: boolean; id?: string; error?: unknown }[];
    } = {
      properties: [],
      modules: [],
      destinations: [],
      trackings: [],
    };

    if (body.properties) {
      let i = 0;
      for (const item of body.properties) {
        const res = await trackingService.createProperty(userId, companyId, projectId, item);
        if (res.ok) {
          results.properties.push({ index: i, success: true, id: res.value.propertyId });
        } else {
          results.properties.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (body.modules) {
      let i = 0;
      for (const item of body.modules) {
        const res = await trackingService.createModule(userId, companyId, projectId, item);
        if (res.ok) {
          results.modules.push({ index: i, success: true, id: res.value.moduleId });
        } else {
          results.modules.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (body.destinations) {
      let i = 0;
      for (const item of body.destinations) {
        const res = await trackingService.createDestination(userId, companyId, projectId, item);
        if (res.ok) {
          results.destinations.push({ index: i, success: true, id: res.value.destinationId });
        } else {
          results.destinations.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (body.trackings && projectId !== null) {
      let i = 0;
      for (const item of body.trackings) {
        const res = await trackingService.createTracking(userId, projectId, item);
        if (res.ok) {
          results.trackings.push({ index: i, success: true, id: res.value.trackingId });
        } else {
          results.trackings.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    return reply.code(200).send({ results });
  });
}

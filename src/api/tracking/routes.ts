import type { ServiceTokenService } from '@project/application/auth/service-token-service';
import type { SessionService } from '@project/application/auth/session-service';
import type { TrackingService } from '@project/application/tracking/tracking-service';
import type {
  DestinationCreateInput,
  DestinationUpdateInput,
  FlowCreateInput,
  FlowGraphInput,
  FlowUpdateInput,
  FreePageCreateInput,
  FreePageUpdateInput,
  ModuleCreateInput,
  ModuleUpdateInput,
  NavigationEventCreateInput,
  NavigationEventUpdateInput,
  ProjectSharedPasswordCreateInput,
  ProjectSharedPasswordVerifyInput,
  PropertyCreateInput,
  PropertyUpdateInput,
  PublishVersionInput,
  SpecificValueCreateInput,
  TrackingCreateInput,
  TrackingPropertyPresenceInput,
  TrackingTemplateCreateInput,
  TrackingTemplateUpdateInput,
  TrackingUpdateInput,
  TriggerCreateInput,
  TriggerUpdateInput,
} from '@project/application/validation/schemas';
import type { FastifyInstance } from 'fastify';

import { authenticateRequest, replyServiceError, unauthenticated } from '../helpers';

export interface TrackingRoutesOptions {
  trackingService: TrackingService;
  sessions: SessionService;
  serviceTokens: ServiceTokenService;
  cookieName: string;
}

/**
 * REST routes for Tracking Data Model (M1.2, REQ-IMP-002, REQ-API-001).
 * Exposes all R1 entities, batch write endpoints (REQ-IMP-005), and reconciliation reports (REQ-IMP-006).
 */
export function registerTrackingRoutes(app: FastifyInstance, options: TrackingRoutesOptions): void {
  const { trackingService, sessions, serviceTokens, cookieName } = options;

  // ── PROPERTIES ────────────────────────────────────────────────
  app.post('/api/companies/:companyId/properties', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listProperties(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/properties/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getProperty(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/properties/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateProperty(
      userId,
      id,
      request.body as PropertyUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/properties/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteProperty(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── MODULES ───────────────────────────────────────────────────
  app.post('/api/companies/:companyId/modules', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listModules(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/modules/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getModule(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/modules/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateModule(
      userId,
      id,
      request.body as ModuleUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/modules/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteModule(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── DESTINATIONS ──────────────────────────────────────────────
  app.post('/api/companies/:companyId/destinations', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const projectId = query.projectId ?? null;

    const result = await trackingService.listDestinations(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/destinations/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getDestination(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/destinations/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateDestination(
      userId,
      id,
      request.body as DestinationUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/destinations/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.deleteDestination(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.put('/api/properties/:id/destinations', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listNavigationEvents(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/navigation-events/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateNavigationEvent(
      userId,
      id,
      request.body as NavigationEventUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/navigation-events/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.deleteNavigationEvent(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── TRACKING TEMPLATES ────────────────────────────────────────
  app.post('/api/companies/:companyId/tracking-templates', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getTrackingTemplate(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/tracking-templates/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateTrackingTemplate(
      userId,
      id,
      request.body as TrackingTemplateUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/tracking-templates/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteTrackingTemplate(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── FREE PAGES ────────────────────────────────────────────────
  app.post('/api/companies/:companyId/free-pages', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getFreePage(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/free-pages/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateFreePage(
      userId,
      id,
      request.body as FreePageUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/free-pages/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteFreePage(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── TRACKINGS & COMPOSITION ───────────────────────────────────
  app.post('/api/projects/:projectId/trackings', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listTrackingsForProject(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/trackings/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getTracking(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/trackings/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateTracking(
      userId,
      id,
      request.body as TrackingUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/trackings/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteTracking(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.post('/api/trackings/:id/duplicate', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { nameOverride?: string };
    const result = await trackingService.duplicateTracking(userId, id, body.nameOverride);
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.duplicatedTrackingId });
  });

  app.post('/api/trackings/:id/modules', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const body = request.body as { moduleId: string };
    const result = await trackingService.applyModuleToTracking(userId, id, body.moduleId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/trackings/:id/properties/:propertyId', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id, propertyId } = request.params as {
      id: string;
      propertyId: string;
    };
    const result = await trackingService.removePropertyFromTracking(userId, id, propertyId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/trackings/:id/properties/:propertyId/presence', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { tpId } = request.params as { tpId: string };
    const result = await trackingService.setSpecificValue(
      userId,
      tpId,
      request.body as SpecificValueCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.specificValueId });
  });

  app.delete('/api/specific-values/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteSpecificValue(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── CATALOGUE COPY (REQ-DOM-019) ──────────────────────────────
  app.post(
    '/api/companies/:companyId/projects/:projectId/copy-catalogue',
    async (request, reply) => {
      const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
      if (!actor) return unauthenticated(reply);
      const userId = actor.userId;

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
      const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
      if (!actor) return unauthenticated(reply);
      const userId = actor.userId;

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

  // ── FLOWS & TRIGGERS (REQ-NAV-003 .. REQ-NAV-007, REQ-AUTH-004) ──
  app.post('/api/projects/:projectId/flows', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.createFlow(
      userId,
      projectId,
      request.body as FlowCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.flowId });
  });

  app.get('/api/projects/:projectId/flows', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listFlowsForProject(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/flows/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getFlow(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/flows/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateFlow(userId, id, request.body as FlowUpdateInput);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.put('/api/flows/:id/graph', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.setFlowGraph(userId, id, request.body as FlowGraphInput);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/flows/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteFlow(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.post('/api/projects/:projectId/triggers', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.createTrigger(
      userId,
      projectId,
      request.body as TriggerCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.triggerId });
  });

  app.get('/api/projects/:projectId/triggers', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listTriggersForProject(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/triggers/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getTrigger(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.patch('/api/triggers/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.updateTrigger(
      userId,
      id,
      request.body as TriggerUpdateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.delete('/api/triggers/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const { id } = request.params as { id: string };
    const result = await trackingService.deleteTrigger(actor.userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  // ── SEARCH (REQ-AUTH-007, REQ-SEC-012) ──────────────────────
  app.post('/api/companies/:companyId/projects/:projectId/search/sync', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { companyId, projectId } = request.params as {
      companyId: string;
      projectId: string;
    };
    const result = await trackingService.syncProjectSearchIndex(userId, companyId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/projects/:projectId/search', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const query = request.query as { q?: string };
    const q = query.q ?? '';

    const result = await trackingService.searchProject(userId, projectId, q);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  // ── VERSIONING & PUBLICATION (REQ-VER-001 .. REQ-VER-007) ──
  app.post('/api/companies/:companyId/projects/:projectId/versions', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    // A service-account token cannot publish a version — the same restriction
    // as REQ-API-004, enforced here because tokens authenticate AS their owner
    // and the permission model must not be the only gate (REQ-API-009).
    if (actor.actorKind === 'service_token') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Service tokens cannot publish versions (REQ-API-004/009)',
        },
      });
    }

    const { companyId, projectId } = request.params as {
      companyId: string;
      projectId: string;
    };
    const result = await trackingService.publishVersion(
      userId,
      companyId,
      projectId,
      request.body as PublishVersionInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send(result.value);
  });

  app.get('/api/projects/:projectId/versions', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listVersionsForProject(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/versions/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { id } = request.params as { id: string };
    const result = await trackingService.getVersion(userId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  // ── ACCESS, SHARED PASSWORDS & AUDIT (REQ-SEC-005, REQ-SEC-006, REQ-VIEW-001) ──
  app.post('/api/projects/:projectId/shared-passwords', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.createSharedPassword(
      userId,
      projectId,
      request.body as ProjectSharedPasswordCreateInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return reply.code(201).send({ id: result.value.sharedPasswordId });
  });

  app.post('/api/projects/:projectId/shared-passwords/verify', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.verifySharedPassword(
      projectId,
      request.body as ProjectSharedPasswordVerifyInput,
    );
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.get('/api/projects/:projectId/shared-passwords', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId } = request.params as { projectId: string };
    const result = await trackingService.listSharedPasswords(userId, projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  app.delete('/api/projects/:projectId/shared-passwords/:id', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { projectId, id } = request.params as { projectId: string; id: string };
    const result = await trackingService.deleteSharedPassword(userId, projectId, id);
    if (!result.ok) return replyServiceError(reply, result.error);
    return { ok: true };
  });

  app.get('/api/companies/:companyId/audit-logs', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

    const { companyId } = request.params as { companyId: string };
    const query = request.query as { projectId?: string };
    const result = await trackingService.listAuditLogs(userId, companyId, query.projectId);
    if (!result.ok) return replyServiceError(reply, result.error);
    return result.value;
  });

  // ── BATCH WRITE ENDPOINT (REQ-IMP-005, D35) ──────────────────
  app.post('/api/companies/:companyId/batch', async (request, reply) => {
    const actor = await authenticateRequest(request, sessions, serviceTokens, cookieName);
    if (!actor) return unauthenticated(reply);
    const userId = actor.userId;

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

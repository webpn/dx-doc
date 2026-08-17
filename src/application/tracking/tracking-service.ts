import { randomUUID } from 'node:crypto';

import type {
  DestinationRepository,
  ModuleRepository,
  NavigationEventRepository,
  PropertyRepository,
  TrackingRepository,
} from '@project/application/ports/tracking-repositories';
import {
  applyModuleToTracking,
  detectPropertyHierarchyCycle,
  removePropertyFromTracking,
} from '@project/domain/composition';
import type { DataLayerProperty } from '@project/domain/entities';
import { err, ok, type Result } from '@project/shared/result';

import type { PermissionService } from '../auth/permissions';
import type { ProjectRepository } from '../ports/project-repository';
import type { ValidationIssue } from '../validation/issues';
import {
  destinationCreateSchema,
  moduleCreateSchema,
  propertyCreateSchema,
  trackingCreateSchema,
  type DestinationCreateInput,
  type ModuleCreateInput,
  type PropertyCreateInput,
  type TrackingCreateInput,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export type TrackingServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'hierarchy_cycle' }
  | { kind: 'cross_project_reference' };

export class TrackingService {
  constructor(
    private readonly properties: PropertyRepository,
    private readonly modules: ModuleRepository,
    private readonly destinations: DestinationRepository,
    private readonly navEvents: NavigationEventRepository,
    private readonly trackings: TrackingRepository,
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = () => randomUUID(),
  ) {}

  // --- PROPERTIES ---
  async createProperty(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: PropertyCreateInput,
  ): Promise<Result<{ propertyId: string }, TrackingServiceError>> {
    const parsed = validate(propertyCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (projectId !== null) {
      const project = await this.projects.getProjectById(projectId);
      if (!project) return err({ kind: 'not_found' });
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      // Company catalogue — managed by Admin role (REQ-SEC-010, REQ-DOM-019)
      if (!(await this.permissions.canInCompany(actorId, companyId, 'company.manage_catalogue'))) {
        return err({ kind: 'forbidden' });
      }
    }

    const data = parsed.value;

    // Check parent hierarchy cycle if parent is specified
    if (data.parentPropertyId) {
      const allProps = await this.properties.listProperties(companyId, projectId);
      const propMap = new Map(
        allProps.map((p) => [p.id, { id: p.id, parentPropertyId: p.parentPropertyId }]),
      );
      const newPropId = this.newId();
      if (detectPropertyHierarchyCycle(newPropId, data.parentPropertyId, propMap)) {
        return err({ kind: 'hierarchy_cycle' });
      }
    }

    const propertyId = this.newId();
    const nowIso = this.now().toISOString();

    const propRecord: DataLayerProperty = {
      id: propertyId,
      companyId,
      projectId,
      name: data.name,
      businessLabel: data.businessLabel ?? null,
      description: data.description ?? null,
      dataSource: data.dataSource,
      type: data.type,
      formatPattern: data.formatPattern ?? null,
      allowedValues: data.allowedValues ?? null,
      exampleValues: data.exampleValues ?? null,
      piiFlag: data.piiFlag,
      hashingPolicy: data.hashingPolicy ?? null,
      status: data.status,
      introducedInVersion: null,
      analysisNotes: data.analysisNotes ?? null,
      aepFieldGroup: data.aepFieldGroup ?? null,
      parentPropertyId: data.parentPropertyId ?? null,
      derivedFrom: data.derivedFrom ?? null,
      customId: data.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.properties.createProperty(propRecord);
    return ok({ propertyId });
  }

  // --- MODULES ---
  async createModule(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: ModuleCreateInput,
  ): Promise<Result<{ moduleId: string }, TrackingServiceError>> {
    const parsed = validate(moduleCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (!(await this.permissions.canInCompany(actorId, companyId, 'company.manage_catalogue'))) {
        return err({ kind: 'forbidden' });
      }
    }

    const moduleId = this.newId();
    const nowIso = this.now().toISOString();

    await this.modules.createModule({
      id: moduleId,
      companyId,
      projectId,
      name: parsed.value.name,
      description: parsed.value.description ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (parsed.value.propertyIds.length > 0) {
      await this.modules.setModuleProperties(moduleId, parsed.value.propertyIds, nowIso);
    }

    return ok({ moduleId });
  }

  // --- DESTINATIONS ---
  async createDestination(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: DestinationCreateInput,
  ): Promise<Result<{ destinationId: string }, TrackingServiceError>> {
    const parsed = validate(destinationCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (!(await this.permissions.canInCompany(actorId, companyId, 'company.manage_catalogue'))) {
        return err({ kind: 'forbidden' });
      }
    }

    const destinationId = this.newId();
    const nowIso = this.now().toISOString();

    await this.destinations.createDestination({
      id: destinationId,
      companyId,
      projectId,
      platform: parsed.value.platform,
      variableType: parsed.value.variableType,
      identifier: parsed.value.identifier,
      name: parsed.value.name,
      reconciliationIdentifier: parsed.value.reconciliationIdentifier ?? null,
      notes: parsed.value.notes ?? null,
      platformAttributes: parsed.value.platformAttributes ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ destinationId });
  }

  // --- TRACKING & COMPOSITION ---
  async createTracking(
    actorId: string,
    projectId: string,
    input: TrackingCreateInput,
  ): Promise<Result<{ trackingId: string }, TrackingServiceError>> {
    const parsed = validate(trackingCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const navEvent = await this.navEvents.getNavigationEventById(parsed.value.navigationEventId);
    if (navEvent?.projectId !== projectId) {
      return err({ kind: 'not_found' });
    }

    const trackingId = this.newId();
    const nowIso = this.now().toISOString();

    await this.trackings.createTracking({
      id: trackingId,
      projectId,
      pageId: parsed.value.pageId ?? null,
      navigationEventId: parsed.value.navigationEventId,
      name: parsed.value.name,
      slug: parsed.value.slug,
      description: parsed.value.description ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ trackingId });
  }

  async applyModuleToTracking(
    actorId: string,
    trackingId: string,
    moduleId: string,
  ): Promise<Result<{ trackingId: string }, TrackingServiceError>> {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const mod = await this.modules.getModuleById(moduleId);
    if (!mod) return err({ kind: 'not_found' });

    // REQ-DOM-028: Check project match
    if (mod.projectId !== null && mod.projectId !== tracking.projectId) {
      return err({ kind: 'cross_project_reference' });
    }

    const modPropIds = await this.modules.getModulePropertyIds(moduleId);
    const existingTps = await this.trackings.getTrackingProperties(trackingId);
    const existingModIds = await this.trackings.getTrackingModuleIds(trackingId);

    const nowIso = this.now().toISOString();
    const nextState = applyModuleToTracking(
      {
        trackingId,
        appliedModuleIds: existingModIds,
        trackingProperties: existingTps,
      },
      moduleId,
      modPropIds,
      this.newId,
      nowIso,
    );

    await this.trackings.setTrackingModules(trackingId, nextState.appliedModuleIds, nowIso);
    await this.trackings.setTrackingProperties(nextState.trackingProperties);

    return ok({ trackingId });
  }

  async removePropertyFromTracking(
    actorId: string,
    trackingId: string,
    propertyId: string,
  ): Promise<Result<{ trackingId: string; warnModuleDetached: boolean }, TrackingServiceError>> {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const existingTps = await this.trackings.getTrackingProperties(trackingId);
    const existingModIds = await this.trackings.getTrackingModuleIds(trackingId);

    const modulePropMap = new Map<string, string[]>();
    for (const mId of existingModIds) {
      const pIds = await this.modules.getModulePropertyIds(mId);
      modulePropMap.set(mId, pIds);
    }

    const result = removePropertyFromTracking(
      {
        trackingId,
        appliedModuleIds: existingModIds,
        trackingProperties: existingTps,
      },
      propertyId,
      modulePropMap,
    );

    const targetTp = existingTps.find((tp) => tp.propertyId === propertyId);
    if (targetTp) {
      await this.trackings.removeTrackingProperty(targetTp.id);
    }

    const nowIso = this.now().toISOString();
    await this.trackings.setTrackingModules(trackingId, result.updatedAppliedModuleIds, nowIso);

    return ok({
      trackingId,
      warnModuleDetached: result.warnModuleDetached,
    });
  }

  // --- CATALOGUE COPY (REQ-DOM-019) ---
  async copyCatalogueToProject(
    actorId: string,
    companyId: string,
    projectId: string,
    selection: {
      propertyIds?: string[];
      moduleIds?: string[];
    },
  ): Promise<Result<{ copiedProperties: number; copiedModules: number }, TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    let copiedProperties = 0;
    let copiedModules = 0;
    const nowIso = this.now().toISOString();

    if ((selection.propertyIds?.length ?? 0) > 0) {
      for (const pId of selection.propertyIds ?? []) {
        const catProp = await this.properties.getPropertyById(pId);
        if (catProp?.companyId === companyId) {
          // Fresh independent copy with no provenance column (REQ-DOM-019)
          await this.properties.createProperty({
            ...catProp,
            id: this.newId(),
            projectId,
            customId: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          copiedProperties++;
        }
      }
    }

    if ((selection.moduleIds?.length ?? 0) > 0) {
      for (const mId of selection.moduleIds ?? []) {
        const catMod = await this.modules.getModuleById(mId);
        if (catMod?.companyId === companyId) {
          const newModId = this.newId();
          await this.modules.createModule({
            ...catMod,
            id: newModId,
            projectId,
            customId: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          const propIds = await this.modules.getModulePropertyIds(mId);
          if (propIds.length > 0) {
            await this.modules.setModuleProperties(newModId, propIds, nowIso);
          }
          copiedModules++;
        }
      }
    }

    return ok({ copiedProperties, copiedModules });
  }
}

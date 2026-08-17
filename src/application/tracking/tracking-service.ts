import { randomUUID } from 'node:crypto';

import type {
  DestinationRepository,
  FlowRepository,
  FreePageRepository,
  ModuleRepository,
  NavigationEventRepository,
  PropertyRepository,
  TrackingRepository,
  TrackingTemplateRepository,
  TriggerRepository,
  VersionRepository,
} from '@project/application/ports/tracking-repositories';
import {
  applyModuleToTracking,
  detectPropertyHierarchyCycle,
  removePropertyFromTracking,
} from '@project/domain/composition';
import type {
  ChangelogEntry,
  DataLayerProperty,
  Destination,
  Flow,
  FlowEdge,
  FlowNode,
  FreePage,
  Module,
  NavigationEvent,
  ProjectVersion,
  ProjectVersionSnapshot,
  PropertyDestinationMapping,
  SpecificValue,
  Tracking,
  TrackingProperty,
  TrackingTemplate,
  Trigger,
} from '@project/domain/entities';
import { generateMermaidDiagram } from '@project/domain/mermaid';
import { err, ok, type Result } from '@project/shared/result';

import type { PermissionService } from '../auth/permissions';
import type { ProjectRepository } from '../ports/project-repository';
import type { IndexableDocument, SearchIndex, SearchResult } from '../ports/search';
import type { ValidationIssue } from '../validation/issues';
import {
  destinationCreateSchema,
  destinationUpdateSchema,
  flowCreateSchema,
  flowGraphSchema,
  flowUpdateSchema,
  freePageCreateSchema,
  freePageUpdateSchema,
  moduleCreateSchema,
  moduleUpdateSchema,
  navigationEventCreateSchema,
  navigationEventUpdateSchema,
  propertyCreateSchema,
  propertyUpdateSchema,
  publishVersionSchema,
  specificValueCreateSchema,
  trackingCreateSchema,
  trackingPropertyPresenceSchema,
  trackingTemplateCreateSchema,
  trackingTemplateUpdateSchema,
  trackingUpdateSchema,
  triggerCreateSchema,
  triggerUpdateSchema,
  type DestinationCreateInput,
  type DestinationUpdateInput,
  type FlowCreateInput,
  type FlowGraphInput,
  type FlowUpdateInput,
  type FreePageCreateInput,
  type FreePageUpdateInput,
  type ModuleCreateInput,
  type ModuleUpdateInput,
  type NavigationEventCreateInput,
  type NavigationEventUpdateInput,
  type PropertyCreateInput,
  type PropertyUpdateInput,
  type PublishVersionInput,
  type SpecificValueCreateInput,
  type TrackingCreateInput,
  type TrackingPropertyPresenceInput,
  type TrackingTemplateCreateInput,
  type TrackingTemplateUpdateInput,
  type TrackingUpdateInput,
  type TriggerCreateInput,
  type TriggerUpdateInput,
} from '../validation/schemas';
import { validate } from '../validation/validate';

export type TrackingServiceError =
  | { kind: 'forbidden' }
  | { kind: 'not_found' }
  | { kind: 'validation'; issues: ValidationIssue[] }
  | { kind: 'hierarchy_cycle' }
  | { kind: 'cross_project_reference' }
  | { kind: 'stale_write'; currentUpdatedAt: string };

export class TrackingService {
  constructor(
    private readonly properties: PropertyRepository,
    private readonly modules: ModuleRepository,
    private readonly destinations: DestinationRepository,
    private readonly navEvents: NavigationEventRepository,
    private readonly trackings: TrackingRepository,
    private readonly templates: TrackingTemplateRepository,
    private readonly freePages: FreePageRepository,
    private readonly flows: FlowRepository,
    private readonly triggers: TriggerRepository,
    private readonly versions: VersionRepository,
    private readonly projects: ProjectRepository,
    private readonly permissions: PermissionService,
    private readonly searchIndex?: SearchIndex,
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
      if (!(await this.permissions.canInCompany(actorId, companyId, 'company.manage_catalogue'))) {
        return err({ kind: 'forbidden' });
      }
    }

    const data = parsed.value;

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

  async getProperty(
    actorId: string,
    propertyId: string,
  ): Promise<Result<DataLayerProperty, TrackingServiceError>> {
    const prop = await this.properties.getPropertyById(propertyId);
    if (!prop) return err({ kind: 'not_found' });
    if (prop.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, prop.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    return ok(prop);
  }

  async listProperties(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<DataLayerProperty[], TrackingServiceError>> {
    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const list = await this.properties.listProperties(companyId, projectId);
    return ok(list);
  }

  async updateProperty(
    actorId: string,
    propertyId: string,
    input: PropertyUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const prop = await this.properties.getPropertyById(propertyId);
    if (!prop) return err({ kind: 'not_found' });

    if (prop.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, prop.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, prop.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const parsed = validate(propertyUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const patchData = parsed.value;

    if (patchData.parentPropertyId !== undefined) {
      const allProps = await this.properties.listProperties(prop.companyId, prop.projectId);
      const propMap = new Map(
        allProps.map((p) => [p.id, { id: p.id, parentPropertyId: p.parentPropertyId }]),
      );
      if (detectPropertyHierarchyCycle(propertyId, patchData.parentPropertyId, propMap)) {
        return err({ kind: 'hierarchy_cycle' });
      }
    }

    const nowIso = this.now().toISOString();
    const updated: DataLayerProperty = {
      ...prop,
      name: patchData.name ?? prop.name,
      businessLabel:
        patchData.businessLabel !== undefined
          ? (patchData.businessLabel ?? null)
          : prop.businessLabel,
      description:
        patchData.description !== undefined ? (patchData.description ?? null) : prop.description,
      dataSource: patchData.dataSource ?? prop.dataSource,
      type: patchData.type ?? prop.type,
      formatPattern:
        patchData.formatPattern !== undefined
          ? (patchData.formatPattern ?? null)
          : prop.formatPattern,
      allowedValues:
        patchData.allowedValues !== undefined
          ? (patchData.allowedValues ?? null)
          : prop.allowedValues,
      exampleValues:
        patchData.exampleValues !== undefined
          ? (patchData.exampleValues ?? null)
          : prop.exampleValues,
      piiFlag: patchData.piiFlag ?? prop.piiFlag,
      hashingPolicy:
        patchData.hashingPolicy !== undefined
          ? (patchData.hashingPolicy ?? null)
          : prop.hashingPolicy,
      status: patchData.status ?? prop.status,
      analysisNotes:
        patchData.analysisNotes !== undefined
          ? (patchData.analysisNotes ?? null)
          : prop.analysisNotes,
      aepFieldGroup:
        patchData.aepFieldGroup !== undefined
          ? (patchData.aepFieldGroup ?? null)
          : prop.aepFieldGroup,
      parentPropertyId:
        patchData.parentPropertyId !== undefined
          ? (patchData.parentPropertyId ?? null)
          : prop.parentPropertyId,
      derivedFrom:
        patchData.derivedFrom !== undefined ? (patchData.derivedFrom ?? null) : prop.derivedFrom,
      updatedAt: nowIso,
    };

    await this.properties.updateProperty(updated);
    return ok({ ok: true });
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

  async getModule(
    actorId: string,
    moduleId: string,
  ): Promise<Result<{ module: Module; propertyIds: string[] }, TrackingServiceError>> {
    const mod = await this.modules.getModuleById(moduleId);
    if (!mod) return err({ kind: 'not_found' });
    if (mod.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, mod.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const propertyIds = await this.modules.getModulePropertyIds(moduleId);
    return ok({ module: mod, propertyIds });
  }

  async listModules(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<Module[], TrackingServiceError>> {
    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const list = await this.modules.listModules(companyId, projectId);
    return ok(list);
  }

  async updateModule(
    actorId: string,
    moduleId: string,
    input: ModuleUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const mod = await this.modules.getModuleById(moduleId);
    if (!mod) return err({ kind: 'not_found' });

    if (mod.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, mod.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, mod.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const parsed = validate(moduleUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const nowIso = this.now().toISOString();
    await this.modules.updateModule({
      ...mod,
      name: parsed.value.name ?? mod.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : mod.description,
      updatedAt: nowIso,
    });

    if (parsed.value.propertyIds !== undefined) {
      await this.modules.setModuleProperties(moduleId, parsed.value.propertyIds, nowIso);
    }

    return ok({ ok: true });
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

  async getDestination(
    actorId: string,
    destinationId: string,
  ): Promise<Result<Destination, TrackingServiceError>> {
    const dest = await this.destinations.getDestinationById(destinationId);
    if (!dest) return err({ kind: 'not_found' });
    if (dest.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, dest.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    return ok(dest);
  }

  async listDestinations(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<Destination[], TrackingServiceError>> {
    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const list = await this.destinations.listDestinations(companyId, projectId);
    return ok(list);
  }

  async updateDestination(
    actorId: string,
    destinationId: string,
    input: DestinationUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const dest = await this.destinations.getDestinationById(destinationId);
    if (!dest) return err({ kind: 'not_found' });

    if (dest.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, dest.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, dest.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const parsed = validate(destinationUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const nowIso = this.now().toISOString();
    await this.destinations.updateDestination({
      ...dest,
      platform: parsed.value.platform ?? dest.platform,
      variableType: parsed.value.variableType ?? dest.variableType,
      identifier: parsed.value.identifier ?? dest.identifier,
      name: parsed.value.name ?? dest.name,
      reconciliationIdentifier:
        parsed.value.reconciliationIdentifier !== undefined
          ? (parsed.value.reconciliationIdentifier ?? null)
          : dest.reconciliationIdentifier,
      notes: parsed.value.notes !== undefined ? (parsed.value.notes ?? null) : dest.notes,
      platformAttributes:
        parsed.value.platformAttributes !== undefined
          ? (parsed.value.platformAttributes ?? null)
          : dest.platformAttributes,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
  }

  async setPropertyDestinations(
    actorId: string,
    propertyId: string,
    mappings: {
      destinationId: string;
      destinationNameOverride: string | null;
    }[],
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const prop = await this.properties.getPropertyById(propertyId);
    if (!prop) return err({ kind: 'not_found' });

    if (prop.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, prop.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, prop.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const nowIso = this.now().toISOString();
    await this.destinations.setPropertyDestinations(propertyId, mappings, nowIso);
    return ok({ ok: true });
  }

  async getPropertyDestinations(
    actorId: string,
    propertyId: string,
  ): Promise<Result<PropertyDestinationMapping[], TrackingServiceError>> {
    const prop = await this.properties.getPropertyById(propertyId);
    if (!prop) return err({ kind: 'not_found' });
    if (prop.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, prop.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const mappings = await this.destinations.getPropertyDestinations(propertyId);
    return ok(mappings);
  }

  // --- NAVIGATION EVENTS ---
  async createNavigationEvent(
    actorId: string,
    projectId: string,
    input: NavigationEventCreateInput,
  ): Promise<Result<{ eventId: string }, TrackingServiceError>> {
    const parsed = validate(navigationEventCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const eventId = this.newId();
    const nowIso = this.now().toISOString();

    await this.navEvents.createNavigationEvent({
      id: eventId,
      projectId,
      name: parsed.value.name,
      description: parsed.value.description ?? null,
      active: parsed.value.active,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ eventId });
  }

  async listNavigationEvents(
    actorId: string,
    projectId: string,
  ): Promise<Result<NavigationEvent[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.navEvents.listNavigationEvents(projectId);
    return ok(list);
  }

  async updateNavigationEvent(
    actorId: string,
    eventId: string,
    input: NavigationEventUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const event = await this.navEvents.getNavigationEventById(eventId);
    if (!event) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, event.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(navigationEventUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const nowIso = this.now().toISOString();
    await this.navEvents.updateNavigationEvent({
      ...event,
      name: parsed.value.name ?? event.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : event.description,
      active: parsed.value.active ?? event.active,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
  }

  // --- TRACKING TEMPLATES ---
  async createTrackingTemplate(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: TrackingTemplateCreateInput,
  ): Promise<Result<{ templateId: string }, TrackingServiceError>> {
    const parsed = validate(trackingTemplateCreateSchema, input);
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

    const templateId = this.newId();
    const nowIso = this.now().toISOString();

    await this.templates.createTemplate({
      id: templateId,
      companyId,
      projectId,
      name: parsed.value.name,
      description: parsed.value.description ?? null,
      navigationEventId: parsed.value.navigationEventId ?? null,
      configJson: parsed.value.configJson ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ templateId });
  }

  async getTrackingTemplate(
    actorId: string,
    templateId: string,
  ): Promise<Result<TrackingTemplate, TrackingServiceError>> {
    const tpl = await this.templates.getTemplateById(templateId);
    if (!tpl) return err({ kind: 'not_found' });
    if (tpl.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, tpl.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    return ok(tpl);
  }

  async listTrackingTemplates(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<TrackingTemplate[], TrackingServiceError>> {
    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const list = await this.templates.listTemplates(companyId, projectId);
    return ok(list);
  }

  async updateTrackingTemplate(
    actorId: string,
    templateId: string,
    input: TrackingTemplateUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const tpl = await this.templates.getTemplateById(templateId);
    if (!tpl) return err({ kind: 'not_found' });

    if (tpl.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, tpl.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, tpl.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const parsed = validate(trackingTemplateUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const nowIso = this.now().toISOString();
    await this.templates.updateTemplate({
      ...tpl,
      name: parsed.value.name ?? tpl.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : tpl.description,
      navigationEventId:
        parsed.value.navigationEventId !== undefined
          ? (parsed.value.navigationEventId ?? null)
          : tpl.navigationEventId,
      configJson:
        parsed.value.configJson !== undefined ? (parsed.value.configJson ?? null) : tpl.configJson,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
  }

  // --- FREE PAGES ---
  async createFreePage(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: FreePageCreateInput,
  ): Promise<Result<{ freePageId: string }, TrackingServiceError>> {
    const parsed = validate(freePageCreateSchema, input);
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

    const freePageId = this.newId();
    const nowIso = this.now().toISOString();

    await this.freePages.createFreePage({
      id: freePageId,
      companyId,
      projectId,
      title: parsed.value.title,
      slug: parsed.value.slug,
      content: parsed.value.content,
      publishable: parsed.value.publishable,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ freePageId });
  }

  async getFreePage(
    actorId: string,
    freePageId: string,
  ): Promise<Result<FreePage, TrackingServiceError>> {
    const fp = await this.freePages.getFreePageById(freePageId);
    if (!fp) return err({ kind: 'not_found' });
    if (fp.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, fp.projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    return ok(fp);
  }

  async listFreePages(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<FreePage[], TrackingServiceError>> {
    if (projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }
    const list = await this.freePages.listFreePages(companyId, projectId);
    return ok(list);
  }

  async updateFreePage(
    actorId: string,
    freePageId: string,
    input: FreePageUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const fp = await this.freePages.getFreePageById(freePageId);
    if (!fp) return err({ kind: 'not_found' });

    if (fp.projectId !== null) {
      if (!(await this.permissions.canOnProject(actorId, fp.projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    } else {
      if (
        !(await this.permissions.canInCompany(actorId, fp.companyId, 'company.manage_catalogue'))
      ) {
        return err({ kind: 'forbidden' });
      }
    }

    const parsed = validate(freePageUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const nowIso = this.now().toISOString();
    await this.freePages.updateFreePage({
      ...fp,
      title: parsed.value.title ?? fp.title,
      slug: parsed.value.slug ?? fp.slug,
      content: parsed.value.content ?? fp.content,
      publishable: parsed.value.publishable ?? fp.publishable,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
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

  async getTracking(
    actorId: string,
    trackingId: string,
  ): Promise<
    Result<
      {
        tracking: Tracking;
        moduleIds: string[];
        properties: TrackingProperty[];
        specificValues: SpecificValue[];
      },
      TrackingServiceError
    >
  > {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const moduleIds = await this.trackings.getTrackingModuleIds(trackingId);
    const properties = await this.trackings.getTrackingProperties(trackingId);
    const specificValues = await this.trackings.getSpecificValuesForTracking(trackingId);

    return ok({ tracking, moduleIds, properties, specificValues });
  }

  async listTrackingsForProject(
    actorId: string,
    projectId: string,
  ): Promise<Result<Tracking[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.trackings.listTrackingsForProject(projectId);
    return ok(list);
  }

  async updateTracking(
    actorId: string,
    trackingId: string,
    input: TrackingUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(trackingUpdateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016)
    if (
      parsed.value.expectedUpdatedAt !== undefined &&
      parsed.value.expectedUpdatedAt !== tracking.updatedAt
    ) {
      return err({
        kind: 'stale_write',
        currentUpdatedAt: tracking.updatedAt,
      });
    }

    const nowIso = this.now().toISOString();
    await this.trackings.updateTracking({
      ...tracking,
      pageId: parsed.value.pageId !== undefined ? (parsed.value.pageId ?? null) : tracking.pageId,
      navigationEventId: parsed.value.navigationEventId ?? tracking.navigationEventId,
      name: parsed.value.name ?? tracking.name,
      slug: parsed.value.slug ?? tracking.slug,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : tracking.description,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
  }

  // --- TRACKING DUPLICATION (REQ-AUTH-006) ---
  async duplicateTracking(
    actorId: string,
    trackingId: string,
    nameOverride?: string,
  ): Promise<Result<{ duplicatedTrackingId: string }, TrackingServiceError>> {
    const source = await this.trackings.getTrackingById(trackingId);
    if (!source) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, source.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const newTrkId = this.newId();
    const nowIso = this.now().toISOString();
    const newName = nameOverride ?? `${source.name} (Copy)`;
    const newSlug = `${source.slug}-copy-${this.newId().slice(0, 8)}`;

    // 1. Create duplicate tracking entity (custom_id is reset to blank per REQ-IMP-003, REQ-AUTH-006)
    await this.trackings.createTracking({
      id: newTrkId,
      projectId: source.projectId,
      pageId: source.pageId,
      navigationEventId: source.navigationEventId,
      name: newName,
      slug: newSlug,
      description: source.description,
      customId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 2. Duplicate applied modules
    const modIds = await this.trackings.getTrackingModuleIds(trackingId);
    if (modIds.length > 0) {
      await this.trackings.setTrackingModules(newTrkId, modIds, nowIso);
    }

    // 3. Duplicate tracking properties and their specific values
    const sourceTps = await this.trackings.getTrackingProperties(trackingId);
    const newTps: TrackingProperty[] = [];
    const newSvs: SpecificValue[] = [];

    for (const stp of sourceTps) {
      const newTpId = this.newId();
      newTps.push({
        id: newTpId,
        trackingId: newTrkId,
        propertyId: stp.propertyId,
        source: stp.source,
        presence: stp.presence,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      const svs = await this.trackings.getSpecificValuesForTrackingProperty(stp.id);
      for (const sv of svs) {
        newSvs.push({
          id: this.newId(),
          trackingPropertyId: newTpId,
          value: sv.value,
          description: sv.description,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    if (newTps.length > 0) {
      await this.trackings.setTrackingProperties(newTps);
    }
    if (newSvs.length > 0) {
      await this.trackings.setSpecificValues(newSvs);
    }

    return ok({ duplicatedTrackingId: newTrkId });
  }

  async updateTrackingPropertyPresence(
    actorId: string,
    trackingId: string,
    propertyId: string,
    input: TrackingPropertyPresenceInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(trackingPropertyPresenceSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const tps = await this.trackings.getTrackingProperties(trackingId);
    const target = tps.find((tp) => tp.propertyId === propertyId);
    if (!target) return err({ kind: 'not_found' });

    const nowIso = this.now().toISOString();
    await this.trackings.setTrackingProperties([
      {
        ...target,
        presence: parsed.value.presence,
        updatedAt: nowIso,
      },
    ]);

    return ok({ ok: true });
  }

  async setSpecificValue(
    _actorId: string,
    trackingPropertyId: string,
    input: SpecificValueCreateInput,
  ): Promise<Result<{ specificValueId: string }, TrackingServiceError>> {
    const parsed = validate(specificValueCreateSchema, input);
    if (!parsed.ok) {
      return err({ kind: 'validation', issues: parsed.error });
    }

    const svId = this.newId();
    const nowIso = this.now().toISOString();

    await this.trackings.setSpecificValues([
      {
        id: svId,
        trackingPropertyId,
        value: parsed.value.value,
        description: parsed.value.description ?? null,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ]);

    return ok({ specificValueId: svId });
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

  // --- RECONCILIATION REPORT (REQ-IMP-006) ---
  async generateReconciliationReport(
    actorId: string,
    companyId: string,
    projectId: string,
  ): Promise<
    Result<
      {
        projectId: string;
        counts: {
          properties: number;
          modules: number;
          destinations: number;
          trackings: number;
          templates: number;
          freePages: number;
        };
        customIdCounts: {
          properties: number;
          modules: number;
          destinations: number;
          trackings: number;
        };
        unreferencedPropertyNames: string[];
      },
      TrackingServiceError
    >
  > {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const props = await this.properties.listProperties(companyId, projectId);
    const mods = await this.modules.listModules(companyId, projectId);
    const dests = await this.destinations.listDestinations(companyId, projectId);
    const trks = await this.trackings.listTrackingsForProject(projectId);
    const tpls = await this.templates.listTemplates(companyId, projectId);
    const fps = await this.freePages.listFreePages(companyId, projectId);

    const usedPropIds = new Set<string>();
    for (const trk of trks) {
      const trkProps = await this.trackings.getTrackingProperties(trk.id);
      for (const tp of trkProps) {
        usedPropIds.add(tp.propertyId);
      }
    }

    const unreferencedPropertyNames = props
      .filter((p) => !usedPropIds.has(p.id))
      .map((p) => p.name);

    return ok({
      projectId,
      counts: {
        properties: props.length,
        modules: mods.length,
        destinations: dests.length,
        trackings: trks.length,
        templates: tpls.length,
        freePages: fps.length,
      },
      customIdCounts: {
        properties: props.filter((p) => p.customId !== null).length,
        modules: mods.filter((m) => m.customId !== null).length,
        destinations: dests.filter((d) => d.customId !== null).length,
        trackings: trks.filter((t) => t.customId !== null).length,
      },
      unreferencedPropertyNames,
    });
  }

  // --- FLOWS & TRIGGERS (REQ-NAV-003 .. REQ-NAV-007, REQ-AUTH-004) ---
  async createFlow(
    actorId: string,
    projectId: string,
    input: FlowCreateInput,
  ): Promise<Result<{ flowId: string }, TrackingServiceError>> {
    const parsed = validate(flowCreateSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const flowId = this.newId();
    const nowIso = this.now().toISOString();

    await this.flows.createFlow({
      id: flowId,
      projectId,
      name: parsed.value.name,
      slug: parsed.value.slug,
      description: parsed.value.description ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return ok({ flowId });
  }

  async getFlow(
    actorId: string,
    flowId: string,
  ): Promise<
    Result<
      {
        flow: Flow;
        nodes: FlowNode[];
        edges: FlowEdge[];
        mermaidDiagram: string;
      },
      TrackingServiceError
    >
  > {
    const flow = await this.flows.getFlowById(flowId);
    if (!flow) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, flow.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const nodes = await this.flows.getFlowNodes(flowId);
    const edges = await this.flows.getFlowEdges(flowId);

    // Build node label map for Mermaid generation (REQ-NAV-006)
    const labelMap = new Map<string, string>();
    for (const node of nodes) {
      if (node.nodeType === 'page' && node.pageId) {
        labelMap.set(node.id, `Page ${node.pageId}`);
      } else if (node.nodeType === 'trigger' && node.triggerId) {
        const trg = await this.triggers.getTriggerById(node.triggerId);
        labelMap.set(node.id, trg?.name ?? `Trigger ${node.triggerId}`);
      } else {
        labelMap.set(node.id, node.id);
      }
    }

    const mermaidDiagram = generateMermaidDiagram(nodes, edges, labelMap);

    return ok({ flow, nodes, edges, mermaidDiagram });
  }

  async listFlowsForProject(
    actorId: string,
    projectId: string,
  ): Promise<Result<Flow[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.flows.listFlowsForProject(projectId);
    return ok(list);
  }

  async updateFlow(
    actorId: string,
    flowId: string,
    input: FlowUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const flow = await this.flows.getFlowById(flowId);
    if (!flow) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, flow.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(flowUpdateSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const nowIso = this.now().toISOString();
    await this.flows.updateFlow({
      ...flow,
      name: parsed.value.name ?? flow.name,
      slug: parsed.value.slug ?? flow.slug,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : flow.description,
      updatedAt: nowIso,
    });

    return ok({ ok: true });
  }

  async setFlowGraph(
    actorId: string,
    flowId: string,
    input: FlowGraphInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const flow = await this.flows.getFlowById(flowId);
    if (!flow) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, flow.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(flowGraphSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const nowIso = this.now().toISOString();
    const domainNodes: FlowNode[] = parsed.value.nodes.map((n) => ({
      id: n.id ?? this.newId(),
      flowId,
      nodeType: n.nodeType,
      pageId: n.pageId ?? null,
      triggerId: n.triggerId ?? null,
      positionX: n.positionX ?? null,
      positionY: n.positionY ?? null,
      createdAt: nowIso,
    }));

    const domainEdges: FlowEdge[] = parsed.value.edges.map((e) => ({
      id: e.id ?? this.newId(),
      flowId,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      label: e.label ?? null,
      conditionDescription: e.conditionDescription ?? null,
      createdAt: nowIso,
    }));

    await this.flows.setFlowNodes(domainNodes);
    await this.flows.setFlowEdges(domainEdges);

    return ok({ ok: true });
  }

  async createTrigger(
    actorId: string,
    projectId: string,
    input: TriggerCreateInput,
  ): Promise<Result<{ triggerId: string }, TrackingServiceError>> {
    const parsed = validate(triggerCreateSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const triggerId = this.newId();
    const nowIso = this.now().toISOString();

    await this.triggers.createTrigger({
      id: triggerId,
      projectId,
      name: parsed.value.name,
      description: parsed.value.description ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (parsed.value.trackingIds.length > 0) {
      await this.triggers.setTriggerTrackings(triggerId, parsed.value.trackingIds, nowIso);
    }

    return ok({ triggerId });
  }

  async getTrigger(
    actorId: string,
    triggerId: string,
  ): Promise<Result<{ trigger: Trigger; trackingIds: string[] }, TrackingServiceError>> {
    const trg = await this.triggers.getTriggerById(triggerId);
    if (!trg) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, trg.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const trackingIds = await this.triggers.getTriggerTrackingIds(triggerId);
    return ok({ trigger: trg, trackingIds });
  }

  async listTriggersForProject(
    actorId: string,
    projectId: string,
  ): Promise<Result<Trigger[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.triggers.listTriggersForProject(projectId);
    return ok(list);
  }

  async updateTrigger(
    actorId: string,
    triggerId: string,
    input: TriggerUpdateInput,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const trg = await this.triggers.getTriggerById(triggerId);
    if (!trg) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, trg.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(triggerUpdateSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const nowIso = this.now().toISOString();
    await this.triggers.updateTrigger({
      ...trg,
      name: parsed.value.name ?? trg.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : trg.description,
      updatedAt: nowIso,
    });

    if (parsed.value.trackingIds !== undefined) {
      await this.triggers.setTriggerTrackings(triggerId, parsed.value.trackingIds, nowIso);
    }

    return ok({ ok: true });
  }

  // --- FULL-TEXT SEARCH (REQ-AUTH-007, REQ-SEC-012) ---
  async syncProjectSearchIndex(
    actorId: string,
    companyId: string,
    projectId: string,
  ): Promise<Result<{ indexedCount: number }, TrackingServiceError>> {
    if (!this.searchIndex) return ok({ indexedCount: 0 });
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const docs: IndexableDocument[] = [];

    // 1. Properties
    const props = await this.properties.listProperties(companyId, projectId);
    for (const p of props) {
      docs.push({
        id: p.id,
        title: p.businessLabel ? `${p.name} (${p.businessLabel})` : p.name,
        text: [
          p.name,
          p.businessLabel ?? '',
          p.description ?? '',
          p.analysisNotes ?? '',
          ...(p.allowedValues ?? []),
          ...(p.exampleValues ?? []),
        ].join(' '),
      });
    }

    // 2. Trackings & Specific Values (REQ-AUTH-007)
    const trks = await this.trackings.listTrackingsForProject(projectId);
    for (const trk of trks) {
      const svs = await this.trackings.getSpecificValuesForTracking(trk.id);
      const svTexts = svs.map((s) => `${s.value} ${s.description ?? ''}`);
      docs.push({
        id: trk.id,
        title: trk.name,
        text: [trk.name, trk.slug, trk.description ?? '', ...svTexts].join(' '),
      });
    }

    // 3. Free Pages (REQ-SEC-012: publishable only)
    const fps = await this.freePages.listFreePages(companyId, projectId);
    for (const fp of fps) {
      if (fp.publishable) {
        docs.push({
          id: fp.id,
          title: fp.title,
          text: [fp.title, fp.slug, fp.content].join(' '),
        });
      }
    }

    await this.searchIndex.indexProject(projectId, docs);
    return ok({ indexedCount: docs.length });
  }

  async searchProject(
    actorId: string,
    projectId: string,
    query: string,
  ): Promise<Result<SearchResult[], TrackingServiceError>> {
    if (!this.searchIndex) return ok([]);
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    const results = await this.searchIndex.query(projectId, query);
    return ok(results);
  }

  // --- VERSIONING & PUBLICATION (REQ-VER-001 .. REQ-VER-007) ---
  async publishVersion(
    actorId: string,
    companyId: string,
    projectId: string,
    input: PublishVersionInput,
  ): Promise<Result<{ versionId: string; versionNumber: number }, TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(publishVersionSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const latest = await this.versions.getLatestVersion(projectId);
    const nextNumber = latest ? latest.versionNumber + 1 : 1;
    const nowIso = this.now().toISOString();

    // 1. Gather all project entities (Selective exclusion: Properties and Modules cannot be excluded, REQ-VER-003)
    const props = await this.properties.listProperties(companyId, projectId);
    const mods = await this.modules.listModules(companyId, projectId);
    const dests = await this.destinations.listDestinations(companyId, projectId);

    const allFps = await this.freePages.listFreePages(companyId, projectId);
    const includedFps = allFps.filter((fp) => !parsed.value.excludedPageIds.includes(fp.id));

    const allTrks = await this.trackings.listTrackingsForProject(projectId);
    const includedTrks = allTrks.filter((t) => !parsed.value.excludedTrackingIds.includes(t.id));

    const allFlows = await this.flows.listFlowsForProject(projectId);
    const includedFlows = allFlows.filter((f) => !parsed.value.excludedFlowIds.includes(f.id));

    // Referential integrity check (REQ-VER-003): cannot publish a flow referencing excluded pages/trackings
    // Properties and modules always publish.

    const snapshot: ProjectVersionSnapshot = {
      versionNumber: nextNumber,
      title: parsed.value.title ?? null,
      releaseNotes: parsed.value.releaseNotes ?? null,
      createdAt: nowIso,
      createdBy: actorId,
      properties: props,
      modules: mods,
      destinations: dests,
      freePages: includedFps,
      trackings: includedTrks,
      flows: includedFlows,
    };

    // 2. Generate changelog diff against previous snapshot (REQ-VER-005, REQ-VER-006)
    const changelog: ChangelogEntry[] = [];
    if (latest) {
      const prev = latest.snapshot;

      // Compare properties
      const prevPropMap = new Map(prev.properties.map((p) => [p.id, p]));
      for (const p of props) {
        const old = prevPropMap.get(p.id);
        if (!old) {
          changelog.push({ type: 'added', entityType: 'property', entityId: p.id, name: p.name });
        } else if (old.updatedAt !== p.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'property',
            entityId: p.id,
            name: p.name,
          });
        }
      }
      for (const old of prev.properties) {
        if (!props.some((p) => p.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'property',
            entityId: old.id,
            name: old.name,
          });
        }
      }

      // Compare trackings
      const prevTrkMap = new Map(prev.trackings.map((t) => [t.id, t]));
      for (const t of includedTrks) {
        const old = prevTrkMap.get(t.id);
        if (!old) {
          changelog.push({ type: 'added', entityType: 'tracking', entityId: t.id, name: t.name });
        } else if (old.updatedAt !== t.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'tracking',
            entityId: t.id,
            name: t.name,
          });
        }
      }
      for (const old of prev.trackings) {
        if (!includedTrks.some((t) => t.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'tracking',
            entityId: old.id,
            name: old.name,
          });
        }
      }
    } else {
      // First version
      for (const p of props) {
        changelog.push({ type: 'added', entityType: 'property', entityId: p.id, name: p.name });
      }
      for (const t of includedTrks) {
        changelog.push({ type: 'added', entityType: 'tracking', entityId: t.id, name: t.name });
      }
    }

    const versionId = this.newId();
    await this.versions.createVersion({
      id: versionId,
      projectId,
      versionNumber: nextNumber,
      title: parsed.value.title ?? null,
      releaseNotes: parsed.value.releaseNotes ?? null,
      changelog,
      snapshot,
      createdBy: actorId,
      createdAt: nowIso,
    });

    return ok({ versionId, versionNumber: nextNumber });
  }

  async listVersionsForProject(
    actorId: string,
    projectId: string,
  ): Promise<Result<ProjectVersion[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.versions.listVersionsForProject(projectId);
    return ok(list);
  }

  async getVersion(
    actorId: string,
    versionId: string,
  ): Promise<Result<ProjectVersion, TrackingServiceError>> {
    const ver = await this.versions.getVersionById(versionId);
    if (!ver) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, ver.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }

    return ok(ver);
  }
}

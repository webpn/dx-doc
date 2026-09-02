import { randomUUID } from 'node:crypto';

import type {
  AuditLogRepository,
  DestinationRepository,
  FlowRepository,
  FreePageRepository,
  ModuleRepository,
  NavigationEventRepository,
  PropertyRepository,
  SharedPasswordRepository,
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
  AuditLogEntry,
  ChangelogEntry,
  DataLayerProperty,
  Destination,
  Flow,
  FlowEdge,
  FlowNode,
  FreePage,
  Module,
  NavigationEvent,
  ProjectSharedPassword,
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
import type { PageRepository } from '../ports/page-repository';
import type { PasswordHasher } from '../ports/password-hasher';
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
  projectSharedPasswordCreateSchema,
  projectSharedPasswordVerifySchema,
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
  type ProjectSharedPasswordCreateInput,
  type ProjectSharedPasswordVerifyInput,
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
  | { kind: 'publication_integrity'; reason: string }
  | { kind: 'hierarchy_cycle' }
  | { kind: 'cross_project_reference' }
  | { kind: 'stale_write'; currentUpdatedAt: string }
  | { kind: 'in_use'; reason: string };

type SharedPasswordReadModel = Omit<ProjectSharedPassword, 'passwordHash'>;

interface TrackingTemplateConfig {
  description?: string;
  pageId?: string;
  navigationEventId?: string;
  moduleIds?: string[];
}

function parseTrackingTemplateConfig(configJson: string | null): TrackingTemplateConfig {
  if (configJson === null) return {};
  try {
    const parsed: unknown = JSON.parse(configJson);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    const config: TrackingTemplateConfig = {};
    if (typeof record.description === 'string') config.description = record.description;
    if (typeof record.pageId === 'string') config.pageId = record.pageId;
    if (typeof record.navigationEventId === 'string') {
      config.navigationEventId = record.navigationEventId;
    }
    if (Array.isArray(record.moduleIds) && record.moduleIds.every((id) => typeof id === 'string')) {
      config.moduleIds = record.moduleIds;
    }
    return config;
  } catch {
    return {};
  }
}

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
    private readonly sharedPasswords: SharedPasswordRepository,
    private readonly auditLogs: AuditLogRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly projects: ProjectRepository,
    private readonly pages: PageRepository,
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
      if (project.companyId !== companyId) return err({ kind: 'forbidden' });
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

    const project = await this.projects.getProjectById(propRecord.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: propRecord.companyId,
        projectId: propRecord.projectId,
        actorId,
        action: 'property.created',
        entityType: 'property',
        entityId: propertyId,
        details: { name: propRecord.name, dataSource: propRecord.dataSource },
        createdAt: nowIso,
      });
    }

    return ok({ propertyId });
  }

  async getProperty(
    actorId: string,
    propertyId: string,
  ): Promise<Result<DataLayerProperty, TrackingServiceError>> {
    const prop = await this.properties.getPropertyById(propertyId);
    if (!prop) return err({ kind: 'not_found' });
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        prop.projectId === null ? 'company.manage_catalogue' : 'project.read',
        prop.projectId ?? undefined,
        prop.companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
    }
    return ok(prop);
  }

  async listProperties(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<DataLayerProperty[], TrackingServiceError>> {
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        projectId === null ? 'company.manage_catalogue' : 'project.read',
        projectId ?? undefined,
        companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const applied = await this.properties.updateProperty(updated, patchData.expectedUpdatedAt);
    if (!applied) {
      const current = await this.properties.getPropertyById(propertyId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? prop.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(prop.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: prop.companyId,
        projectId: prop.projectId,
        actorId,
        action: 'property.updated',
        entityType: 'property',
        entityId: propertyId,
        details: { name: updated.name, dataSource: updated.dataSource },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteProperty(
    actorId: string,
    propertyId: string,
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

    const blockers = await this.properties.getPropertyDeletionBlockers(propertyId);
    const reasons: string[] = [];
    if (blockers.trackings > 0) reasons.push(`${String(blockers.trackings)} tracking(s)`);
    if (blockers.modules > 0) reasons.push(`${String(blockers.modules)} module(s)`);
    if (blockers.childProperties > 0) {
      reasons.push(`${String(blockers.childProperties)} child propert(y/ies)`);
    }
    if (reasons.length > 0) {
      return err({ kind: 'in_use', reason: `still referenced by ${reasons.join(', ')}` });
    }

    const nowIso = this.now().toISOString();

    await this.properties.deleteProperty(propertyId);

    const project = await this.projects.getProjectById(prop.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: prop.companyId,
        projectId: prop.projectId,
        actorId,
        action: 'property.deleted',
        entityType: 'property',
        entityId: propertyId,
        details: { name: prop.name },
        createdAt: nowIso,
      });
    }

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
      const project = await this.projects.getProjectById(projectId);
      if (!project) return err({ kind: 'not_found' });
      if (project.companyId !== companyId) return err({ kind: 'forbidden' });
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

    const project = await this.projects.getProjectById(companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId,
        projectId,
        actorId,
        action: 'module.created',
        entityType: 'module',
        entityId: moduleId,
        details: { name: parsed.value.name, propertyCount: parsed.value.propertyIds.length },
        createdAt: nowIso,
      });
    }

    return ok({ moduleId });
  }

  async getModule(
    actorId: string,
    moduleId: string,
  ): Promise<Result<{ module: Module; propertyIds: string[] }, TrackingServiceError>> {
    const mod = await this.modules.getModuleById(moduleId);
    if (!mod) return err({ kind: 'not_found' });
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        mod.projectId === null ? 'company.manage_catalogue' : 'project.read',
        mod.projectId ?? undefined,
        mod.companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
    }
    const propertyIds = await this.modules.getModulePropertyIds(moduleId);
    return ok({ module: mod, propertyIds });
  }

  async listModules(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<Module[], TrackingServiceError>> {
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        projectId === null ? 'company.manage_catalogue' : 'project.read',
        projectId ?? undefined,
        companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedModule: Module = {
      ...mod,
      name: parsed.value.name ?? mod.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : mod.description,
      updatedAt: nowIso,
    };
    const applied = await this.modules.updateModule(updatedModule, parsed.value.expectedUpdatedAt);
    if (!applied) {
      const current = await this.modules.getModuleById(moduleId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? mod.updatedAt,
      });
    }

    if (parsed.value.propertyIds !== undefined) {
      await this.modules.setModuleProperties(moduleId, parsed.value.propertyIds, nowIso);
    }

    const project = await this.projects.getProjectById(mod.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: mod.companyId,
        projectId: mod.projectId,
        actorId,
        action: 'module.updated',
        entityType: 'module',
        entityId: moduleId,
        details: {
          name: parsed.value.name ?? mod.name,
          propertyIdsChanged: parsed.value.propertyIds !== undefined,
        },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteModule(
    actorId: string,
    moduleId: string,
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

    const count = await this.modules.countTrackingsUsingModule(moduleId);
    if (count > 0) {
      return err({
        kind: 'in_use',
        reason: `${String(count)} tracking(s) still reference this module`,
      });
    }

    const nowIso = this.now().toISOString();

    await this.modules.deleteModule(moduleId);

    const project = await this.projects.getProjectById(mod.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: mod.companyId,
        projectId: mod.projectId,
        actorId,
        action: 'module.deleted',
        entityType: 'module',
        entityId: moduleId,
        details: { name: mod.name },
        createdAt: nowIso,
      });
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
      const project = await this.projects.getProjectById(projectId);
      if (!project) return err({ kind: 'not_found' });
      if (project.companyId !== companyId) return err({ kind: 'forbidden' });
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

    const project = await this.projects.getProjectById(companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId,
        projectId,
        actorId,
        action: 'destination.created',
        entityType: 'destination',
        entityId: destinationId,
        details: {
          name: parsed.value.name,
          platform: parsed.value.platform,
          variableType: parsed.value.variableType,
        },
        createdAt: nowIso,
      });
    }

    return ok({ destinationId });
  }

  async getDestination(
    actorId: string,
    destinationId: string,
  ): Promise<Result<Destination, TrackingServiceError>> {
    const dest = await this.destinations.getDestinationById(destinationId);
    if (!dest) return err({ kind: 'not_found' });
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        dest.projectId === null ? 'company.manage_catalogue' : 'project.read',
        dest.projectId ?? undefined,
        dest.companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
    }
    return ok(dest);
  }

  async listDestinations(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<Destination[], TrackingServiceError>> {
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        projectId === null ? 'company.manage_catalogue' : 'project.read',
        projectId ?? undefined,
        companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedDestination: Destination = {
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
    };
    const applied = await this.destinations.updateDestination(
      updatedDestination,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.destinations.getDestinationById(destinationId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? dest.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(dest.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: dest.companyId,
        projectId: dest.projectId,
        actorId,
        action: 'destination.updated',
        entityType: 'destination',
        entityId: destinationId,
        details: { name: dest.name, platform: dest.platform },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteDestination(
    actorId: string,
    destinationId: string,
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

    const count = await this.destinations.countPropertiesUsingDestination(destinationId);
    if (count > 0) {
      return err({
        kind: 'in_use',
        reason: `${String(count)} property mapping(s) still reference this destination`,
      });
    }

    const nowIso = this.now().toISOString();

    await this.destinations.deleteDestination(destinationId);

    const project = await this.projects.getProjectById(dest.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: dest.companyId,
        projectId: dest.projectId,
        actorId,
        action: 'destination.deleted',
        entityType: 'destination',
        entityId: destinationId,
        details: { name: dest.name },
        createdAt: nowIso,
      });
    }

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

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'navigation_event.created',
        entityType: 'navigation_event',
        entityId: eventId,
        details: { name: parsed.value.name, active: parsed.value.active },
        createdAt: nowIso,
      });
    }

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

  async getNavigationEvent(
    actorId: string,
    eventId: string,
  ): Promise<Result<NavigationEvent, TrackingServiceError>> {
    const event = await this.navEvents.getNavigationEventById(eventId);
    if (!event) return err({ kind: 'not_found' });
    if (!(await this.permissions.canOnProject(actorId, event.projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    return ok(event);
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedEvent: NavigationEvent = {
      ...event,
      name: parsed.value.name ?? event.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : event.description,
      active: parsed.value.active ?? event.active,
      updatedAt: nowIso,
    };
    const applied = await this.navEvents.updateNavigationEvent(
      updatedEvent,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.navEvents.getNavigationEventById(eventId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? event.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(event.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: event.projectId,
        actorId,
        action: 'navigation_event.updated',
        entityType: 'navigation_event',
        entityId: eventId,
        details: { name: event.name, active: event.active },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteNavigationEvent(
    actorId: string,
    eventId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const event = await this.navEvents.getNavigationEventById(eventId);
    if (!event) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, event.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const usage = await this.navEvents.countUsageOfNavigationEvent(eventId);
    if (usage.trackings > 0 || usage.templates > 0) {
      return err({
        kind: 'in_use',
        reason: `${String(usage.trackings)} tracking(s) and ${String(usage.templates)} template(s) still reference this navigation event`,
      });
    }

    const nowIso = this.now().toISOString();

    await this.navEvents.deleteNavigationEvent(eventId);

    const project = await this.projects.getProjectById(event.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: event.projectId,
        actorId,
        action: 'navigation_event.deleted',
        entityType: 'navigation_event',
        entityId: eventId,
        details: { name: event.name },
        createdAt: nowIso,
      });
    }

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
      const project = await this.projects.getProjectById(projectId);
      if (!project) return err({ kind: 'not_found' });
      if (project.companyId !== companyId) return err({ kind: 'forbidden' });
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

    const project = await this.projects.getProjectById(companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId,
        projectId,
        actorId,
        action: 'tracking_template.created',
        entityType: 'tracking_template',
        entityId: templateId,
        details: { name: parsed.value.name },
        createdAt: nowIso,
      });
    }

    return ok({ templateId });
  }

  async getTrackingTemplate(
    actorId: string,
    templateId: string,
  ): Promise<Result<TrackingTemplate, TrackingServiceError>> {
    const tpl = await this.templates.getTemplateById(templateId);
    if (!tpl) return err({ kind: 'not_found' });
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        tpl.projectId === null ? 'company.manage_catalogue' : 'project.read',
        tpl.projectId ?? undefined,
        tpl.companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
    }
    return ok(tpl);
  }

  async listTrackingTemplates(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<TrackingTemplate[], TrackingServiceError>> {
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        projectId === null ? 'company.manage_catalogue' : 'project.read',
        projectId ?? undefined,
        companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedTemplate: TrackingTemplate = {
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
    };
    const applied = await this.templates.updateTemplate(
      updatedTemplate,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.templates.getTemplateById(templateId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? tpl.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(tpl.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: tpl.companyId,
        projectId: tpl.projectId,
        actorId,
        action: 'tracking_template.updated',
        entityType: 'tracking_template',
        entityId: templateId,
        details: { name: tpl.name },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteTrackingTemplate(
    actorId: string,
    templateId: string,
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

    await this.templates.deleteTemplate(templateId);

    const nowIso = this.now().toISOString();

    const project = await this.projects.getProjectById(tpl.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: tpl.companyId,
        projectId: tpl.projectId,
        actorId,
        action: 'tracking_template.deleted',
        entityType: 'tracking_template',
        entityId: templateId,
        details: { name: tpl.name },
        createdAt: nowIso,
      });
    }

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
      const project = await this.projects.getProjectById(projectId);
      if (!project) return err({ kind: 'not_found' });
      if (project.companyId !== companyId) return err({ kind: 'forbidden' });
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

    // REQ-AUTH-003 hierarchy: a parent must exist and belong to the same scope.
    // Enforced here, not in the route, so the MCP server gets the same rule
    // (REQ-FDN-010, ADR-0007). The FK alone would allow a parent from another
    // project, which AGENTS.md forbids ("no cross-project references").
    if (parsed.value.parentId !== undefined && parsed.value.parentId !== null) {
      const parent = await this.freePages.getFreePageById(parsed.value.parentId);
      if (parent?.companyId !== companyId || parent.projectId !== projectId) {
        return err({ kind: 'not_found' });
      }
    }

    await this.freePages.createFreePage({
      id: freePageId,
      companyId,
      projectId,
      title: parsed.value.title,
      slug: parsed.value.slug,
      content: parsed.value.content,
      publishable: parsed.value.publishable,
      customId: parsed.value.customId ?? null,
      parentId: parsed.value.parentId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const project = await this.projects.getProjectById(companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId,
        projectId,
        actorId,
        action: 'free_page.created',
        entityType: 'free_page',
        entityId: freePageId,
        details: { title: parsed.value.title, slug: parsed.value.slug },
        createdAt: nowIso,
      });
    }

    return ok({ freePageId });
  }

  async getFreePage(
    actorId: string,
    freePageId: string,
  ): Promise<Result<FreePage, TrackingServiceError>> {
    const fp = await this.freePages.getFreePageById(freePageId);
    if (!fp) return err({ kind: 'not_found' });
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        fp.projectId === null ? 'company.manage_catalogue' : 'project.read',
        fp.projectId ?? undefined,
        fp.companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
    }
    return ok(fp);
  }

  async listFreePages(
    actorId: string,
    companyId: string,
    projectId: string | null,
  ): Promise<Result<FreePage[], TrackingServiceError>> {
    if (
      !(await this.permissions.canOnProjectOrCompany(
        actorId,
        projectId === null ? 'company.manage_catalogue' : 'project.read',
        projectId ?? undefined,
        companyId,
      ))
    ) {
      return err({ kind: 'forbidden' });
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

    // REQ-AUTH-003 reparenting. `parentId` is tri-state here: absent leaves the
    // parent alone, explicit null detaches to a root, an id moves the page. The
    // FK guarantees the target exists but nothing more, so scope, self-parenting
    // and cycles are checked here — in the service, so the MCP server and every
    // other entry point inherit the rule (REQ-FDN-010, ADR-0007).
    let nextParentId = fp.parentId;
    if (parsed.value.parentId !== undefined) {
      if (parsed.value.parentId === null) {
        nextParentId = null;
      } else {
        const target = parsed.value.parentId;
        if (target === freePageId) {
          return err({
            kind: 'validation',
            issues: [
              {
                field: 'parentId',
                code: 'self_parent',
                message: 'a free page cannot be its own parent',
              },
            ],
          });
        }
        const parent = await this.freePages.getFreePageById(target);
        if (parent?.companyId !== fp.companyId || parent.projectId !== fp.projectId) {
          return err({ kind: 'not_found' });
        }
        // Walk up from the proposed parent: meeting this page means the move
        // would close a cycle and detach the whole branch from every root.
        let cursor: string | null = parent.parentId;
        while (cursor !== null) {
          if (cursor === freePageId) {
            // A dedicated error kind already exists for exactly this shape.
            return err({ kind: 'hierarchy_cycle' });
          }
          const ancestor: FreePage | null = await this.freePages.getFreePageById(cursor);
          cursor = ancestor?.parentId ?? null;
        }
        nextParentId = target;
      }
    }

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedFreePage: FreePage = {
      ...fp,
      title: parsed.value.title ?? fp.title,
      slug: parsed.value.slug ?? fp.slug,
      content: parsed.value.content ?? fp.content,
      publishable: parsed.value.publishable ?? fp.publishable,
      parentId: nextParentId,
      updatedAt: nowIso,
    };
    const applied = await this.freePages.updateFreePage(
      updatedFreePage,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.freePages.getFreePageById(freePageId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? fp.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(fp.companyId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: fp.companyId,
        projectId: fp.projectId,
        actorId,
        action: 'free_page.updated',
        entityType: 'free_page',
        entityId: freePageId,
        details: { title: fp.title, slug: fp.slug },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteFreePage(
    actorId: string,
    freePageId: string,
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

    await this.freePages.deleteFreePage(freePageId);

    const project = await this.projects.getProjectById(fp.companyId);
    if (project) {
      const nowIso = this.now().toISOString();
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: fp.companyId,
        projectId: fp.projectId,
        actorId,
        action: 'free_page.deleted',
        entityType: 'free_page',
        entityId: freePageId,
        details: { title: fp.title, slug: fp.slug },
        createdAt: nowIso,
      });
    }

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

    let templateConfig: TrackingTemplateConfig = {};
    if (parsed.value.templateId !== undefined) {
      const template = await this.templates.getTemplateById(parsed.value.templateId);
      if (!template || (template.projectId !== null && template.projectId !== projectId)) {
        return err({ kind: 'not_found' });
      }
      templateConfig = parseTrackingTemplateConfig(template.configJson);
    }

    const navigationEventId = templateConfig.navigationEventId ?? parsed.value.navigationEventId;
    const navEvent = await this.navEvents.getNavigationEventById(navigationEventId);
    if (navEvent?.projectId !== projectId) {
      return err({ kind: 'not_found' });
    }

    const pageId = templateConfig.pageId ?? parsed.value.pageId ?? null;
    if (pageId !== null) {
      const page = await this.pages.getPageById(pageId);
      // REQ-DOM-028: Check project match
      if (page?.projectId !== projectId) {
        return err({ kind: 'cross_project_reference' });
      }
    }

    const trackingId = this.newId();
    const nowIso = this.now().toISOString();

    await this.trackings.createTracking({
      id: trackingId,
      projectId,
      pageId,
      navigationEventId,
      name: parsed.value.name,
      slug: parsed.value.slug,
      description: templateConfig.description ?? parsed.value.description ?? null,
      customId: parsed.value.customId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    if (templateConfig.moduleIds !== undefined) {
      for (const moduleId of templateConfig.moduleIds) {
        const mod = await this.modules.getModuleById(moduleId);
        // REQ-DOM-028: Check project match — catalogue modules (projectId null) are allowed
        if (!mod || (mod.projectId !== null && mod.projectId !== projectId)) {
          return err({ kind: 'cross_project_reference' });
        }
      }
    }

    if (templateConfig.moduleIds !== undefined && templateConfig.moduleIds.length > 0) {
      await this.trackings.setTrackingModules(trackingId, templateConfig.moduleIds, nowIso);

      // Attaching a module is not the same as carrying its properties:
      // `setTrackingModules` only writes the join rows. REQ-DOM-009 promises a
      // blueprint with "preselected modules, preconfigured custom properties",
      // so materialise them through the same domain rule `applyModuleToTracking`
      // uses — otherwise the seeded tracking arrives inert, and default specific
      // values would be impossible (they hang off a trackingPropertyId).
      let state = {
        trackingId,
        appliedModuleIds: templateConfig.moduleIds,
        trackingProperties: [] as TrackingProperty[],
      };
      for (const moduleId of templateConfig.moduleIds) {
        const modPropIds = await this.modules.getModulePropertyIds(moduleId);
        state = applyModuleToTracking(state, moduleId, modPropIds, this.newId, nowIso);
      }
      if (state.trackingProperties.length > 0) {
        await this.trackings.setTrackingProperties(state.trackingProperties);
      }
    }

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'tracking.created',
        entityType: 'tracking',
        entityId: trackingId,
        details: { name: parsed.value.name, slug: parsed.value.slug },
        createdAt: nowIso,
      });
    }

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

    if (parsed.value.pageId !== undefined) {
      const page = await this.pages.getPageById(parsed.value.pageId);
      // REQ-DOM-028: Check project match
      if (page?.projectId !== tracking.projectId) {
        return err({ kind: 'cross_project_reference' });
      }
    }
    if (parsed.value.navigationEventId !== undefined) {
      const navEvent = await this.navEvents.getNavigationEventById(parsed.value.navigationEventId);
      // REQ-DOM-028: Check project match
      if (navEvent?.projectId !== tracking.projectId) {
        return err({ kind: 'cross_project_reference' });
      }
    }

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedTracking: Tracking = {
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
    };
    const applied = await this.trackings.updateTracking(
      updatedTracking,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.trackings.getTrackingById(trackingId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? tracking.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(tracking.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: tracking.projectId,
        actorId,
        action: 'tracking.updated',
        entityType: 'tracking',
        entityId: trackingId,
        details: { name: tracking.name, slug: tracking.slug },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteTracking(
    actorId: string,
    trackingId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const tracking = await this.trackings.getTrackingById(trackingId);
    if (!tracking) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, tracking.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    await this.trackings.deleteTracking(trackingId);

    const project = await this.projects.getProjectById(tracking.projectId);
    if (project) {
      const nowIso = this.now().toISOString();
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: tracking.projectId,
        actorId,
        action: 'tracking.deleted',
        entityType: 'tracking',
        entityId: trackingId,
        details: { name: tracking.name },
        createdAt: nowIso,
      });
    }

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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const applied = await this.trackings.updateTrackingPropertyPresence(
      target.id,
      parsed.value.presence,
      nowIso,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const currentTps = await this.trackings.getTrackingProperties(trackingId);
      const current = currentTps.find((tp) => tp.propertyId === propertyId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? target.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(tracking.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: tracking.projectId,
        actorId,
        action: 'tracking_property.presence_updated',
        entityType: 'tracking_property',
        entityId: target.id,
        details: { propertyId, presence: parsed.value.presence },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async setSpecificValue(
    actorId: string,
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

    const projectId = await this.trackings.getProjectIdForTrackingProperty(trackingPropertyId);
    if (projectId === null) return err({ kind: 'not_found' });
    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'specific_value.created',
        entityType: 'specific_value',
        entityId: svId,
        details: { trackingPropertyId, value: parsed.value.value },
        createdAt: nowIso,
      });
    }

    return ok({ specificValueId: svId });
  }

  /** A leaf value; deletion is unconditional (ADR-0025). */
  async deleteSpecificValue(
    actorId: string,
    specificValueId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const projectId = await this.trackings.getProjectIdForSpecificValue(specificValueId);
    if (projectId === null) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    await this.trackings.deleteSpecificValue(specificValueId);

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      const nowIso = this.now().toISOString();
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'specific_value.deleted',
        entityType: 'specific_value',
        entityId: specificValueId,
        details: {},
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
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
    const existingPropIds = new Set(existingTps.map((tp) => tp.propertyId));
    let addedPropertyCount = 0;
    for (const propId of modPropIds) {
      if (!existingPropIds.has(propId)) {
        addedPropertyCount++;
      }
    }

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

    const project = await this.projects.getProjectById(tracking.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: tracking.projectId,
        actorId,
        action: 'module_applied_to_tracking',
        entityType: 'module_applied_to_tracking',
        entityId: trackingId,
        details: { moduleId, addedPropertyCount },
        createdAt: nowIso,
      });
    }

    return ok({ trackingId });
  }

  /**
   * Which trackings a module's current property set would change, and how
   * (REQ-DOM-007). Read-only: propagation must show what it will change before
   * it changes it, so this shares its diff logic with
   * `propagateModuleToTrackings` and writes nothing.
   *
   * A module lives in one project (or the company catalogue), and trackings
   * materialise a module's properties when it is applied. So "affected" means:
   * trackings that already have this module attached and are missing at least
   * one property the module now carries.
   */
  private async computeModulePropagation(moduleId: string): Promise<
    | { ok: false; error: TrackingServiceError }
    | {
        ok: true;
        projectIds: string[];
        affected: { trackingId: string; addedPropertyIds: string[] }[];
      }
  > {
    const mod = await this.modules.getModuleById(moduleId);
    if (!mod) return { ok: false, error: { kind: 'not_found' } };

    const modPropIds = await this.modules.getModulePropertyIds(moduleId);

    // A catalogue module (projectId null) is not attached to any tracking:
    // trackings only ever reference project modules, because copying to a
    // project is what makes a catalogue module usable (REQ-DOM-019).
    if (mod.projectId === null) {
      return { ok: true, projectIds: [], affected: [] };
    }

    const trackings = await this.trackings.listTrackingsForProject(mod.projectId);
    const affected: { trackingId: string; addedPropertyIds: string[] }[] = [];

    for (const tracking of trackings) {
      const attachedModuleIds = await this.trackings.getTrackingModuleIds(tracking.id);
      if (!attachedModuleIds.includes(moduleId)) continue;

      const existing = await this.trackings.getTrackingProperties(tracking.id);
      const existingIds = new Set(existing.map((tp) => tp.propertyId));
      const addedPropertyIds = modPropIds.filter((id) => !existingIds.has(id));

      // A tracking that already carries every property is not "affected":
      // listing it would overstate what propagation does.
      if (addedPropertyIds.length > 0) {
        affected.push({ trackingId: tracking.id, addedPropertyIds });
      }
    }

    return { ok: true, projectIds: [mod.projectId], affected };
  }

  /** Preview propagation without applying it (REQ-DOM-007). */
  async previewModulePropagation(
    actorId: string,
    moduleId: string,
  ): Promise<
    Result<{ affected: { trackingId: string; addedPropertyIds: string[] }[] }, TrackingServiceError>
  > {
    const computed = await this.computeModulePropagation(moduleId);
    if (!computed.ok) return err(computed.error);

    for (const projectId of computed.projectIds) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
        return err({ kind: 'forbidden' });
      }
    }

    return ok({ affected: computed.affected });
  }

  /**
   * Apply a module's current property set to the trackings already using it
   * (REQ-DOM-007). Never called implicitly by `updateModule`: the default is no
   * propagation, and this is the explicit opt-in.
   *
   * Produces a single audit entry for the whole operation, not one per tracking.
   */
  async propagateModuleToTrackings(
    actorId: string,
    moduleId: string,
  ): Promise<Result<{ updatedTrackingCount: number }, TrackingServiceError>> {
    const computed = await this.computeModulePropagation(moduleId);
    if (!computed.ok) return err(computed.error);

    for (const projectId of computed.projectIds) {
      if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
        return err({ kind: 'forbidden' });
      }
    }

    const nowIso = this.now().toISOString();
    const modPropIds = await this.modules.getModulePropertyIds(moduleId);

    for (const entry of computed.affected) {
      const existingTps = await this.trackings.getTrackingProperties(entry.trackingId);
      const existingModIds = await this.trackings.getTrackingModuleIds(entry.trackingId);

      // Reuse the domain composition rule so a propagated property is
      // indistinguishable from one added by attaching the module by hand.
      const nextState = applyModuleToTracking(
        {
          trackingId: entry.trackingId,
          appliedModuleIds: existingModIds,
          trackingProperties: existingTps,
        },
        moduleId,
        modPropIds,
        this.newId,
        nowIso,
      );

      await this.trackings.setTrackingProperties(nextState.trackingProperties);
    }

    const projectId = computed.projectIds[0];
    if (projectId !== undefined && computed.affected.length > 0) {
      const project = await this.projects.getProjectById(projectId);
      if (project) {
        await this.auditLogs.appendLog({
          id: this.newId(),
          companyId: project.companyId,
          projectId,
          actorId,
          action: 'module_propagated',
          entityType: 'module',
          entityId: moduleId,
          details: {
            updatedTrackingCount: computed.affected.length,
            trackingIds: computed.affected.map((a) => a.trackingId),
          },
          createdAt: nowIso,
        });
      }
    }

    return ok({ updatedTrackingCount: computed.affected.length });
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

    const project = await this.projects.getProjectById(tracking.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: tracking.projectId,
        actorId,
        action: 'module_removed_from_tracking',
        entityType: 'module_removed_from_tracking',
        entityId: trackingId,
        details: { propertyId, warnModuleDetached: result.warnModuleDetached },
        createdAt: nowIso,
      });
    }

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

    // Catalogue property id -> the id of its copy in this project. A copied
    // module must reference the copies, not the catalogue originals: keeping the
    // catalogue's ids would be a live link to the catalogue by another name,
    // which REQ-DOM-019 forbids.
    const copiedPropertyIds = new Map<string, string>();

    const copyProperty = async (cataloguePropertyId: string): Promise<string | null> => {
      const existing = copiedPropertyIds.get(cataloguePropertyId);
      if (existing !== undefined) return existing;

      const catProp = await this.properties.getPropertyById(cataloguePropertyId);
      if (catProp?.companyId !== companyId) return null;

      // Fresh independent copy with no provenance column (REQ-DOM-019)
      const newPropertyId = this.newId();
      await this.properties.createProperty({
        ...catProp,
        id: newPropertyId,
        projectId,
        customId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      copiedPropertyIds.set(cataloguePropertyId, newPropertyId);
      copiedProperties++;
      return newPropertyId;
    };

    for (const pId of selection.propertyIds ?? []) {
      await copyProperty(pId);
    }

    for (const mId of selection.moduleIds ?? []) {
      const catMod = await this.modules.getModuleById(mId);
      if (catMod?.companyId !== companyId) continue;

      const newModId = this.newId();
      await this.modules.createModule({
        ...catMod,
        id: newModId,
        projectId,
        customId: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // A module is only meaningful with its properties, so copy any the caller
      // did not select separately rather than leaving the module pointing at
      // nothing this project owns.
      const cataloguePropIds = await this.modules.getModulePropertyIds(mId);
      const projectPropIds: string[] = [];
      for (const cataloguePropId of cataloguePropIds) {
        const copiedId = await copyProperty(cataloguePropId);
        if (copiedId !== null) projectPropIds.push(copiedId);
      }
      if (projectPropIds.length > 0) {
        await this.modules.setModuleProperties(newModId, projectPropIds, nowIso);
      }
      copiedModules++;
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

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'flow.created',
        entityType: 'flow',
        entityId: flowId,
        details: { name: parsed.value.name, slug: parsed.value.slug },
        createdAt: nowIso,
      });
    }

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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedFlow: Flow = {
      ...flow,
      name: parsed.value.name ?? flow.name,
      slug: parsed.value.slug ?? flow.slug,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : flow.description,
      updatedAt: nowIso,
    };
    const applied = await this.flows.updateFlow(updatedFlow, parsed.value.expectedUpdatedAt);
    if (!applied) {
      const current = await this.flows.getFlowById(flowId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? flow.updatedAt,
      });
    }

    const project = await this.projects.getProjectById(flow.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: flow.projectId,
        actorId,
        action: 'flow.updated',
        entityType: 'flow',
        entityId: flowId,
        details: { name: flow.name, slug: flow.slug },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteFlow(
    actorId: string,
    flowId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const flow = await this.flows.getFlowById(flowId);
    if (!flow) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, flow.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    await this.flows.deleteFlow(flowId);

    const project = await this.projects.getProjectById(flow.projectId);
    if (project) {
      const nowIso = this.now().toISOString();
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: flow.projectId,
        actorId,
        action: 'flow.deleted',
        entityType: 'flow',
        entityId: flowId,
        details: { name: flow.name },
        createdAt: nowIso,
      });
    }

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

    await this.flows.replaceFlowGraph(flowId, domainNodes, domainEdges);

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

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'trigger.created',
        entityType: 'trigger',
        entityId: triggerId,
        details: { name: parsed.value.name, trackingCount: parsed.value.trackingIds.length },
        createdAt: nowIso,
      });
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

    // Optimistic concurrency check (REQ-AUTH-005, ADR-0016): the guard is
    // enforced atomically by the repository's `WHERE updated_at = ?`, so
    // there is no read-compare-write race between the check and the write.
    const nowIso = this.now().toISOString();
    const updatedTrigger: Trigger = {
      ...trg,
      name: parsed.value.name ?? trg.name,
      description:
        parsed.value.description !== undefined
          ? (parsed.value.description ?? null)
          : trg.description,
      updatedAt: nowIso,
    };
    const applied = await this.triggers.updateTrigger(
      updatedTrigger,
      parsed.value.expectedUpdatedAt,
    );
    if (!applied) {
      const current = await this.triggers.getTriggerById(triggerId);
      return err({
        kind: 'stale_write',
        currentUpdatedAt: current?.updatedAt ?? trg.updatedAt,
      });
    }

    if (parsed.value.trackingIds !== undefined) {
      await this.triggers.setTriggerTrackings(triggerId, parsed.value.trackingIds, nowIso);
    }

    const project = await this.projects.getProjectById(trg.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: trg.projectId,
        actorId,
        action: 'trigger.updated',
        entityType: 'trigger',
        entityId: triggerId,
        details: { name: trg.name, trackingIdsChanged: parsed.value.trackingIds !== undefined },
        createdAt: nowIso,
      });
    }

    return ok({ ok: true });
  }

  async deleteTrigger(
    actorId: string,
    triggerId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    const trg = await this.triggers.getTriggerById(triggerId);
    if (!trg) return err({ kind: 'not_found' });

    if (!(await this.permissions.canOnProject(actorId, trg.projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const count = await this.triggers.countFlowNodesUsingTrigger(triggerId);
    if (count > 0) {
      return err({
        kind: 'in_use',
        reason: `${String(count)} flow node(s) still reference this trigger`,
      });
    }

    const nowIso = this.now().toISOString();

    await this.triggers.deleteTrigger(triggerId);

    const project = await this.projects.getProjectById(trg.projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId: trg.projectId,
        actorId,
        action: 'trigger.deleted',
        entityType: 'trigger',
        entityId: triggerId,
        details: { name: trg.name },
        createdAt: nowIso,
      });
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
    const includedFps = allFps.filter(
      (fp) => fp.publishable && !parsed.value.excludedPageIds.includes(fp.id),
    );

    const allTrks = await this.trackings.listTrackingsForProject(projectId);
    const includedTrks = allTrks.filter((t) => !parsed.value.excludedTrackingIds.includes(t.id));

    const allFlows = await this.flows.listFlowsForProject(projectId);
    const includedFlows = allFlows.filter((f) => !parsed.value.excludedFlowIds.includes(f.id));

    // Referential integrity check (REQ-VER-003): cannot publish a flow referencing excluded pages/trackings
    // Properties and modules always publish.
    const includedTrackingIds = new Set(includedTrks.map((tracking) => tracking.id));
    const includedPageIds = new Set(includedFps.map((page) => page.id));
    for (const flow of includedFlows) {
      const nodes = await this.flows.getFlowNodes(flow.id);
      for (const node of nodes) {
        if (node.nodeType === 'page' && node.pageId !== null && !includedPageIds.has(node.pageId)) {
          return err({
            kind: 'publication_integrity',
            reason: `Flow ${flow.id} references excluded page ${node.pageId}`,
          });
        }
        if (node.nodeType === 'trigger' && node.triggerId !== null) {
          const triggerTrackingIds = await this.triggers.getTriggerTrackingIds(node.triggerId);
          if (triggerTrackingIds.some((trackingId) => !includedTrackingIds.has(trackingId))) {
            return err({
              kind: 'publication_integrity',
              reason: `Flow ${flow.id} references a trigger with an excluded tracking`,
            });
          }
        }
      }
    }

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

      // Compare modules
      const prevModMap = new Map(prev.modules.map((m) => [m.id, m]));
      for (const m of mods) {
        const old = prevModMap.get(m.id);
        if (!old) {
          changelog.push({ type: 'added', entityType: 'module', entityId: m.id, name: m.name });
        } else if (old.updatedAt !== m.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'module',
            entityId: m.id,
            name: m.name,
          });
        }
      }
      for (const old of prev.modules) {
        if (!mods.some((m) => m.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'module',
            entityId: old.id,
            name: old.name,
          });
        }
      }

      // Compare destinations
      const prevDestMap = new Map(prev.destinations.map((d) => [d.id, d]));
      for (const d of dests) {
        const old = prevDestMap.get(d.id);
        if (!old) {
          changelog.push({
            type: 'added',
            entityType: 'destination',
            entityId: d.id,
            name: d.name,
          });
        } else if (old.updatedAt !== d.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'destination',
            entityId: d.id,
            name: d.name,
          });
        }
      }
      for (const old of prev.destinations) {
        if (!dests.some((d) => d.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'destination',
            entityId: old.id,
            name: old.name,
          });
        }
      }

      // Compare pages
      const prevFpMap = new Map(prev.freePages.map((fp) => [fp.id, fp]));
      for (const fp of includedFps) {
        const old = prevFpMap.get(fp.id);
        if (!old) {
          changelog.push({ type: 'added', entityType: 'page', entityId: fp.id, name: fp.title });
        } else if (old.updatedAt !== fp.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'page',
            entityId: fp.id,
            name: fp.title,
          });
        }
      }
      for (const old of prev.freePages) {
        if (!includedFps.some((fp) => fp.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'page',
            entityId: old.id,
            name: old.title,
          });
        }
      }

      // Compare flows
      const prevFlowMap = new Map(prev.flows.map((f) => [f.id, f]));
      for (const f of includedFlows) {
        const old = prevFlowMap.get(f.id);
        if (!old) {
          changelog.push({ type: 'added', entityType: 'flow', entityId: f.id, name: f.name });
        } else if (old.updatedAt !== f.updatedAt) {
          changelog.push({
            type: 'modified',
            entityType: 'flow',
            entityId: f.id,
            name: f.name,
          });
        }
      }
      for (const old of prev.flows) {
        if (!includedFlows.some((f) => f.id === old.id)) {
          changelog.push({
            type: 'removed',
            entityType: 'flow',
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
      for (const m of mods) {
        changelog.push({ type: 'added', entityType: 'module', entityId: m.id, name: m.name });
      }
      for (const d of dests) {
        changelog.push({ type: 'added', entityType: 'destination', entityId: d.id, name: d.name });
      }
      for (const fp of includedFps) {
        changelog.push({ type: 'added', entityType: 'page', entityId: fp.id, name: fp.title });
      }
      for (const t of includedTrks) {
        changelog.push({ type: 'added', entityType: 'tracking', entityId: t.id, name: t.name });
      }
      for (const f of includedFlows) {
        changelog.push({ type: 'added', entityType: 'flow', entityId: f.id, name: f.name });
      }
    }

    const versionId = this.newId();

    const project = await this.projects.getProjectById(projectId);

    const version: ProjectVersion = {
      id: versionId,
      projectId,
      versionNumber: nextNumber,
      title: parsed.value.title ?? null,
      releaseNotes: parsed.value.releaseNotes ?? null,
      changelog,
      snapshot,
      createdBy: actorId,
      createdAt: nowIso,
    };

    const auditEntry: AuditLogEntry | null = project
      ? {
          id: this.newId(),
          companyId: project.companyId,
          projectId,
          actorId,
          action: 'version.published',
          entityType: 'version',
          entityId: versionId,
          details: {
            versionNumber: nextNumber,
            title: parsed.value.title,
            changelogEntryCount: changelog.length,
          },
          createdAt: nowIso,
        }
      : null;

    await this.versions.createVersionWithAuditLog(version, auditEntry);

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

  // --- ACCESS, SHARED PASSWORDS & AUDIT (REQ-SEC-005, REQ-SEC-006, REQ-VIEW-001) ---
  async createSharedPassword(
    actorId: string,
    projectId: string,
    input: ProjectSharedPasswordCreateInput,
  ): Promise<Result<{ sharedPasswordId: string }, TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }

    const parsed = validate(projectSharedPasswordCreateSchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const hash = await this.passwordHasher.hash(parsed.value.password);
    const id = this.newId();
    const nowIso = this.now().toISOString();

    await this.sharedPasswords.createSharedPassword({
      id,
      projectId,
      passwordHash: hash,
      label: parsed.value.label ?? null,
      expiresAt: parsed.value.expiresAt ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    const project = await this.projects.getProjectById(projectId);
    if (project) {
      await this.auditLogs.appendLog({
        id: this.newId(),
        companyId: project.companyId,
        projectId,
        actorId,
        action: 'shared_password.created',
        entityType: 'shared_password',
        entityId: id,
        details: { label: parsed.value.label, expiresAt: parsed.value.expiresAt },
        createdAt: nowIso,
      });
    }

    return ok({ sharedPasswordId: id });
  }

  async verifySharedPassword(
    projectId: string,
    input: ProjectSharedPasswordVerifyInput,
  ): Promise<Result<{ verified: boolean; sharedPasswordId: string | null }, TrackingServiceError>> {
    const parsed = validate(projectSharedPasswordVerifySchema, input);
    if (!parsed.ok) return err({ kind: 'validation', issues: parsed.error });

    const list = await this.sharedPasswords.listSharedPasswordsForProject(projectId);
    const nowIso = this.now().toISOString();

    for (const sp of list) {
      // Expiry check (REQ-SEC-005)
      if (sp.expiresAt && sp.expiresAt < nowIso) {
        continue;
      }

      const match = await this.passwordHasher.verify(parsed.value.password, sp.passwordHash);
      if (match) {
        const project = await this.projects.getProjectById(projectId);
        if (project) {
          await this.auditLogs.appendLog({
            id: this.newId(),
            companyId: project.companyId,
            projectId,
            actorId: `shared-password:${sp.id}`,
            action: 'shared_password.authenticated',
            entityType: 'project',
            entityId: projectId,
            createdAt: nowIso,
          });
        }
        return ok({ verified: true, sharedPasswordId: sp.id });
      }
    }

    return ok({ verified: false, sharedPasswordId: null });
  }

  async listSharedPasswords(
    actorId: string,
    projectId: string,
  ): Promise<Result<SharedPasswordReadModel[], TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.read'))) {
      return err({ kind: 'forbidden' });
    }
    const list = await this.sharedPasswords.listSharedPasswordsForProject(projectId);
    return ok(list.map(({ passwordHash: _passwordHash, ...readModel }) => readModel));
  }

  async deleteSharedPassword(
    actorId: string,
    projectId: string,
    sharedPasswordId: string,
  ): Promise<Result<{ ok: true }, TrackingServiceError>> {
    if (!(await this.permissions.canOnProject(actorId, projectId, 'project.edit'))) {
      return err({ kind: 'forbidden' });
    }
    const sharedPassword = await this.sharedPasswords.getSharedPasswordById(sharedPasswordId);
    if (sharedPassword?.projectId !== projectId) {
      return err({ kind: 'not_found' });
    }
    await this.sharedPasswords.deleteSharedPassword(sharedPasswordId);
    return ok({ ok: true });
  }

  async listAuditLogs(
    actorId: string,
    companyId: string,
    projectId?: string,
  ): Promise<Result<AuditLogEntry[], TrackingServiceError>> {
    if (!(await this.permissions.canInCompany(actorId, companyId, 'company.read_audit_log'))) {
      return err({ kind: 'forbidden' });
    }

    if (projectId) {
      const project = await this.projects.getProjectById(projectId);
      if (project?.companyId !== companyId) {
        return err({ kind: 'not_found' });
      }
      const logs = await this.auditLogs.listLogsForProject(projectId);
      return ok(logs);
    }
    const logs = await this.auditLogs.listLogsForCompany(companyId);
    return ok(logs);
  }

  async batchCreate(
    actorId: string,
    companyId: string,
    projectId: string | null,
    input: {
      properties?: PropertyCreateInput[];
      modules?: ModuleCreateInput[];
      destinations?: DestinationCreateInput[];
      trackings?: TrackingCreateInput[];
    },
  ): Promise<{
    results: {
      properties: { index: number; success: boolean; id?: string; error?: unknown }[];
      modules: { index: number; success: boolean; id?: string; error?: unknown }[];
      destinations: { index: number; success: boolean; id?: string; error?: unknown }[];
      trackings: { index: number; success: boolean; id?: string; error?: unknown }[];
    };
  }> {
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

    if (input.properties) {
      let i = 0;
      for (const item of input.properties) {
        const res = await this.createProperty(actorId, companyId, projectId, item);
        if (res.ok) {
          results.properties.push({ index: i, success: true, id: res.value.propertyId });
        } else {
          results.properties.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (input.modules) {
      let i = 0;
      for (const item of input.modules) {
        const res = await this.createModule(actorId, companyId, projectId, item);
        if (res.ok) {
          results.modules.push({ index: i, success: true, id: res.value.moduleId });
        } else {
          results.modules.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (input.destinations) {
      let i = 0;
      for (const item of input.destinations) {
        const res = await this.createDestination(actorId, companyId, projectId, item);
        if (res.ok) {
          results.destinations.push({ index: i, success: true, id: res.value.destinationId });
        } else {
          results.destinations.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    if (input.trackings) {
      let i = 0;
      for (const item of input.trackings) {
        if (projectId === null) {
          results.trackings.push({ index: i, success: false, error: { kind: 'not_found' } });
          i++;
          continue;
        }
        const res = await this.createTracking(actorId, projectId, item);
        if (res.ok) {
          results.trackings.push({ index: i, success: true, id: res.value.trackingId });
        } else {
          results.trackings.push({ index: i, success: false, error: res.error });
        }
        i++;
      }
    }

    return { results };
  }
}

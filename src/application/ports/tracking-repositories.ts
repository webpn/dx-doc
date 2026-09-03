import type {
  AuditLogEntry,
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
  PropertyDestinationMapping,
  SpecificValue,
  Tracking,
  TrackingProperty,
  TrackingTemplate,
  Trigger,
} from '@project/domain/entities';

import type { AccountRepository } from './account-repository';
import type { PageRepository } from './page-repository';
import type { ProjectRepository } from './project-repository';

/** ADR-0025: what blocks a Property's deletion. */
export interface PropertyDeletionBlockers {
  trackings: number;
  modules: number;
  childProperties: number;
}

export interface PropertyRepository {
  createProperty(property: DataLayerProperty): Promise<void>;
  getPropertyById(id: string): Promise<DataLayerProperty | null>;
  getPropertyByProjectAndName(
    companyId: string,
    projectId: string | null,
    name: string,
  ): Promise<DataLayerProperty | null>;
  getPropertyByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<DataLayerProperty | null>;
  listProperties(companyId: string, projectId: string | null): Promise<DataLayerProperty[]>;
  /**
   * Applies `property`'s fields. When `expectedUpdatedAt` is provided, the
   * write is atomically guarded by `WHERE updated_at = expectedUpdatedAt`
   * (REQ-AUTH-005, ADR-0016): returns `false` and applies nothing if the row
   * has since changed. When omitted, writes unconditionally and returns
   * `true`.
   */
  updateProperty(property: DataLayerProperty, expectedUpdatedAt?: string): Promise<boolean>;
  getPropertyDeletionBlockers(id: string): Promise<PropertyDeletionBlockers>;
  /** Deletes the property's own `property_destinations` rows, then the property. */
  deleteProperty(id: string): Promise<void>;
}

export interface ModuleRepository {
  createModule(module: Module): Promise<void>;
  getModuleById(id: string): Promise<Module | null>;
  getModuleByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<Module | null>;
  listModules(companyId: string, projectId: string | null): Promise<Module[]>;
  updateModule(module: Module, expectedUpdatedAt?: string): Promise<boolean>;
  setModuleProperties(moduleId: string, propertyIds: string[], nowIso: string): Promise<void>;
  getModulePropertyIds(moduleId: string): Promise<string[]>;
  /** ADR-0025: number of trackings this module is attached to. */
  countTrackingsUsingModule(id: string): Promise<number>;
  /** Deletes the module's own `module_properties` rows, then the module. */
  deleteModule(id: string): Promise<void>;
}

export interface DestinationRepository {
  createDestination(destination: Destination): Promise<void>;
  getDestinationById(id: string): Promise<Destination | null>;
  getDestinationByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<Destination | null>;
  listDestinations(companyId: string, projectId: string | null): Promise<Destination[]>;
  updateDestination(destination: Destination, expectedUpdatedAt?: string): Promise<boolean>;
  setPropertyDestinations(
    propertyId: string,
    mappings: {
      destinationId: string;
      destinationNameOverride: string | null;
    }[],
    nowIso: string,
  ): Promise<void>;
  getPropertyDestinations(propertyId: string): Promise<PropertyDestinationMapping[]>;
  /** ADR-0025: number of properties mapped to this destination. */
  countPropertiesUsingDestination(id: string): Promise<number>;
  deleteDestination(id: string): Promise<void>;
}

export interface TrackingTemplateRepository {
  createTemplate(template: TrackingTemplate): Promise<void>;
  getTemplateById(id: string): Promise<TrackingTemplate | null>;
  getTemplateByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<TrackingTemplate | null>;
  listTemplates(companyId: string, projectId: string | null): Promise<TrackingTemplate[]>;
  updateTemplate(template: TrackingTemplate, expectedUpdatedAt?: string): Promise<boolean>;
  /** Nothing references a template (ADR-0025); deletion is unconditional. */
  deleteTemplate(id: string): Promise<void>;
}

export interface FreePageRepository {
  createFreePage(page: FreePage): Promise<void>;
  getFreePageById(id: string): Promise<FreePage | null>;
  getFreePageBySlug(
    companyId: string,
    projectId: string | null,
    slug: string,
  ): Promise<FreePage | null>;
  getFreePageByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<FreePage | null>;
  listFreePages(companyId: string, projectId: string | null): Promise<FreePage[]>;
  updateFreePage(page: FreePage, expectedUpdatedAt?: string): Promise<boolean>;
  /** Nothing references a free page (ADR-0025); deletion is unconditional. */
  deleteFreePage(id: string): Promise<void>;
}

export interface NavigationEventRepository {
  createNavigationEvent(event: NavigationEvent): Promise<void>;
  getNavigationEventById(id: string): Promise<NavigationEvent | null>;
  listNavigationEvents(projectId: string): Promise<NavigationEvent[]>;
  updateNavigationEvent(event: NavigationEvent, expectedUpdatedAt?: string): Promise<boolean>;
  /** ADR-0025: trackings and templates that reference this navigation event. */
  countUsageOfNavigationEvent(id: string): Promise<{ trackings: number; templates: number }>;
  deleteNavigationEvent(id: string): Promise<void>;
}

export interface TrackingRepository {
  createTracking(tracking: Tracking): Promise<void>;
  getTrackingById(id: string): Promise<Tracking | null>;
  getTrackingByProjectAndSlug(projectId: string, slug: string): Promise<Tracking | null>;
  getTrackingByCustomId(projectId: string, customId: string): Promise<Tracking | null>;
  listTrackingsForProject(projectId: string): Promise<Tracking[]>;
  listTrackingsForPage(pageId: string): Promise<Tracking[]>;
  updateTracking(tracking: Tracking, expectedUpdatedAt?: string): Promise<boolean>;

  // Tracking modules join
  setTrackingModules(trackingId: string, moduleIds: string[], nowIso: string): Promise<void>;
  getTrackingModuleIds(trackingId: string): Promise<string[]>;

  // Tracking properties (first class records)
  setTrackingProperties(trackingProperties: TrackingProperty[]): Promise<void>;
  /**
   * Atomically guarded single-row presence update (REQ-AUTH-005, ADR-0016).
   * Unlike `setTrackingProperties`'s bulk upsert, this targets exactly one
   * existing `tracking_properties` row by id and never inserts: returns
   * `false` and applies nothing if `expectedUpdatedAt` is provided and no
   * longer matches.
   */
  updateTrackingPropertyPresence(
    trackingPropertyId: string,
    presence: TrackingProperty['presence'],
    updatedAt: string,
    expectedUpdatedAt?: string,
  ): Promise<boolean>;
  getTrackingProperties(trackingId: string): Promise<TrackingProperty[]>;
  removeTrackingProperty(trackingPropertyId: string): Promise<void>;
  getProjectIdForTrackingProperty(trackingPropertyId: string): Promise<string | null>;

  // Specific values
  setSpecificValues(specificValues: SpecificValue[]): Promise<void>;
  getSpecificValuesForTrackingProperty(trackingPropertyId: string): Promise<SpecificValue[]>;
  getSpecificValuesForTracking(trackingId: string): Promise<SpecificValue[]>;
  /** Resolves the owning tracking's project, for a specific value's permission check. */
  getProjectIdForSpecificValue(id: string): Promise<string | null>;
  /** A leaf value; nothing references it (ADR-0025). */
  deleteSpecificValue(id: string): Promise<void>;

  /**
   * ADR-0025: a tracking blocks nothing — every table that names a
   * `tracking_id` records the tracking's own configuration. Deletes its
   * `tracking_modules`, `tracking_properties` (+ their `specific_values`)
   * and `trigger_trackings` rows, then the tracking itself.
   */
  deleteTracking(id: string): Promise<void>;
}

export interface FlowRepository {
  createFlow(flow: Flow): Promise<void>;
  getFlowById(id: string): Promise<Flow | null>;
  getFlowByProjectAndSlug(projectId: string, slug: string): Promise<Flow | null>;
  listFlowsForProject(projectId: string): Promise<Flow[]>;
  updateFlow(flow: Flow, expectedUpdatedAt?: string): Promise<boolean>;

  // Nodes and edges
  setFlowNodes(nodes: FlowNode[]): Promise<void>;
  getFlowNodes(flowId: string): Promise<FlowNode[]>;
  setFlowEdges(edges: FlowEdge[]): Promise<void>;
  getFlowEdges(flowId: string): Promise<FlowEdge[]>;
  /**
   * Atomically replaces every node and edge for `flowId` with `nodes` and
   * `edges` in a single transaction (REQ-FDN-025). Unlike `setFlowNodes` /
   * `setFlowEdges`, this always clears existing rows first, even when the
   * replacement set is empty (an empty graph is a valid graph).
   */
  replaceFlowGraph(flowId: string, nodes: FlowNode[], edges: FlowEdge[]): Promise<void>;

  /**
   * ADR-0025: nothing references a flow itself. Deletes its own
   * `flow_edges` and `flow_nodes` (edges first), then the flow.
   */
  deleteFlow(id: string): Promise<void>;
}

export interface TriggerRepository {
  createTrigger(trigger: Trigger): Promise<void>;
  getTriggerById(id: string): Promise<Trigger | null>;
  listTriggersForProject(projectId: string): Promise<Trigger[]>;
  updateTrigger(trigger: Trigger, expectedUpdatedAt?: string): Promise<boolean>;
  setTriggerTrackings(triggerId: string, trackingIds: string[], nowIso: string): Promise<void>;
  getTriggerTrackingIds(triggerId: string): Promise<string[]>;
  /** ADR-0025: number of flow diagrams this trigger is placed on. */
  countFlowNodesUsingTrigger(id: string): Promise<number>;
  /** Deletes the trigger's own `trigger_trackings` rows, then the trigger. */
  deleteTrigger(id: string): Promise<void>;
}

export interface VersionRepository {
  createVersion(version: ProjectVersion): Promise<void>;
  /**
   * Atomically inserts `version` and, when `auditEntry` is not null, an
   * accompanying audit-log row, in a single transaction (REQ-FDN-025).
   */
  createVersionWithAuditLog(
    version: ProjectVersion,
    auditEntry: AuditLogEntry | null,
  ): Promise<void>;
  getVersionById(id: string): Promise<ProjectVersion | null>;
  getVersionByProjectAndNumber(
    projectId: string,
    versionNumber: number,
  ): Promise<ProjectVersion | null>;
  getLatestVersion(projectId: string): Promise<ProjectVersion | null>;
  listVersionsForProject(projectId: string): Promise<ProjectVersion[]>;
}

export interface SharedPasswordRepository {
  createSharedPassword(sharedPassword: ProjectSharedPassword): Promise<void>;
  getSharedPasswordById(id: string): Promise<ProjectSharedPassword | null>;
  listSharedPasswordsForProject(projectId: string): Promise<ProjectSharedPassword[]>;
  deleteSharedPassword(id: string): Promise<void>;
}

export interface AuditLogRepository {
  appendLog(entry: AuditLogEntry): Promise<void>;
  listLogsForCompany(companyId: string, limit?: number): Promise<AuditLogEntry[]>;
  listLogsForProject(projectId: string, limit?: number): Promise<AuditLogEntry[]>;
}

/** Repository set used by one application-level batch transaction. */
export interface TrackingWriteRepositories {
  accounts: AccountRepository;
  projects: ProjectRepository;
  pages: PageRepository;
  properties: PropertyRepository;
  modules: ModuleRepository;
  destinations: DestinationRepository;
  navEvents: NavigationEventRepository;
  trackings: TrackingRepository;
  templates: TrackingTemplateRepository;
  freePages: FreePageRepository;
  flows: FlowRepository;
  triggers: TriggerRepository;
  versions: VersionRepository;
  sharedPasswords: SharedPasswordRepository;
  auditLogs: AuditLogRepository;
}

export type TrackingWriteTransaction = <T>(
  work: (repositories: TrackingWriteRepositories) => Promise<T>,
) => Promise<T>;

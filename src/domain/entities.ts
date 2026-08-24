/**
 * Domain types and value objects for dx-doc Tracking Data Model (M1.1).
 * Pure business rules, zero infrastructure dependencies (ARCHITECTURE.md §Domain).
 */

export type Presence = 'always' | 'sometimes' | 'never';
export type PropertySource = 'direct' | 'module';
export type PropertyDataSource = 'development' | 'tag_manager' | 'other';
export type PropertyStatus = 'active' | 'deprecated';
export type PropertyDataType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface NavigationEvent {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataLayerProperty {
  id: string;
  companyId: string;
  projectId: string | null; // null for company catalogue
  name: string;
  businessLabel: string | null; // REQ-DOM-005
  description: string | null;
  dataSource: PropertyDataSource; // REQ-DOM-003
  type: PropertyDataType; // REQ-DOM-004
  formatPattern: string | null;
  allowedValues: string[] | null;
  exampleValues: string[] | null;
  piiFlag: boolean;
  hashingPolicy: string | null;
  status: PropertyStatus;
  introducedInVersion: string | null;
  analysisNotes: string | null;
  aepFieldGroup: string | null;
  parentPropertyId: string | null; // REQ-DOM-004 (object hierarchy)
  derivedFrom: string[] | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  companyId: string;
  projectId: string | null; // null for company catalogue
  name: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  companyId: string;
  projectId: string | null; // null for company catalogue
  platform: string;
  variableType: string;
  identifier: string;
  name: string;
  reconciliationIdentifier: string | null;
  notes: string | null;
  platformAttributes: Record<string, unknown> | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyDestinationMapping {
  propertyId: string;
  destinationId: string;
  destinationNameOverride: string | null; // REQ-DOM-016
  createdAt: string;
}

export interface TrackingTemplate {
  id: string;
  companyId: string;
  projectId: string | null; // null for company catalogue
  name: string;
  description: string | null;
  navigationEventId: string | null;
  configJson: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreePage {
  id: string;
  companyId: string;
  projectId: string | null;
  title: string;
  slug: string;
  content: string;
  publishable: boolean;
  customId: string | null;
  /** Own hierarchy, independent of the Page/Screen tree (REQ-AUTH-003). */
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tracking {
  id: string;
  projectId: string;
  pageId: string | null;
  navigationEventId: string;
  name: string;
  slug: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingProperty {
  id: string;
  trackingId: string;
  propertyId: string;
  source: PropertySource; // 'direct' | 'module' (REQ-DOM-027)
  presence: Presence; // 'always' | 'sometimes' | 'never' (REQ-DOM-027)
  createdAt: string;
  updatedAt: string;
}

export interface SpecificValue {
  id: string;
  trackingPropertyId: string;
  value: string; // [placeholder] support (REQ-DOM-010)
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Flow {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trigger {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FlowNodeType = 'page' | 'trigger';

export interface FlowNode {
  id: string;
  flowId: string;
  nodeType: FlowNodeType;
  pageId: string | null;
  triggerId: string | null;
  positionX: number | null;
  positionY: number | null;
  createdAt: string;
}

export interface FlowEdge {
  id: string;
  flowId: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
  conditionDescription: string | null;
  createdAt: string;
}

export interface ProjectVersionSnapshot {
  versionNumber: number;
  title: string | null;
  releaseNotes: string | null;
  createdAt: string;
  createdBy: string;
  properties: DataLayerProperty[];
  modules: Module[];
  destinations: Destination[];
  freePages: FreePage[];
  trackings: Tracking[];
  flows: Flow[];
}

export interface ChangelogEntry {
  type: 'added' | 'modified' | 'removed';
  entityType: 'property' | 'module' | 'destination' | 'page' | 'tracking' | 'flow';
  entityId: string;
  name: string;
  details?: string;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  title: string | null;
  releaseNotes: string | null;
  changelog: ChangelogEntry[];
  snapshot: ProjectVersionSnapshot;
  createdBy: string;
  createdAt: string;
}

export interface ProjectSharedPassword {
  id: string;
  projectId: string;
  passwordHash: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string | null;
  projectId: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  /**
   * Distinguishes a human-session actor from a service-token actor
   * (REQ-API-009). Defaults to 'session' when absent.
   */
  actorKind?: 'session' | 'service_token';
}

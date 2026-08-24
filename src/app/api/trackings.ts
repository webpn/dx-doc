import { apiRequest } from './client';

/**
 * Wire types for trackings. Declared here rather than imported from
 * `src/domain`: the client is a consumer of the HTTP contract, and the app
 * layer never reaches into domain code (AGENTS.md).
 */
export const PRESENCE_VALUES = ['always', 'sometimes', 'never'] as const;
export type Presence = (typeof PRESENCE_VALUES)[number];

/** Where a property on a tracking came from (REQ-DOM-027). */
export type PropertySource = 'direct' | 'module';

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
  source: PropertySource;
  presence: Presence;
  createdAt: string;
  updatedAt: string;
}

export interface SpecificValue {
  id: string;
  trackingPropertyId: string;
  /** May contain `[placeholder]` segments (REQ-DOM-010). */
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What `GET /api/trackings/:id` returns: the tracking and everything on it. */
export interface TrackingDetail {
  tracking: Tracking;
  moduleIds: string[];
  properties: TrackingProperty[];
  specificValues: SpecificValue[];
}

export interface NavigationEvent {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingCreateInput {
  name: string;
  slug: string;
  navigationEventId: string;
  pageId?: string;
  description?: string;
  customId?: string;
}

export interface TrackingUpdateInput {
  name?: string;
  slug?: string;
  pageId?: string;
  navigationEventId?: string;
  description?: string;
  customId?: string;
  /** Optimistic-concurrency guard (REQ-AUTH-005, ADR-0016). */
  expectedUpdatedAt?: string;
}

/**
 * Removing a property can detach the module that supplied it, when it was the
 * module's last remaining property (REQ-DOM-008). The API reports that so the
 * editor can be warned — a module silently left with no effect is the failure
 * mode the requirement exists to prevent.
 */
export interface RemovePropertyResult {
  ok: true;
  warnModuleDetached?: boolean;
}

export const trackingsApi = {
  list: (projectId: string): Promise<Tracking[]> =>
    apiRequest<Tracking[]>(`/api/projects/${projectId}/trackings`),

  get: (trackingId: string): Promise<TrackingDetail> =>
    apiRequest<TrackingDetail>(`/api/trackings/${trackingId}`),

  create: (
    projectId: string,
    input: TrackingCreateInput,
  ): Promise<{ id: string; created: boolean }> =>
    apiRequest<{ id: string; created: boolean }>(`/api/projects/${projectId}/trackings`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (trackingId: string, input: TrackingUpdateInput): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/trackings/${trackingId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (trackingId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/trackings/${trackingId}`, { method: 'DELETE' }),

  applyModule: (trackingId: string, moduleId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/trackings/${trackingId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ moduleId }),
    }),

  removeProperty: (trackingId: string, propertyId: string): Promise<RemovePropertyResult> =>
    apiRequest<RemovePropertyResult>(`/api/trackings/${trackingId}/properties/${propertyId}`, {
      method: 'DELETE',
    }),

  setPresence: (
    trackingId: string,
    propertyId: string,
    presence: Presence,
  ): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/trackings/${trackingId}/properties/${propertyId}/presence`, {
      method: 'PATCH',
      body: JSON.stringify({ presence }),
    }),

  addSpecificValue: (
    trackingPropertyId: string,
    input: { value: string; description?: string },
  ): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(`/api/tracking-properties/${trackingPropertyId}/specific-values`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  removeSpecificValue: (specificValueId: string): Promise<{ ok: true }> =>
    apiRequest<{ ok: true }>(`/api/specific-values/${specificValueId}`, { method: 'DELETE' }),

  /** Duplicate a tracking into a fully independent copy (REQ-AUTH-006). */
  duplicate: (trackingId: string, nameOverride?: string): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(`/api/trackings/${trackingId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(nameOverride === undefined ? {} : { nameOverride }),
    }),
};

export const navigationEventsApi = {
  list: (projectId: string): Promise<NavigationEvent[]> =>
    apiRequest<NavigationEvent[]>(`/api/projects/${projectId}/navigation-events`),
};

export interface Module {
  id: string;
  companyId: string;
  /** `null` for a company-catalogue module (REQ-DOM-019). */
  projectId: string | null;
  name: string;
  description: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A data-layer property (REQ-DOM-003). Only the fields the tracking editor
 * displays are typed here — the property editor (its own screen) types the full
 * attribute set when it needs it.
 */
export const PROPERTY_DATA_SOURCES = ['development', 'tag_manager', 'other'] as const;
export type PropertyDataSource = (typeof PROPERTY_DATA_SOURCES)[number];

export const PROPERTY_DATA_TYPES = ['string', 'number', 'boolean', 'array', 'object'] as const;
export type PropertyDataType = (typeof PROPERTY_DATA_TYPES)[number];

export const PROPERTY_STATUSES = ['active', 'deprecated'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export interface DataLayerProperty {
  id: string;
  companyId: string;
  projectId: string | null;
  name: string;
  businessLabel: string | null;
  description: string | null;
  type: PropertyDataType;
  dataSource: PropertyDataSource;
  status: PropertyStatus;
  piiFlag: boolean;
  hashingPolicy: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Modules and properties are company-scoped with an optional project filter:
 * `projectId` omitted lists the company catalogue, a project id adds that
 * project's own items (REQ-DOM-019).
 */
export const modulesApi = {
  list: (companyId: string, projectId?: string): Promise<Module[]> =>
    apiRequest<Module[]>(
      `/api/companies/${companyId}/modules${projectId === undefined ? '' : `?projectId=${projectId}`}`,
    ),

  /** The API returns the module and its property set separately. */
  get: (moduleId: string): Promise<{ module: Module; propertyIds: string[] }> =>
    apiRequest<{ module: Module; propertyIds: string[] }>(`/api/modules/${moduleId}`),

  update: (moduleId: string, input: ModuleUpdateInput): Promise<Module> =>
    apiRequest<Module>(`/api/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /**
   * What propagating this module would change (REQ-DOM-007). Read-only — the
   * requirement demands the change be shown before it is made.
   */
  propagationPreview: (moduleId: string): Promise<ModulePropagationPreview> =>
    apiRequest<ModulePropagationPreview>(`/api/modules/${moduleId}/propagation-preview`),

  /** Apply the module's current property set to trackings already using it. */
  propagate: (moduleId: string): Promise<{ updatedTrackingCount: number }> =>
    apiRequest<{ updatedTrackingCount: number }>(`/api/modules/${moduleId}/propagate`, {
      method: 'POST',
    }),
};

export interface ModulePropagationPreview {
  affected: { trackingId: string; addedPropertyIds: string[] }[];
}

export interface ModuleUpdateInput {
  name?: string;
  description?: string;
  /**
   * The module's complete property set. Sending `[]` empties the module — it is
   * a replacement, not a merge, so an omitted key and an empty array differ.
   */
  propertyIds?: string[];
  expectedUpdatedAt?: string | undefined;
}

export const propertiesApi = {
  list: (companyId: string, projectId?: string): Promise<DataLayerProperty[]> =>
    apiRequest<DataLayerProperty[]>(
      `/api/companies/${companyId}/properties${projectId === undefined ? '' : `?projectId=${projectId}`}`,
    ),

  get: (propertyId: string): Promise<DataLayerProperty> =>
    apiRequest<DataLayerProperty>(`/api/properties/${propertyId}`),

  update: (propertyId: string, input: PropertyUpdateInput): Promise<DataLayerProperty> =>
    apiRequest<DataLayerProperty>(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export interface PropertyUpdateInput {
  name?: string;
  businessLabel?: string;
  description?: string;
  type?: PropertyDataType;
  dataSource?: PropertyDataSource;
  status?: PropertyStatus;
  piiFlag?: boolean;
  hashingPolicy?: string;
  /**
   * Optimistic concurrency (REQ-AUTH-005): the updatedAt this edit was based on.
   * Explicitly allows `undefined` — a form can submit before the record loaded,
   * and `exactOptionalPropertyTypes` distinguishes that from an absent key.
   */
  expectedUpdatedAt?: string | undefined;
}

export interface Destination {
  id: string;
  companyId: string;
  projectId: string | null;
  name: string;
  platform: string;
  variableType: string;
  identifier: string;
  reconciliationIdentifier: string | null;
  notes: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationUpdateInput {
  name?: string;
  platform?: string;
  variableType?: string;
  identifier?: string;
  reconciliationIdentifier?: string;
  notes?: string;
  expectedUpdatedAt?: string | undefined;
}

export const destinationsApi = {
  list: (companyId: string): Promise<Destination[]> =>
    apiRequest<Destination[]>(`/api/companies/${companyId}/destinations`),

  get: (destinationId: string): Promise<Destination> =>
    apiRequest<Destination>(`/api/destinations/${destinationId}`),

  update: (destinationId: string, input: DestinationUpdateInput): Promise<Destination> =>
    apiRequest<Destination>(`/api/destinations/${destinationId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
};

export interface TrackingTemplate {
  id: string;
  companyId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  navigationEventId: string | null;
  configJson: string | null;
  customId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingTemplateUpdateInput {
  name?: string;
  description?: string;
  navigationEventId?: string;
  configJson?: string;
  expectedUpdatedAt?: string | undefined;
}

/**
 * Tracking templates (REQ-DOM-009). Company-scoped with an optional project
 * filter, exactly like modules/properties: no projectId lists the catalogue.
 */
export const trackingTemplatesApi = {
  list: (companyId: string, projectId?: string): Promise<TrackingTemplate[]> =>
    apiRequest<TrackingTemplate[]>(
      `/api/companies/${companyId}/tracking-templates${projectId === undefined ? '' : `?projectId=${projectId}`}`,
    ),

  get: (templateId: string): Promise<TrackingTemplate> =>
    apiRequest<TrackingTemplate>(`/api/tracking-templates/${templateId}`),

  update: (templateId: string, input: TrackingTemplateUpdateInput): Promise<TrackingTemplate> =>
    apiRequest<TrackingTemplate>(`/api/tracking-templates/${templateId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  create: (
    companyId: string,
    projectId: string | undefined,
    input: { name: string; description?: string },
  ): Promise<{ id: string }> =>
    apiRequest<{ id: string }>(
      `/api/companies/${companyId}/tracking-templates${projectId === undefined ? '' : `?projectId=${projectId}`}`,
      { method: 'POST', body: JSON.stringify(input) },
    ),
};

export interface CatalogueCopyResult {
  copiedProperties: number;
  copiedModules: number;
}

/**
 * Copy selected catalogue items into a project (REQ-DOM-019). The copy is
 * independent: no provenance is stored, and later catalogue edits do not reach
 * the project.
 */
export const catalogueApi = {
  copyToProject: (
    companyId: string,
    projectId: string,
    selection: { propertyIds?: string[]; moduleIds?: string[] },
  ): Promise<CatalogueCopyResult> =>
    apiRequest<CatalogueCopyResult>(
      `/api/companies/${companyId}/projects/${projectId}/copy-catalogue`,
      { method: 'POST', body: JSON.stringify(selection) },
    ),
};

import type {
  DataLayerProperty,
  Destination,
  FreePage,
  Module,
  NavigationEvent,
  PropertyDestinationMapping,
  SpecificValue,
  Tracking,
  TrackingProperty,
  TrackingTemplate,
} from '@project/domain/entities';

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
  updateProperty(property: DataLayerProperty): Promise<void>;
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
  updateModule(module: Module): Promise<void>;
  setModuleProperties(moduleId: string, propertyIds: string[], nowIso: string): Promise<void>;
  getModulePropertyIds(moduleId: string): Promise<string[]>;
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
  updateDestination(destination: Destination): Promise<void>;
  setPropertyDestinations(
    propertyId: string,
    mappings: {
      destinationId: string;
      destinationNameOverride: string | null;
    }[],
    nowIso: string,
  ): Promise<void>;
  getPropertyDestinations(propertyId: string): Promise<PropertyDestinationMapping[]>;
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
  updateTemplate(template: TrackingTemplate): Promise<void>;
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
  updateFreePage(page: FreePage): Promise<void>;
}

export interface NavigationEventRepository {
  createNavigationEvent(event: NavigationEvent): Promise<void>;
  getNavigationEventById(id: string): Promise<NavigationEvent | null>;
  listNavigationEvents(projectId: string): Promise<NavigationEvent[]>;
  updateNavigationEvent(event: NavigationEvent): Promise<void>;
}

export interface TrackingRepository {
  createTracking(tracking: Tracking): Promise<void>;
  getTrackingById(id: string): Promise<Tracking | null>;
  getTrackingByProjectAndSlug(projectId: string, slug: string): Promise<Tracking | null>;
  getTrackingByCustomId(projectId: string, customId: string): Promise<Tracking | null>;
  listTrackingsForProject(projectId: string): Promise<Tracking[]>;
  listTrackingsForPage(pageId: string): Promise<Tracking[]>;
  updateTracking(tracking: Tracking): Promise<void>;

  // Tracking modules join
  setTrackingModules(trackingId: string, moduleIds: string[], nowIso: string): Promise<void>;
  getTrackingModuleIds(trackingId: string): Promise<string[]>;

  // Tracking properties (first class records)
  setTrackingProperties(trackingProperties: TrackingProperty[]): Promise<void>;
  getTrackingProperties(trackingId: string): Promise<TrackingProperty[]>;
  removeTrackingProperty(trackingPropertyId: string): Promise<void>;

  // Specific values
  setSpecificValues(specificValues: SpecificValue[]): Promise<void>;
  getSpecificValuesForTrackingProperty(trackingPropertyId: string): Promise<SpecificValue[]>;
  getSpecificValuesForTracking(trackingId: string): Promise<SpecificValue[]>;
}

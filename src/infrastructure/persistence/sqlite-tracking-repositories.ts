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
  PropertyDataSource,
  PropertyDataType,
  PropertyDestinationMapping,
  PropertyStatus,
  SpecificValue,
  Tracking,
  TrackingProperty,
  TrackingTemplate,
  Trigger,
} from '@project/domain/entities';
import type { Kysely } from 'kysely';

import type { Database } from './db-schema';

type Db = Kysely<Database>;

export class SqlitePropertyRepository implements PropertyRepository {
  constructor(private readonly db: Db) {}

  async createProperty(property: DataLayerProperty): Promise<void> {
    await this.db
      .insertInto('properties')
      .values({
        id: property.id,
        company_id: property.companyId,
        project_id: property.projectId,
        name: property.name,
        business_label: property.businessLabel,
        description: property.description,
        data_source: property.dataSource,
        type: property.type,
        format_pattern: property.formatPattern,
        allowed_values: property.allowedValues ? JSON.stringify(property.allowedValues) : null,
        example_values: property.exampleValues ? JSON.stringify(property.exampleValues) : null,
        pii_flag: property.piiFlag ? 1 : 0,
        hashing_policy: property.hashingPolicy,
        status: property.status,
        introduced_in_version: property.introducedInVersion,
        analysis_notes: property.analysisNotes,
        aep_field_group: property.aepFieldGroup,
        parent_property_id: property.parentPropertyId,
        derived_from: property.derivedFrom ? JSON.stringify(property.derivedFrom) : null,
        custom_id: property.customId,
        created_at: property.createdAt,
        updated_at: property.updatedAt,
      })
      .execute();
  }

  async getPropertyById(id: string): Promise<DataLayerProperty | null> {
    const row = await this.db
      .selectFrom('properties')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getPropertyByProjectAndName(
    companyId: string,
    projectId: string | null,
    name: string,
  ): Promise<DataLayerProperty | null> {
    let query = this.db
      .selectFrom('properties')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('name', '=', name);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getPropertyByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<DataLayerProperty | null> {
    let query = this.db
      .selectFrom('properties')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async listProperties(companyId: string, projectId: string | null): Promise<DataLayerProperty[]> {
    let query = this.db.selectFrom('properties').selectAll().where('company_id', '=', companyId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('name', 'asc').execute();
    return rows.map((r) => this.toEntity(r));
  }

  async updateProperty(property: DataLayerProperty): Promise<void> {
    await this.db
      .updateTable('properties')
      .set({
        name: property.name,
        business_label: property.businessLabel,
        description: property.description,
        data_source: property.dataSource,
        type: property.type,
        format_pattern: property.formatPattern,
        allowed_values: property.allowedValues ? JSON.stringify(property.allowedValues) : null,
        example_values: property.exampleValues ? JSON.stringify(property.exampleValues) : null,
        pii_flag: property.piiFlag ? 1 : 0,
        hashing_policy: property.hashingPolicy,
        status: property.status,
        introduced_in_version: property.introducedInVersion,
        analysis_notes: property.analysisNotes,
        aep_field_group: property.aepFieldGroup,
        parent_property_id: property.parentPropertyId,
        derived_from: property.derivedFrom ? JSON.stringify(property.derivedFrom) : null,
        updated_at: property.updatedAt,
      })
      .where('id', '=', property.id)
      .execute();
  }

  private toEntity(row: {
    id: string;
    company_id: string;
    project_id: string | null;
    name: string;
    business_label: string | null;
    description: string | null;
    data_source: PropertyDataSource;
    type: PropertyDataType;
    format_pattern: string | null;
    allowed_values: string | null;
    example_values: string | null;
    pii_flag: number | boolean;
    hashing_policy: string | null;
    status: PropertyStatus;
    introduced_in_version: string | null;
    analysis_notes: string | null;
    aep_field_group: string | null;
    parent_property_id: string | null;
    derived_from: string | null;
    custom_id: string | null;
    created_at: string;
    updated_at: string;
  }): DataLayerProperty {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      name: row.name,
      businessLabel: row.business_label,
      description: row.description,
      dataSource: row.data_source,
      type: row.type,
      formatPattern: row.format_pattern,
      allowedValues: row.allowed_values ? (JSON.parse(row.allowed_values) as string[]) : null,
      exampleValues: row.example_values ? (JSON.parse(row.example_values) as string[]) : null,
      piiFlag: Boolean(row.pii_flag),
      hashingPolicy: row.hashing_policy,
      status: row.status,
      introducedInVersion: row.introduced_in_version,
      analysisNotes: row.analysis_notes,
      aepFieldGroup: row.aep_field_group,
      parentPropertyId: row.parent_property_id,
      derivedFrom: row.derived_from ? (JSON.parse(row.derived_from) as string[]) : null,
      customId: row.custom_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteModuleRepository implements ModuleRepository {
  constructor(private readonly db: Db) {}

  async createModule(mod: Module): Promise<void> {
    await this.db
      .insertInto('modules')
      .values({
        id: mod.id,
        company_id: mod.companyId,
        project_id: mod.projectId,
        name: mod.name,
        description: mod.description,
        custom_id: mod.customId,
        created_at: mod.createdAt,
        updated_at: mod.updatedAt,
      })
      .execute();
  }

  async getModuleById(id: string): Promise<Module | null> {
    const row = await this.db
      .selectFrom('modules')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row
      ? {
          id: row.id,
          companyId: row.company_id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          customId: row.custom_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async getModuleByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<Module | null> {
    let query = this.db
      .selectFrom('modules')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row
      ? {
          id: row.id,
          companyId: row.company_id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          customId: row.custom_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async listModules(companyId: string, projectId: string | null): Promise<Module[]> {
    let query = this.db.selectFrom('modules').selectAll().where('company_id', '=', companyId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('name', 'asc').execute();
    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      customId: r.custom_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateModule(mod: Module): Promise<void> {
    await this.db
      .updateTable('modules')
      .set({
        name: mod.name,
        description: mod.description,
        updated_at: mod.updatedAt,
      })
      .where('id', '=', mod.id)
      .execute();
  }

  async setModuleProperties(
    moduleId: string,
    propertyIds: string[],
    nowIso: string,
  ): Promise<void> {
    await this.db.deleteFrom('module_properties').where('module_id', '=', moduleId).execute();

    if (propertyIds.length > 0) {
      await this.db
        .insertInto('module_properties')
        .values(
          propertyIds.map((pId) => ({
            module_id: moduleId,
            property_id: pId,
            created_at: nowIso,
          })),
        )
        .execute();
    }
  }

  async getModulePropertyIds(moduleId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('module_properties')
      .select('property_id')
      .where('module_id', '=', moduleId)
      .execute();
    return rows.map((r) => r.property_id);
  }
}

export class SqliteDestinationRepository implements DestinationRepository {
  constructor(private readonly db: Db) {}

  async createDestination(destination: Destination): Promise<void> {
    await this.db
      .insertInto('destinations')
      .values({
        id: destination.id,
        company_id: destination.companyId,
        project_id: destination.projectId,
        platform: destination.platform,
        variable_type: destination.variableType,
        identifier: destination.identifier,
        name: destination.name,
        reconciliation_identifier: destination.reconciliationIdentifier,
        notes: destination.notes,
        platform_attributes: destination.platformAttributes
          ? JSON.stringify(destination.platformAttributes)
          : null,
        custom_id: destination.customId,
        created_at: destination.createdAt,
        updated_at: destination.updatedAt,
      })
      .execute();
  }

  async getDestinationById(id: string): Promise<Destination | null> {
    const row = await this.db
      .selectFrom('destinations')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getDestinationByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<Destination | null> {
    let query = this.db
      .selectFrom('destinations')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async listDestinations(companyId: string, projectId: string | null): Promise<Destination[]> {
    let query = this.db.selectFrom('destinations').selectAll().where('company_id', '=', companyId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('name', 'asc').execute();
    return rows.map((r) => this.toEntity(r));
  }

  async updateDestination(destination: Destination): Promise<void> {
    await this.db
      .updateTable('destinations')
      .set({
        platform: destination.platform,
        variable_type: destination.variableType,
        identifier: destination.identifier,
        name: destination.name,
        reconciliation_identifier: destination.reconciliationIdentifier,
        notes: destination.notes,
        platform_attributes: destination.platformAttributes
          ? JSON.stringify(destination.platformAttributes)
          : null,
        updated_at: destination.updatedAt,
      })
      .where('id', '=', destination.id)
      .execute();
  }

  async setPropertyDestinations(
    propertyId: string,
    mappings: {
      destinationId: string;
      destinationNameOverride: string | null;
    }[],
    nowIso: string,
  ): Promise<void> {
    await this.db
      .deleteFrom('property_destinations')
      .where('property_id', '=', propertyId)
      .execute();

    if (mappings.length > 0) {
      await this.db
        .insertInto('property_destinations')
        .values(
          mappings.map((m) => ({
            property_id: propertyId,
            destination_id: m.destinationId,
            destination_name_override: m.destinationNameOverride,
            created_at: nowIso,
          })),
        )
        .execute();
    }
  }

  async getPropertyDestinations(propertyId: string): Promise<PropertyDestinationMapping[]> {
    const rows = await this.db
      .selectFrom('property_destinations')
      .selectAll()
      .where('property_id', '=', propertyId)
      .execute();
    return rows.map((r) => ({
      propertyId: r.property_id,
      destinationId: r.destination_id,
      destinationNameOverride: r.destination_name_override,
      createdAt: r.created_at,
    }));
  }

  private toEntity(row: {
    id: string;
    company_id: string;
    project_id: string | null;
    platform: string;
    variable_type: string;
    identifier: string;
    name: string;
    reconciliation_identifier: string | null;
    notes: string | null;
    platform_attributes: string | null;
    custom_id: string | null;
    created_at: string;
    updated_at: string;
  }): Destination {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      platform: row.platform,
      variableType: row.variable_type,
      identifier: row.identifier,
      name: row.name,
      reconciliationIdentifier: row.reconciliation_identifier,
      notes: row.notes,
      platformAttributes: row.platform_attributes
        ? (JSON.parse(row.platform_attributes) as Record<string, unknown>)
        : null,
      customId: row.custom_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteNavigationEventRepository implements NavigationEventRepository {
  constructor(private readonly db: Db) {}

  async createNavigationEvent(event: NavigationEvent): Promise<void> {
    await this.db
      .insertInto('navigation_events')
      .values({
        id: event.id,
        project_id: event.projectId,
        name: event.name,
        description: event.description,
        active: event.active ? 1 : 0,
        created_at: event.createdAt,
        updated_at: event.updatedAt,
      })
      .execute();
  }

  async getNavigationEventById(id: string): Promise<NavigationEvent | null> {
    const row = await this.db
      .selectFrom('navigation_events')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row
      ? {
          id: row.id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          active: Boolean(row.active),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async listNavigationEvents(projectId: string): Promise<NavigationEvent[]> {
    const rows = await this.db
      .selectFrom('navigation_events')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      active: Boolean(r.active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateNavigationEvent(event: NavigationEvent): Promise<void> {
    await this.db
      .updateTable('navigation_events')
      .set({
        name: event.name,
        description: event.description,
        active: event.active ? 1 : 0,
        updated_at: event.updatedAt,
      })
      .where('id', '=', event.id)
      .execute();
  }
}

export class SqliteTrackingRepository implements TrackingRepository {
  constructor(private readonly db: Db) {}

  async createTracking(tracking: Tracking): Promise<void> {
    await this.db
      .insertInto('trackings')
      .values({
        id: tracking.id,
        project_id: tracking.projectId,
        page_id: tracking.pageId,
        navigation_event_id: tracking.navigationEventId,
        name: tracking.name,
        slug: tracking.slug,
        description: tracking.description,
        custom_id: tracking.customId,
        created_at: tracking.createdAt,
        updated_at: tracking.updatedAt,
      })
      .execute();
  }

  async getTrackingById(id: string): Promise<Tracking | null> {
    const row = await this.db
      .selectFrom('trackings')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toTrackingEntity(row) : null;
  }

  async getTrackingByProjectAndSlug(projectId: string, slug: string): Promise<Tracking | null> {
    const row = await this.db
      .selectFrom('trackings')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('slug', '=', slug)
      .executeTakeFirst();
    return row ? this.toTrackingEntity(row) : null;
  }

  async getTrackingByCustomId(projectId: string, customId: string): Promise<Tracking | null> {
    const row = await this.db
      .selectFrom('trackings')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('custom_id', '=', customId)
      .executeTakeFirst();
    return row ? this.toTrackingEntity(row) : null;
  }

  async listTrackingsForProject(projectId: string): Promise<Tracking[]> {
    const rows = await this.db
      .selectFrom('trackings')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => this.toTrackingEntity(r));
  }

  async listTrackingsForPage(pageId: string): Promise<Tracking[]> {
    const rows = await this.db
      .selectFrom('trackings')
      .selectAll()
      .where('page_id', '=', pageId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => this.toTrackingEntity(r));
  }

  async updateTracking(tracking: Tracking): Promise<void> {
    await this.db
      .updateTable('trackings')
      .set({
        page_id: tracking.pageId,
        navigation_event_id: tracking.navigationEventId,
        name: tracking.name,
        slug: tracking.slug,
        description: tracking.description,
        updated_at: tracking.updatedAt,
      })
      .where('id', '=', tracking.id)
      .execute();
  }

  async setTrackingModules(trackingId: string, moduleIds: string[], nowIso: string): Promise<void> {
    await this.db.deleteFrom('tracking_modules').where('tracking_id', '=', trackingId).execute();

    if (moduleIds.length > 0) {
      await this.db
        .insertInto('tracking_modules')
        .values(
          moduleIds.map((mId) => ({
            tracking_id: trackingId,
            module_id: mId,
            created_at: nowIso,
          })),
        )
        .execute();
    }
  }

  async getTrackingModuleIds(trackingId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('tracking_modules')
      .select('module_id')
      .where('tracking_id', '=', trackingId)
      .execute();
    return rows.map((r) => r.module_id);
  }

  async setTrackingProperties(trackingProperties: TrackingProperty[]): Promise<void> {
    if (trackingProperties.length === 0) return;

    for (const tp of trackingProperties) {
      await this.db
        .insertInto('tracking_properties')
        .values({
          id: tp.id,
          tracking_id: tp.trackingId,
          property_id: tp.propertyId,
          source: tp.source,
          presence: tp.presence,
          created_at: tp.createdAt,
          updated_at: tp.updatedAt,
        })
        .onConflict((oc) =>
          oc.columns(['tracking_id', 'property_id']).doUpdateSet({
            source: tp.source,
            presence: tp.presence,
            updated_at: tp.updatedAt,
          }),
        )
        .execute();
    }
  }

  async getTrackingProperties(trackingId: string): Promise<TrackingProperty[]> {
    const rows = await this.db
      .selectFrom('tracking_properties')
      .selectAll()
      .where('tracking_id', '=', trackingId)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      trackingId: r.tracking_id,
      propertyId: r.property_id,
      source: r.source,
      presence: r.presence,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async removeTrackingProperty(trackingPropertyId: string): Promise<void> {
    await this.db
      .deleteFrom('specific_values')
      .where('tracking_property_id', '=', trackingPropertyId)
      .execute();

    await this.db.deleteFrom('tracking_properties').where('id', '=', trackingPropertyId).execute();
  }

  async setSpecificValues(specificValues: SpecificValue[]): Promise<void> {
    for (const sv of specificValues) {
      await this.db
        .insertInto('specific_values')
        .values({
          id: sv.id,
          tracking_property_id: sv.trackingPropertyId,
          value: sv.value,
          description: sv.description,
          created_at: sv.createdAt,
          updated_at: sv.updatedAt,
        })
        .onConflict((oc) =>
          oc.column('id').doUpdateSet({
            value: sv.value,
            description: sv.description,
            updated_at: sv.updatedAt,
          }),
        )
        .execute();
    }
  }

  async getSpecificValuesForTrackingProperty(trackingPropertyId: string): Promise<SpecificValue[]> {
    const rows = await this.db
      .selectFrom('specific_values')
      .selectAll()
      .where('tracking_property_id', '=', trackingPropertyId)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      trackingPropertyId: r.tracking_property_id,
      value: r.value,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getSpecificValuesForTracking(trackingId: string): Promise<SpecificValue[]> {
    const rows = await this.db
      .selectFrom('specific_values')
      .innerJoin(
        'tracking_properties',
        'tracking_properties.id',
        'specific_values.tracking_property_id',
      )
      .select([
        'specific_values.id',
        'specific_values.tracking_property_id',
        'specific_values.value',
        'specific_values.description',
        'specific_values.created_at',
        'specific_values.updated_at',
      ])
      .where('tracking_properties.tracking_id', '=', trackingId)
      .execute();

    return rows.map((r) => ({
      id: r.id,
      trackingPropertyId: r.tracking_property_id,
      value: r.value,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  private toTrackingEntity(row: {
    id: string;
    project_id: string;
    page_id: string | null;
    navigation_event_id: string;
    name: string;
    slug: string;
    description: string | null;
    custom_id: string | null;
    created_at: string;
    updated_at: string;
  }): Tracking {
    return {
      id: row.id,
      projectId: row.project_id,
      pageId: row.page_id,
      navigationEventId: row.navigation_event_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      customId: row.custom_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteTrackingTemplateRepository implements TrackingTemplateRepository {
  constructor(private readonly db: Db) {}

  async createTemplate(template: TrackingTemplate): Promise<void> {
    await this.db
      .insertInto('tracking_templates')
      .values({
        id: template.id,
        company_id: template.companyId,
        project_id: template.projectId,
        name: template.name,
        description: template.description,
        navigation_event_id: template.navigationEventId,
        config_json: template.configJson,
        custom_id: template.customId,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      })
      .execute();
  }

  async getTemplateById(id: string): Promise<TrackingTemplate | null> {
    const row = await this.db
      .selectFrom('tracking_templates')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row
      ? {
          id: row.id,
          companyId: row.company_id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          navigationEventId: row.navigation_event_id,
          configJson: row.config_json,
          customId: row.custom_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async getTemplateByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<TrackingTemplate | null> {
    let query = this.db
      .selectFrom('tracking_templates')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row
      ? {
          id: row.id,
          companyId: row.company_id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          navigationEventId: row.navigation_event_id,
          configJson: row.config_json,
          customId: row.custom_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async listTemplates(companyId: string, projectId: string | null): Promise<TrackingTemplate[]> {
    let query = this.db
      .selectFrom('tracking_templates')
      .selectAll()
      .where('company_id', '=', companyId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('name', 'asc').execute();
    return rows.map((r) => ({
      id: r.id,
      companyId: r.company_id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      navigationEventId: r.navigation_event_id,
      configJson: r.config_json,
      customId: r.custom_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateTemplate(template: TrackingTemplate): Promise<void> {
    await this.db
      .updateTable('tracking_templates')
      .set({
        name: template.name,
        description: template.description,
        navigation_event_id: template.navigationEventId,
        config_json: template.configJson,
        updated_at: template.updatedAt,
      })
      .where('id', '=', template.id)
      .execute();
  }
}

export class SqliteFreePageRepository implements FreePageRepository {
  constructor(private readonly db: Db) {}

  async createFreePage(page: FreePage): Promise<void> {
    await this.db
      .insertInto('free_pages')
      .values({
        id: page.id,
        company_id: page.companyId,
        project_id: page.projectId,
        title: page.title,
        slug: page.slug,
        content: page.content,
        publishable: page.publishable ? 1 : 0,
        custom_id: page.customId,
        created_at: page.createdAt,
        updated_at: page.updatedAt,
      })
      .execute();
  }

  async getFreePageById(id: string): Promise<FreePage | null> {
    const row = await this.db
      .selectFrom('free_pages')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getFreePageBySlug(
    companyId: string,
    projectId: string | null,
    slug: string,
  ): Promise<FreePage | null> {
    let query = this.db
      .selectFrom('free_pages')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('slug', '=', slug);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getFreePageByCustomId(
    companyId: string,
    projectId: string | null,
    customId: string,
  ): Promise<FreePage | null> {
    let query = this.db
      .selectFrom('free_pages')
      .selectAll()
      .where('company_id', '=', companyId)
      .where('custom_id', '=', customId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const row = await query.executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async listFreePages(companyId: string, projectId: string | null): Promise<FreePage[]> {
    let query = this.db.selectFrom('free_pages').selectAll().where('company_id', '=', companyId);

    if (projectId === null) {
      query = query.where('project_id', 'is', null);
    } else {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('title', 'asc').execute();
    return rows.map((r) => this.toEntity(r));
  }

  async updateFreePage(page: FreePage): Promise<void> {
    await this.db
      .updateTable('free_pages')
      .set({
        title: page.title,
        slug: page.slug,
        content: page.content,
        publishable: page.publishable ? 1 : 0,
        updated_at: page.updatedAt,
      })
      .where('id', '=', page.id)
      .execute();
  }

  private toEntity(row: {
    id: string;
    company_id: string;
    project_id: string | null;
    title: string;
    slug: string;
    content: string;
    publishable: number | boolean;
    custom_id: string | null;
    created_at: string;
    updated_at: string;
  }): FreePage {
    return {
      id: row.id,
      companyId: row.company_id,
      projectId: row.project_id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      publishable: Boolean(row.publishable),
      customId: row.custom_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteFlowRepository implements FlowRepository {
  constructor(private readonly db: Db) {}

  async createFlow(flow: Flow): Promise<void> {
    await this.db
      .insertInto('flows')
      .values({
        id: flow.id,
        project_id: flow.projectId,
        name: flow.name,
        slug: flow.slug,
        description: flow.description,
        custom_id: flow.customId,
        created_at: flow.createdAt,
        updated_at: flow.updatedAt,
      })
      .execute();
  }

  async getFlowById(id: string): Promise<Flow | null> {
    const row = await this.db
      .selectFrom('flows')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getFlowByProjectAndSlug(projectId: string, slug: string): Promise<Flow | null> {
    const row = await this.db
      .selectFrom('flows')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('slug', '=', slug)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async listFlowsForProject(projectId: string): Promise<Flow[]> {
    const rows = await this.db
      .selectFrom('flows')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => this.toEntity(r));
  }

  async updateFlow(flow: Flow): Promise<void> {
    await this.db
      .updateTable('flows')
      .set({
        name: flow.name,
        slug: flow.slug,
        description: flow.description,
        updated_at: flow.updatedAt,
      })
      .where('id', '=', flow.id)
      .execute();
  }

  async setFlowNodes(nodes: FlowNode[]): Promise<void> {
    if (nodes.length === 0) return;
    const first = nodes[0];
    if (!first) return;
    const flowId = first.flowId;
    await this.db.deleteFrom('flow_nodes').where('flow_id', '=', flowId).execute();

    await this.db
      .insertInto('flow_nodes')
      .values(
        nodes.map((n) => ({
          id: n.id,
          flow_id: n.flowId,
          node_type: n.nodeType,
          page_id: n.pageId,
          trigger_id: n.triggerId,
          position_x: n.positionX,
          position_y: n.positionY,
          created_at: n.createdAt,
        })),
      )
      .execute();
  }

  async getFlowNodes(flowId: string): Promise<FlowNode[]> {
    const rows = await this.db
      .selectFrom('flow_nodes')
      .selectAll()
      .where('flow_id', '=', flowId)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      flowId: r.flow_id,
      nodeType: r.node_type,
      pageId: r.page_id,
      triggerId: r.trigger_id,
      positionX: r.position_x,
      positionY: r.position_y,
      createdAt: r.created_at,
    }));
  }

  async setFlowEdges(edges: FlowEdge[]): Promise<void> {
    if (edges.length === 0) return;
    const first = edges[0];
    if (!first) return;
    const flowId = first.flowId;
    await this.db.deleteFrom('flow_edges').where('flow_id', '=', flowId).execute();

    await this.db
      .insertInto('flow_edges')
      .values(
        edges.map((e) => ({
          id: e.id,
          flow_id: e.flowId,
          from_node_id: e.fromNodeId,
          to_node_id: e.toNodeId,
          label: e.label,
          condition_description: e.conditionDescription,
          created_at: e.createdAt,
        })),
      )
      .execute();
  }

  async getFlowEdges(flowId: string): Promise<FlowEdge[]> {
    const rows = await this.db
      .selectFrom('flow_edges')
      .selectAll()
      .where('flow_id', '=', flowId)
      .execute();
    return rows.map((r) => ({
      id: r.id,
      flowId: r.flow_id,
      fromNodeId: r.from_node_id,
      toNodeId: r.to_node_id,
      label: r.label,
      conditionDescription: r.condition_description,
      createdAt: r.created_at,
    }));
  }

  private toEntity(row: {
    id: string;
    project_id: string;
    name: string;
    slug: string;
    description: string | null;
    custom_id: string | null;
    created_at: string;
    updated_at: string;
  }): Flow {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      customId: row.custom_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export class SqliteTriggerRepository implements TriggerRepository {
  constructor(private readonly db: Db) {}

  async createTrigger(trigger: Trigger): Promise<void> {
    await this.db
      .insertInto('triggers')
      .values({
        id: trigger.id,
        project_id: trigger.projectId,
        name: trigger.name,
        description: trigger.description,
        custom_id: trigger.customId,
        created_at: trigger.createdAt,
        updated_at: trigger.updatedAt,
      })
      .execute();
  }

  async getTriggerById(id: string): Promise<Trigger | null> {
    const row = await this.db
      .selectFrom('triggers')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row
      ? {
          id: row.id,
          projectId: row.project_id,
          name: row.name,
          description: row.description,
          customId: row.custom_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
      : null;
  }

  async listTriggersForProject(projectId: string): Promise<Trigger[]> {
    const rows = await this.db
      .selectFrom('triggers')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('name', 'asc')
      .execute();
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      name: r.name,
      description: r.description,
      customId: r.custom_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async updateTrigger(trigger: Trigger): Promise<void> {
    await this.db
      .updateTable('triggers')
      .set({
        name: trigger.name,
        description: trigger.description,
        updated_at: trigger.updatedAt,
      })
      .where('id', '=', trigger.id)
      .execute();
  }

  async setTriggerTrackings(
    triggerId: string,
    trackingIds: string[],
    nowIso: string,
  ): Promise<void> {
    await this.db.deleteFrom('trigger_trackings').where('trigger_id', '=', triggerId).execute();

    if (trackingIds.length > 0) {
      await this.db
        .insertInto('trigger_trackings')
        .values(
          trackingIds.map((tId) => ({
            trigger_id: triggerId,
            tracking_id: tId,
            created_at: nowIso,
          })),
        )
        .execute();
    }
  }

  async getTriggerTrackingIds(triggerId: string): Promise<string[]> {
    const rows = await this.db
      .selectFrom('trigger_trackings')
      .select('tracking_id')
      .where('trigger_id', '=', triggerId)
      .execute();
    return rows.map((r) => r.tracking_id);
  }
}

export class SqliteVersionRepository implements VersionRepository {
  constructor(private readonly db: Db) {}

  async createVersion(version: ProjectVersion): Promise<void> {
    await this.db
      .insertInto('versions')
      .values({
        id: version.id,
        project_id: version.projectId,
        version_number: version.versionNumber,
        title: version.title,
        release_notes: version.releaseNotes,
        changelog_json: JSON.stringify(version.changelog),
        snapshot_json: JSON.stringify(version.snapshot),
        created_by: version.createdBy,
        created_at: version.createdAt,
      })
      .execute();
  }

  async getVersionById(id: string): Promise<ProjectVersion | null> {
    const row = await this.db
      .selectFrom('versions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getVersionByProjectAndNumber(
    projectId: string,
    versionNumber: number,
  ): Promise<ProjectVersion | null> {
    const row = await this.db
      .selectFrom('versions')
      .selectAll()
      .where('project_id', '=', projectId)
      .where('version_number', '=', versionNumber)
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async getLatestVersion(projectId: string): Promise<ProjectVersion | null> {
    const row = await this.db
      .selectFrom('versions')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('version_number', 'desc')
      .executeTakeFirst();
    return row ? this.toEntity(row) : null;
  }

  async listVersionsForProject(projectId: string): Promise<ProjectVersion[]> {
    const rows = await this.db
      .selectFrom('versions')
      .selectAll()
      .where('project_id', '=', projectId)
      .orderBy('version_number', 'desc')
      .execute();
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: {
    id: string;
    project_id: string;
    version_number: number;
    title: string | null;
    release_notes: string | null;
    changelog_json: string;
    snapshot_json: string;
    created_by: string;
    created_at: string;
  }): ProjectVersion {
    return {
      id: row.id,
      projectId: row.project_id,
      versionNumber: row.version_number,
      title: row.title,
      releaseNotes: row.release_notes,
      changelog: JSON.parse(row.changelog_json) as ChangelogEntry[],
      snapshot: JSON.parse(row.snapshot_json) as ProjectVersionSnapshot,
      createdBy: row.created_by,
      createdAt: row.created_at,
    };
  }
}

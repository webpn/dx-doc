import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  // 1. navigation_events (REQ-DOM-002)
  await db.schema
    .createTable('navigation_events')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(sql`TRUE`))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('nav_events_project_name_unique', ['project_id', 'name'])
    .execute();

  // 2. properties (REQ-DOM-003, REQ-DOM-004, REQ-DOM-005, REQ-DOM-019)
  await db.schema
    .createTable('properties')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('business_label', 'text')
    .addColumn('description', 'text')
    .addColumn('data_source', 'text', (col) => col.notNull().defaultTo('development'))
    .addColumn('type', 'text', (col) => col.notNull().defaultTo('string'))
    .addColumn('format_pattern', 'text')
    .addColumn('allowed_values', 'text')
    .addColumn('example_values', 'text')
    .addColumn('pii_flag', 'boolean', (col) => col.notNull().defaultTo(sql`FALSE`))
    .addColumn('hashing_policy', 'text')
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('active'))
    .addColumn('introduced_in_version', 'text')
    .addColumn('analysis_notes', 'text')
    .addColumn('aep_field_group', 'text')
    .addColumn('parent_property_id', 'char(36)', (col) => col.references('properties.id'))
    .addColumn('derived_from', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addCheckConstraint(
      'properties_data_source_check',
      sql`data_source IN ('development', 'tag_manager', 'other')`,
    )
    .addCheckConstraint(
      'properties_type_check',
      sql`type IN ('string', 'number', 'boolean', 'array', 'object')`,
    )
    .addCheckConstraint('properties_status_check', sql`status IN ('active', 'deprecated')`)
    .execute();

  // 3. modules (REQ-DOM-006, REQ-DOM-019)
  await db.schema
    .createTable('modules')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 4. module_properties
  await db.schema
    .createTable('module_properties')
    .addColumn('module_id', 'char(36)', (col) => col.references('modules.id').notNull())
    .addColumn('property_id', 'char(36)', (col) => col.references('properties.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('module_properties_pk', ['module_id', 'property_id'])
    .execute();

  // 5. destinations (REQ-DOM-015, REQ-DOM-019)
  await db.schema
    .createTable('destinations')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('platform', 'text', (col) => col.notNull())
    .addColumn('variable_type', 'text', (col) => col.notNull())
    .addColumn('identifier', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('reconciliation_identifier', 'text')
    .addColumn('notes', 'text')
    .addColumn('platform_attributes', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 6. property_destinations (REQ-DOM-015, REQ-DOM-016)
  await db.schema
    .createTable('property_destinations')
    .addColumn('property_id', 'char(36)', (col) => col.references('properties.id').notNull())
    .addColumn('destination_id', 'char(36)', (col) => col.references('destinations.id').notNull())
    .addColumn('destination_name_override', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('property_destinations_pk', ['property_id', 'destination_id'])
    .execute();

  // 7. tracking_templates (REQ-DOM-009, REQ-DOM-019)
  await db.schema
    .createTable('tracking_templates')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('navigation_event_id', 'char(36)', (col) => col.references('navigation_events.id'))
    .addColumn('config_json', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 8. free_pages (REQ-DOM-001, REQ-AUTH-003)
  await db.schema
    .createTable('free_pages')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('company_id', 'char(36)', (col) => col.references('company.id').notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id'))
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('content', 'text', (col) => col.notNull().defaultTo(''))
    .addColumn('publishable', 'boolean', (col) => col.notNull().defaultTo(sql`TRUE`))
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  // 9. trackings (REQ-DOM-002)
  await db.schema
    .createTable('trackings')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('project_id', 'char(36)', (col) => col.references('projects.id').notNull())
    .addColumn('page_id', 'char(36)', (col) => col.references('pages.id'))
    .addColumn('navigation_event_id', 'char(36)', (col) =>
      col.references('navigation_events.id').notNull(),
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('slug', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('custom_id', 'varchar')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('trackings_project_slug_unique', ['project_id', 'slug'])
    .execute();

  // 10. tracking_modules
  await db.schema
    .createTable('tracking_modules')
    .addColumn('tracking_id', 'char(36)', (col) => col.references('trackings.id').notNull())
    .addColumn('module_id', 'char(36)', (col) => col.references('modules.id').notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('tracking_modules_pk', ['tracking_id', 'module_id'])
    .execute();

  // 11. tracking_properties (REQ-DOM-027)
  await db.schema
    .createTable('tracking_properties')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('tracking_id', 'char(36)', (col) => col.references('trackings.id').notNull())
    .addColumn('property_id', 'char(36)', (col) => col.references('properties.id').notNull())
    .addColumn('source', 'text', (col) => col.notNull().defaultTo('direct'))
    .addColumn('presence', 'text', (col) => col.notNull().defaultTo('always'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .addUniqueConstraint('tracking_properties_tracking_property_unique', [
      'tracking_id',
      'property_id',
    ])
    .addCheckConstraint('tracking_properties_source_check', sql`source IN ('direct', 'module')`)
    .addCheckConstraint(
      'tracking_properties_presence_check',
      sql`presence IN ('always', 'sometimes', 'never')`,
    )
    .execute();

  // 12. specific_values (REQ-DOM-010)
  await db.schema
    .createTable('specific_values')
    .addColumn('id', 'char(36)', (col) => col.primaryKey().notNull())
    .addColumn('tracking_property_id', 'char(36)', (col) =>
      col.references('tracking_properties.id').notNull(),
    )
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

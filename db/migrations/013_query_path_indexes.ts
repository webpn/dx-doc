import { sql, type Kysely } from 'kysely';

/**
 * Add indexes for all foreign keys and custom_id lookups (M1.14, REQ-NFR-015).
 * Reconciliation reports and search sync scan by foreign key and custom_id;
 * without indexes these become full table scans at scale.
 *
 * Indexes on foreign keys (join performance, REQ-NFR-002):
 * - company_id: used by reconciliation to list entities per company
 * - project_id: used by reconciliation to list entities per project
 * - user_id: used by audit log queries
 * - role_id: used by permission checks
 * - parent_id, parent_property_id: used by property hierarchy queries
 * - module_id, property_id, destination_id, navigation_event_id, page_id,
 *   trigger_id, tracking_id, flow_id: used by entity relationship queries
 *
 * Indexes on custom_id (idempotency, REQ-IMP-003, REQ-NFR-004):
 * - custom_id on all catalogue entities (pages, properties, modules, etc.)
 *   used by search sync and import logic to dedup and update by idempotent key
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  // Create all indexes using raw SQL
  await sql`CREATE INDEX idx_roles_company_id ON roles(company_id)`.execute(db);
  await sql`CREATE INDEX idx_users_company_id ON users(company_id)`.execute(db);
  await sql`CREATE INDEX idx_users_role_id ON users(role_id)`.execute(db);
  await sql`CREATE INDEX idx_projects_company_id ON projects(company_id)`.execute(db);
  await sql`CREATE INDEX idx_project_grouping_labels_project_id ON project_grouping_labels(project_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_project_grants_project_id ON project_grants(project_id)`.execute(db);
  await sql`CREATE INDEX idx_project_grants_user_id ON project_grants(user_id)`.execute(db);
  await sql`CREATE INDEX idx_project_grants_role_id ON project_grants(role_id)`.execute(db);

  await sql`CREATE INDEX idx_pages_project_id ON pages(project_id)`.execute(db);
  await sql`CREATE INDEX idx_pages_parent_id ON pages(parent_id)`.execute(db);

  await sql`CREATE INDEX idx_sessions_user_id ON sessions(user_id)`.execute(db);

  await sql`CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_navigation_events_project_id ON navigation_events(project_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_properties_company_id ON properties(company_id)`.execute(db);
  await sql`CREATE INDEX idx_properties_project_id ON properties(project_id)`.execute(db);
  await sql`CREATE INDEX idx_properties_parent_property_id ON properties(parent_property_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_modules_company_id ON modules(company_id)`.execute(db);
  await sql`CREATE INDEX idx_modules_project_id ON modules(project_id)`.execute(db);

  await sql`CREATE INDEX idx_module_properties_module_id ON module_properties(module_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_module_properties_property_id ON module_properties(property_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_destinations_company_id ON destinations(company_id)`.execute(db);
  await sql`CREATE INDEX idx_destinations_project_id ON destinations(project_id)`.execute(db);

  await sql`CREATE INDEX idx_property_destinations_property_id ON property_destinations(property_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_property_destinations_destination_id ON property_destinations(destination_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_tracking_templates_company_id ON tracking_templates(company_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_tracking_templates_project_id ON tracking_templates(project_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_free_pages_company_id ON free_pages(company_id)`.execute(db);
  await sql`CREATE INDEX idx_free_pages_project_id ON free_pages(project_id)`.execute(db);

  await sql`CREATE INDEX idx_trackings_project_id ON trackings(project_id)`.execute(db);
  await sql`CREATE INDEX idx_trackings_navigation_event_id ON trackings(navigation_event_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_tracking_modules_tracking_id ON tracking_modules(tracking_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_tracking_modules_module_id ON tracking_modules(module_id)`.execute(db);

  await sql`CREATE INDEX idx_tracking_properties_tracking_id ON tracking_properties(tracking_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_tracking_properties_property_id ON tracking_properties(property_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_specific_values_tracking_property_id ON specific_values(tracking_property_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_flows_project_id ON flows(project_id)`.execute(db);

  await sql`CREATE INDEX idx_triggers_project_id ON triggers(project_id)`.execute(db);

  await sql`CREATE INDEX idx_trigger_trackings_trigger_id ON trigger_trackings(trigger_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_trigger_trackings_tracking_id ON trigger_trackings(tracking_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_flow_nodes_flow_id ON flow_nodes(flow_id)`.execute(db);
  await sql`CREATE INDEX idx_flow_nodes_page_id ON flow_nodes(page_id)`.execute(db);
  await sql`CREATE INDEX idx_flow_nodes_trigger_id ON flow_nodes(trigger_id)`.execute(db);

  await sql`CREATE INDEX idx_flow_edges_flow_id ON flow_edges(flow_id)`.execute(db);
  await sql`CREATE INDEX idx_flow_edges_from_node_id ON flow_edges(from_node_id)`.execute(db);
  await sql`CREATE INDEX idx_flow_edges_to_node_id ON flow_edges(to_node_id)`.execute(db);

  await sql`CREATE INDEX idx_versions_project_id ON versions(project_id)`.execute(db);

  await sql`CREATE INDEX idx_project_shared_passwords_project_id ON project_shared_passwords(project_id)`.execute(
    db,
  );

  await sql`CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id)`.execute(db);
  await sql`CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id)`.execute(db);
  await sql`CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id)`.execute(db);

  await sql`CREATE INDEX idx_api_service_tokens_user_id ON api_service_tokens(user_id)`.execute(db);

  await sql`CREATE INDEX idx_assets_project_id ON assets(project_id)`.execute(db);
  await sql`CREATE INDEX idx_assets_company_id ON assets(company_id)`.execute(db);

  // Custom_id indexes for idempotent lookups
  await sql`CREATE INDEX idx_pages_custom_id ON pages(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_properties_custom_id ON properties(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_modules_custom_id ON modules(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_destinations_custom_id ON destinations(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_tracking_templates_custom_id ON tracking_templates(custom_id)`.execute(
    db,
  );
  await sql`CREATE INDEX idx_free_pages_custom_id ON free_pages(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_trackings_custom_id ON trackings(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_flows_custom_id ON flows(custom_id)`.execute(db);
  await sql`CREATE INDEX idx_triggers_custom_id ON triggers(custom_id)`.execute(db);
}

export function down(): Promise<void> {
  return Promise.reject(
    new Error('Forward-only migrations: downgrade is not supported (ADR-0015, ADR-0024)'),
  );
}

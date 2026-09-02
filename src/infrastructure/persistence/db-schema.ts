/**
 * Kysely `Database` type — the type-level description of the dx-doc schema.
 *
 * ADR-0024: this interface is the type-level source of truth that the
 * repositories query against.
 *
 * Conventions:
 * - Every column name uses camelCase at the TypeScript level. The
 *   underlying database column is snake_case (e.g. `company_id`); Kysely
 *   maps the two via the type-level shape.
 * - UUIDv4 identifiers are typed as `string`; the application owns
 *   generation (ADR-0004, D31).
 * - Timestamps are UTC ISO 8601 text (ADR-0020 portable subset), typed as
 *   `string` at the application level. We do not use dialect-specific
 *   datetime types.
 * - JSON is stored as text. Querying JSON contents happens in application
 *   code, not in SQL (ADR-0020).
 * - Booleans are stored as `boolean` columns. SQLite has no native
 *   boolean type; Kysely's `BooleanColumnType` maps to INTEGER 0/1
 *   transparently for SQLite, and to native BOOLEAN for MariaDB and
 *   PostgreSQL when those adapters ship (R2).
 * - Nullable columns are typed `string | null` (etc.).
 */
import type { ColumnType, Generated } from 'kysely';

export type Presence = 'always' | 'sometimes' | 'never';
export type PropertySource = 'direct' | 'module';
export type PropertyDataSource = 'development' | 'tag_manager' | 'other';
export type PropertyStatus = 'active' | 'deprecated';
export type PropertyDataType = 'string' | 'number' | 'boolean' | 'array' | 'object';

/**
 * The full set of tables dx-doc persists.
 */
export interface Database {
  company: CompanyTable;
  roles: RolesTable;
  users: UsersTable;
  projects: ProjectsTable;
  project_grouping_labels: ProjectGroupingLabelsTable;
  project_grants: ProjectGrantsTable;
  pages: PagesTable;
  sessions: SessionsTable;
  instance_admin_stepups: InstanceAdminStepupsTable;
  password_reset_tokens: PasswordResetTokensTable;
  navigation_events: NavigationEventsTable;
  properties: PropertiesTable;
  modules: ModulesTable;
  module_properties: ModulePropertiesTable;
  destinations: DestinationsTable;
  property_destinations: PropertyDestinationsTable;
  tracking_templates: TrackingTemplatesTable;
  free_pages: FreePagesTable;
  trackings: TrackingsTable;
  tracking_modules: TrackingModulesTable;
  tracking_properties: TrackingPropertiesTable;
  specific_values: SpecificValuesTable;
  flows: FlowsTable;
  triggers: TriggersTable;
  trigger_trackings: TriggerTrackingsTable;
  flow_nodes: FlowNodesTable;
  flow_edges: FlowEdgesTable;
  versions: VersionsTable;
  project_shared_passwords: ProjectSharedPasswordsTable;
  audit_logs: AuditLogsTable;
  api_service_tokens: ApiServiceTokensTable;
  assets: AssetsTable;
  company_deletion_markers: CompanyDeletionMarkersTable;
}

/**
 * Runtime mapping of table names to their expected column names.
 * Used by the drift-guard test (`db-schema.test.ts`) to ensure
 * synchronization between migrations and TypeScript interfaces.
 */
export type DatabaseSchemaDefinition = {
  [K in keyof Database]: readonly (string & keyof Database[K])[];
};

export const SCHEMA_DEFINITIONS: DatabaseSchemaDefinition = {
  company: ['id', 'name', 'slug', 'created_at', 'updated_at'],
  roles: ['id', 'company_id', 'name', 'created_at', 'updated_at'],
  users: [
    'id',
    'company_id',
    'role_id',
    'email',
    'password_hash',
    'name',
    'instance_admin',
    'active',
    'password_must_change',
    'created_at',
    'updated_at',
  ],
  projects: [
    'id',
    'company_id',
    'name',
    'slug',
    'description',
    'icon',
    'platform',
    'tag_manager',
    'lifecycle_state',
    'integration_settings',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  project_grouping_labels: ['project_id', 'label'],
  project_grants: ['id', 'project_id', 'user_id', 'role_id', 'created_at', 'updated_at'],
  pages: [
    'id',
    'project_id',
    'parent_id',
    'name',
    'slug',
    'description',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  sessions: ['id', 'user_id', 'token_hash', 'expires_at', 'created_at', 'actor_kind', 'project_id'],
  instance_admin_stepups: ['id', 'user_id', 'company_id', 'created_at', 'expires_at'],
  password_reset_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at'],
  navigation_events: [
    'id',
    'project_id',
    'name',
    'description',
    'active',
    'created_at',
    'updated_at',
  ],
  properties: [
    'id',
    'company_id',
    'project_id',
    'name',
    'business_label',
    'description',
    'data_source',
    'type',
    'format_pattern',
    'allowed_values',
    'example_values',
    'pii_flag',
    'hashing_policy',
    'status',
    'introduced_in_version',
    'analysis_notes',
    'aep_field_group',
    'parent_property_id',
    'derived_from',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  modules: [
    'id',
    'company_id',
    'project_id',
    'name',
    'description',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  module_properties: ['module_id', 'property_id', 'created_at'],
  destinations: [
    'id',
    'company_id',
    'project_id',
    'platform',
    'variable_type',
    'identifier',
    'name',
    'reconciliation_identifier',
    'notes',
    'platform_attributes',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  property_destinations: [
    'property_id',
    'destination_id',
    'destination_name_override',
    'created_at',
  ],
  tracking_templates: [
    'id',
    'company_id',
    'project_id',
    'name',
    'description',
    'navigation_event_id',
    'config_json',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  free_pages: [
    'id',
    'company_id',
    'project_id',
    'title',
    'slug',
    'content',
    'publishable',
    'custom_id',
    'parent_id',
    'created_at',
    'updated_at',
  ],
  trackings: [
    'id',
    'project_id',
    'page_id',
    'navigation_event_id',
    'name',
    'slug',
    'description',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  tracking_modules: ['tracking_id', 'module_id', 'created_at'],
  tracking_properties: [
    'id',
    'tracking_id',
    'property_id',
    'source',
    'presence',
    'created_at',
    'updated_at',
  ],
  specific_values: [
    'id',
    'tracking_property_id',
    'value',
    'description',
    'created_at',
    'updated_at',
  ],
  flows: [
    'id',
    'project_id',
    'name',
    'slug',
    'description',
    'custom_id',
    'created_at',
    'updated_at',
  ],
  triggers: ['id', 'project_id', 'name', 'description', 'custom_id', 'created_at', 'updated_at'],
  trigger_trackings: ['trigger_id', 'tracking_id', 'created_at'],
  flow_nodes: [
    'id',
    'flow_id',
    'node_type',
    'page_id',
    'trigger_id',
    'position_x',
    'position_y',
    'created_at',
  ],
  flow_edges: [
    'id',
    'flow_id',
    'from_node_id',
    'to_node_id',
    'label',
    'condition_description',
    'created_at',
  ],
  versions: [
    'id',
    'project_id',
    'version_number',
    'title',
    'release_notes',
    'changelog_json',
    'snapshot_json',
    'created_by',
    'created_at',
  ],
  project_shared_passwords: [
    'id',
    'project_id',
    'password_hash',
    'label',
    'expires_at',
    'created_at',
    'updated_at',
  ],
  audit_logs: [
    'id',
    'company_id',
    'project_id',
    'actor_id',
    'action',
    'entity_type',
    'entity_id',
    'details_json',
    'created_at',
    'actor_kind',
  ],
  api_service_tokens: [
    'id',
    'user_id',
    'name',
    'token_hash',
    'created_at',
    'expires_at',
    'revoked_at',
  ],
  assets: [
    'id',
    'company_id',
    'project_id',
    'custom_id',
    'storage_key',
    'content_type',
    'size_bytes',
    'width',
    'height',
    'original_filename',
    'created_at',
    'updated_at',
  ],
  company_deletion_markers: ['company_id', 'created_at'],
};

export interface CompanyTable {
  id: string;
  name: string;
  slug: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface RolesTable {
  id: string;
  company_id: string;
  name: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface UsersTable {
  id: string;
  company_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  role_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  email: string;
  password_hash: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  name: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  instance_admin: ColumnType<
    number | boolean,
    number | boolean | undefined,
    number | boolean | undefined
  >;
  active: ColumnType<number | boolean, number | boolean | undefined, number | boolean | undefined>;
  password_must_change: ColumnType<
    number | boolean,
    number | boolean | undefined,
    number | boolean | undefined
  >;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ProjectsTable {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  icon: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  platform: 'web' | 'ios' | 'android' | 'flutter' | 'react';
  tag_manager: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  lifecycle_state: ColumnType<
    'active' | 'archived',
    'active' | 'archived' | undefined,
    'active' | 'archived' | undefined
  >;
  integration_settings: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ProjectGroupingLabelsTable {
  project_id: string;
  label: string;
}

export interface ProjectGrantsTable {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface PagesTable {
  id: string;
  project_id: string;
  parent_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  name: string;
  slug: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface SessionsTable {
  id: string;
  user_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  token_hash: string;
  expires_at: string;
  created_at: string;
  actor_kind: 'session' | 'reader';
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
}

/** Instance-admin step-up windows (ADR-0027). See migration 015 and REQ-SEC-014. */
export interface InstanceAdminStepupsTable {
  id: string;
  user_id: string;
  company_id: string;
  created_at: string;
  expires_at: string;
}

export interface PasswordResetTokensTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: string;
}

export interface NavigationEventsTable {
  id: string;
  project_id: string;
  name: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  active: ColumnType<number | boolean, number | boolean | undefined, number | boolean | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface PropertiesTable {
  id: string;
  company_id: string;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  name: string;
  business_label: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  data_source: PropertyDataSource;
  type: PropertyDataType;
  format_pattern: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  allowed_values: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  example_values: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  pii_flag: ColumnType<
    number | boolean,
    number | boolean | undefined,
    number | boolean | undefined
  >;
  hashing_policy: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  status: PropertyStatus;
  introduced_in_version: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  analysis_notes: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  aep_field_group: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  parent_property_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  derived_from: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ModulesTable {
  id: string;
  company_id: string;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  name: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ModulePropertiesTable {
  module_id: string;
  property_id: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface DestinationsTable {
  id: string;
  company_id: string;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  platform: string;
  variable_type: string;
  identifier: string;
  name: string;
  reconciliation_identifier: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  notes: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  platform_attributes: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface PropertyDestinationsTable {
  property_id: string;
  destination_id: string;
  destination_name_override: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TrackingTemplatesTable {
  id: string;
  company_id: string;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  name: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  navigation_event_id: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  config_json: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface FreePagesTable {
  id: string;
  company_id: string;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  title: string;
  slug: string;
  content: string;
  publishable: ColumnType<
    number | boolean,
    number | boolean | undefined,
    number | boolean | undefined
  >;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  // REQ-AUTH-003: free pages carry their own hierarchy, independent of `pages`.
  parent_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TrackingsTable {
  id: string;
  project_id: string;
  page_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  navigation_event_id: string;
  name: string;
  slug: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TrackingModulesTable {
  tracking_id: string;
  module_id: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TrackingPropertiesTable {
  id: string;
  tracking_id: string;
  property_id: string;
  source: PropertySource;
  presence: Presence;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface SpecificValuesTable {
  id: string;
  tracking_property_id: string;
  value: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface FlowsTable {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TriggersTable {
  id: string;
  project_id: string;
  name: string;
  description: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface TriggerTrackingsTable {
  trigger_id: string;
  tracking_id: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface FlowNodesTable {
  id: string;
  flow_id: string;
  node_type: 'page' | 'trigger';
  page_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  trigger_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  position_x: ColumnType<number | null, number | null | undefined, number | null | undefined>;
  position_y: ColumnType<number | null, number | null | undefined, number | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface FlowEdgesTable {
  id: string;
  flow_id: string;
  from_node_id: string;
  to_node_id: string;
  label: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  condition_description: ColumnType<
    string | null,
    string | null | undefined,
    string | null | undefined
  >;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface VersionsTable {
  id: string;
  project_id: string;
  version_number: number;
  title: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  release_notes: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  changelog_json: string;
  snapshot_json: string;
  created_by: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface ProjectSharedPasswordsTable {
  id: string;
  project_id: string;
  password_hash: string;
  label: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  expires_at: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

export interface AuditLogsTable {
  id: string;
  company_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  project_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  details_json: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  actor_kind: ColumnType<string, string | undefined, string | undefined>;
}

export interface ApiServiceTokensTable {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: ColumnType<string | null, string | null | undefined, string | null | undefined>;
}

export interface AssetsTable {
  id: string;
  company_id: string;
  project_id: string;
  custom_id: ColumnType<string | null, string | null | undefined, string | null | undefined>;
  storage_key: string;
  content_type: string;
  size_bytes: number;
  width: number;
  height: number;
  original_filename: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
  updated_at: ColumnType<string, string | undefined, string | undefined>;
}

/**
 * Marks a company as having a `deleteCompanyCascade` in flight (migration
 * 018). Its sole purpose is to key the narrow exception the audit-logs
 * append-only trigger grants to that one cascade — see the migration's own
 * comment for why the exception exists and how it stays narrow.
 */
export interface CompanyDeletionMarkersTable {
  company_id: string;
  created_at: ColumnType<string, string | undefined, string | undefined>;
}

export type { Generated };

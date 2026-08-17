/**
 * Kysely `Database` type — the type-level description of the dx-doc schema.
 *
 * ADR-0024: this interface is the type-level source of truth that the
 * repositories query against. It is hand-maintained in R1 (the schema is
 * small: 9 tables, all created in the current pre-R1 effort). A vitest
 * (`db-schema.test.ts`) reads the live SQLite schema and asserts every
 * table and column named here actually exists, so a drift between this
 * file and the migrations fails the build.
 *
 * Codegen of this interface (e.g. via `kysely-codegen`) is **deferred to
 * R2** when a second adapter exists and the manual interface becomes the
 * actual maintenance burden. See ADR-0024 §Consequences.
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
 * - Nullable columns are typed `string | null` (etc.). `string | null`
 *   for nullable text, `string | null` for nullable timestamp, etc.
 *   We do not use `string | undefined` — this is a database column,
 *   not an optional TypeScript property.
 *
 * The order of tables mirrors the order in which the migrations create
 * them. The order is not semantically meaningful; the alphabetical
 * ordering of column names within each table is enforced by the
 * formatter.
 */
import type { ColumnType, Generated } from 'kysely';

/**
 * The full set of tables dx-doc persists. Adding a new table requires:
 *  1. a new migration in `db/migrations/` (Kysely schema API, R1 onward)
 *  2. an entry in this interface
 *  3. a repository that uses the new table (or an extension to an
 *     existing one) under `src/infrastructure/persistence/`
 *
 * The drift-guard test (`db-schema.test.ts`) verifies (1) and (2) match.
 * TypeScript verifies (2) and (3) match (the repository cannot reference
 * a table that is not in this interface).
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
  password_reset_tokens: PasswordResetTokensTable;
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
  pages: ['id', 'project_id', 'parent_id', 'name', 'slug', 'custom_id', 'created_at', 'updated_at'],
  sessions: ['id', 'user_id', 'token_hash', 'expires_at', 'created_at'],
  password_reset_tokens: ['id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at'],
};

/**
 * `company` — the tenant boundary (REQ-FDN-002).
 *
 * One row per organisation. The slug is unique across the platform.
 * The instance administrator (REQ-SEC-014) is a `users` row with
 * `companyId = NULL`; a company-less user is not a member of any
 * tenant.
 */
export interface CompanyTable {
  id: string;
  name: string;
  slug: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `roles` — the four company-scoped roles (REQ-SEC-002).
 *
 * One row per (company, role-name) pair. The CHECK constraint on
 * `name` is enforced at the database level; the application
 * (`isCompanyRoleName` in `src/application/auth/roles.ts`) also
 * narrows the union before sending writes.
 */
export interface RolesTable {
  id: string;
  company_id: string;
  name: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `users` — every login identity on the platform.
 *
 * A user belongs to at most one company. An instance administrator
 * has `company_id = NULL` (the migration that introduced this is
 * `004_nullable_company.sql`, carried over verbatim into the
 * Kysely migration in commit 10). `role_id` is the user's company
 * role and is nullable: an invited or first SSO user has no role
 * until one is assigned deliberately. `password_hash` is nullable
 * for accounts that authenticate only via SSO (M2.8).
 * `instance_admin` is the discrete capability flag (REQ-SEC-014);
 * `active` is the deactivation flag (REQ-SEC-013);
 * `password_must_change` flags accounts that must rotate on next
 * login (REQ-SEC-013).
 */
export interface UsersTable {
  id: string;
  company_id: string | null;
  role_id: string | null;
  email: string;
  password_hash: string | null;
  name: string | null;
  instance_admin: ColumnType<boolean, boolean | undefined, never>;
  active: ColumnType<boolean, boolean | undefined, never>;
  password_must_change: ColumnType<boolean, boolean | undefined, never>;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `projects` — one product on one platform; the unit of access
 * control, versioning and publication (REQ-FDN-003).
 *
 * `platform` is one of the five REQ-FDN-003 values (CHECK
 * constraint); `lifecycle_state` is `active` | `archived`
 * (CHECK constraint); `custom_id` is a single nullable
 * varchar unique within the company (D30, REQ-IMP-003).
 */
export interface ProjectsTable {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  platform: string;
  tag_manager: string | null;
  lifecycle_state: string;
  integration_settings: string | null;
  custom_id: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `project_grouping_labels` — flat many-to-many between projects
 * and free-form labels (REQ-FDN-003).
 *
 * Composite primary key on (project_id, label). Affects listing
 * and filtering only; never access control. A join value, not a
 * domain entity, so it carries no id and no timestamps.
 */
export interface ProjectGroupingLabelsTable {
  project_id: string;
  label: string;
}

/**
 * `project_grants` — a user's role within one project
 * (REQ-SEC-003).
 *
 * One grant per (project, user); the grant's role is one of the
 * four. Uniqueness is enforced at the database level.
 */
export interface ProjectGrantsTable {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `pages` — the page/screen hierarchy within a project
 * (REQ-NAV-001).
 *
 * `parent_id` builds the in-project hierarchy; `custom_id` is
 * the single nullable varchar unique within the project.
 * Composition rules arrive with M1.1.
 */
export interface PagesTable {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  custom_id: string | null;
  created_at: ColumnType<string, string | undefined, never>;
  updated_at: ColumnType<string, string | undefined, never>;
}

/**
 * `sessions` — server-side, database-backed sessions (D18).
 *
 * The raw cookie value is never stored; only its SHA-256 hash.
 * Sessions expire per `AUTH_SESSION_TTL`.
 */
export interface SessionsTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

/**
 * `password_reset_tokens` — single-use, expiring reset tokens
 * (REQ-SEC-013).
 *
 * Only the SHA-256 hash is stored; an expired or consumed token
 * cannot be replayed. `used_at` is null until the token is
 * consumed.
 */
export interface PasswordResetTokensTable {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// `Generated<>` is part of the Kysely surface and is referenced in the
// `ColumnType` generic above; we re-export it here so the import is
// visible to readers scanning the file. The export is intentional and
// internal to the persistence layer.
export type { Generated };

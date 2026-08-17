-- 001_create_schema.sql
-- Schema v1 (M0.2) — persistence foundation.
--
-- Portability rules (ADR-0020 / REQ-FDN-020), in force from the first file:
--   * No auto-increment: ids are application-generated UUIDv4 text (ADR-0004),
--     timestamps as UTC ISO 8601 text.
--   * Every table carrying tenancy has company_id directly or reaches it
--     through an unambiguous parent chain to a project (REQ-FDN-002).
--   * custom_id is a single nullable varchar (D30), unique within its scope,
--     orthogonal to the immutable id (REQ-IMP-003).
--   * JSON is stored as text; no SQL JSON functions (ADR-0020).
-- No demo, sample or test data is inserted by any migration (ADR-0015).
-- Forward-only: there is no down block (ADR-0015, no downgrade path).

-- migrate:up

-- Company — the tenant boundary (REQ-FDN-002).
CREATE TABLE company (
  id         char(36) NOT NULL PRIMARY KEY,
  name       text     NOT NULL,
  slug       text     NOT NULL,
  created_at text     NOT NULL,
  updated_at text     NOT NULL,
  UNIQUE (slug)
);

-- Role — the four company-scoped roles (REQ-SEC-002). One row per company.
CREATE TABLE roles (
  id         char(36) NOT NULL PRIMARY KEY,
  company_id char(36) NOT NULL REFERENCES company (id),
  name       text     NOT NULL,
  created_at text     NOT NULL,
  updated_at text     NOT NULL,
  UNIQUE (company_id, name),
  CONSTRAINT roles_name_check
    CHECK (name IN ('admin', 'project_manager', 'editor', 'viewer'))
);

-- users — a user belongs to exactly one company (REQ-SEC-002).
-- role_id is the company role and is nullable: an invited or first SSO user
-- has no role until one is assigned deliberately (REQ-SEC-002/004/013).
-- password_hash is nullable for accounts that authenticate only via SSO (M2.8).
-- instance_admin is the discrete capability flag, independent of the roles
-- (REQ-SEC-014).
CREATE TABLE users (
  id             char(36) NOT NULL PRIMARY KEY,
  company_id     char(36) NOT NULL REFERENCES company (id),
  role_id        char(36) REFERENCES roles (id),
  email          text     NOT NULL,
  password_hash  text,
  name           text,
  instance_admin boolean  NOT NULL DEFAULT FALSE,
  created_at     text     NOT NULL,
  updated_at     text     NOT NULL,
  UNIQUE (company_id, email)
);

-- project — one product on one platform; the unit of access control,
-- versioning and publication (REQ-FDN-003).
CREATE TABLE projects (
  id                   char(36) NOT NULL PRIMARY KEY,
  company_id           char(36) NOT NULL REFERENCES company (id),
  name                 text     NOT NULL,
  slug                 text     NOT NULL,
  description          text,
  icon                 text,
  platform             text     NOT NULL,
  tag_manager          text,
  lifecycle_state      text     NOT NULL DEFAULT 'active',
  integration_settings text,
  custom_id            varchar,
  created_at           text     NOT NULL,
  updated_at           text     NOT NULL,
  UNIQUE (company_id, slug),
  UNIQUE (company_id, custom_id),
  CONSTRAINT projects_platform_check
    CHECK (platform IN ('web', 'ios', 'android', 'flutter', 'react')),
  CONSTRAINT projects_lifecycle_check
    CHECK (lifecycle_state IN ('active', 'archived'))
);

-- Flat grouping labels, many-to-many with projects; free-form and affecting
-- listing/filtering only, never access control (REQ-FDN-003). A join value,
-- not a domain entity, so it carries a composite key and no id.
CREATE TABLE project_grouping_labels (
  project_id char(36) NOT NULL REFERENCES projects (id),
  label      text     NOT NULL,
  PRIMARY KEY (project_id, label)
);

-- project_grant — a user's role within one project (REQ-SEC-003).
-- One grant per user per project; the grant's role is one of the four.
CREATE TABLE project_grants (
  id         char(36) NOT NULL PRIMARY KEY,
  project_id char(36) NOT NULL REFERENCES projects (id),
  user_id    char(36) NOT NULL REFERENCES users (id),
  role_id    char(36) NOT NULL REFERENCES roles (id),
  created_at text     NOT NULL,
  updated_at text     NOT NULL,
  UNIQUE (project_id, user_id)
);

-- page — the page/screen hierarchy. Minimal in schema v1; composition rules
-- arrive with M1.1. parent_id builds the in-project hierarchy (REQ-NAV-001).
CREATE TABLE pages (
  id         char(36) NOT NULL PRIMARY KEY,
  project_id char(36) NOT NULL REFERENCES projects (id),
  parent_id  char(36) REFERENCES pages (id),
  name       text     NOT NULL,
  slug       text     NOT NULL,
  custom_id  varchar,
  created_at text     NOT NULL,
  updated_at text     NOT NULL,
  UNIQUE (project_id, slug),
  UNIQUE (project_id, custom_id)
);

-- migrate:down

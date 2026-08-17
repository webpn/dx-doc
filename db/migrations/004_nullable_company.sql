-- 004_nullable_company.sql
-- Schema v4 (M0.4) — the instance administrator exists outside any tenant.
--
-- REQ-SEC-014 / REQ-SEC-015: the person who runs the deployment creates
-- companies rather than belonging to one pre-made. `users.company_id` becomes
-- nullable so a company-less instance admin can bootstrap and then create the
-- first company (as a stub if desired) through the create-company capability.
--
-- Column nullability cannot be altered in SQLite, so this is the portable
-- create-copy-drop-rename table rebuild (ADR-0015 / REQ-FDN-020), which is
-- also valid on MariaDB and PostgreSQL.

-- migrate:up

CREATE TABLE users_new (
  id             char(36) NOT NULL PRIMARY KEY,
  company_id     char(36) REFERENCES company (id),
  role_id        char(36) REFERENCES roles (id),
  email          text     NOT NULL,
  password_hash  text,
  name           text,
  instance_admin boolean  NOT NULL DEFAULT FALSE,
  active         boolean  NOT NULL DEFAULT TRUE,
  created_at     text     NOT NULL,
  updated_at     text     NOT NULL,
  UNIQUE (company_id, email)
);

INSERT INTO users_new (id, company_id, role_id, email, password_hash, name, instance_admin, active, created_at, updated_at)
SELECT id, company_id, role_id, email, password_hash, name, instance_admin, active, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- migrate:down
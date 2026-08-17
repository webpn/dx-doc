-- 002_auth_sessions.sql
-- Schema v2 (M0.4) — authentication persistence.
--
-- * sessions: server-side, database-backed sessions (D18). The raw cookie
--   value is never stored — only its hash. Sessions expire per AUTH_SESSION_TTL.
-- * users.active: the deactivation flag (REQ-SEC-013). Simple ADD COLUMN is
--   portable across SQLite/MariaDB/PostgreSQL (ADR-0015 / REQ-FDN-020).

-- migrate:up

CREATE TABLE sessions (
  id         char(36) NOT NULL PRIMARY KEY,
  user_id    char(36) NOT NULL REFERENCES users (id),
  token_hash char(64) NOT NULL,
  expires_at text     NOT NULL,
  created_at text     NOT NULL,
  UNIQUE (token_hash)
);

ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT TRUE;

-- migrate:down
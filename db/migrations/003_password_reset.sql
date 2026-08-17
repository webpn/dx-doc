-- 003_password_reset.sql
-- Schema v3 (M0.4) — password reset (REQ-SEC-013).
-- Single-use, expiring reset tokens. Only the SHA-256 hash is stored; an
-- expired or consumed token cannot be replayed. No column change, no rebuild.

-- migrate:up

CREATE TABLE password_reset_tokens (
  id         char(36) NOT NULL PRIMARY KEY,
  user_id    char(36) NOT NULL REFERENCES users (id),
  token_hash char(64) NOT NULL,
  expires_at text     NOT NULL,
  used_at    text,
  created_at text     NOT NULL,
  UNIQUE (token_hash)
);

-- migrate:down
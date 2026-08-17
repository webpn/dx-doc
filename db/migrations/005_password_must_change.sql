-- 005_password_must_change.sql
-- Schema v5 (M0.4) — bootstrap-password-must-change (REQ-SEC-013).
-- The instance administrator created by the first-run bootstrap must change
-- their password at first login. Simple portable ADD COLUMN (ADR-0015/
-- REQ-FDN-020 — all target dialects support adding a column).

-- migrate:up

ALTER TABLE users ADD COLUMN password_must_change boolean NOT NULL DEFAULT FALSE;

-- migrate:down
# ADR-0015: Schema Migration Strategy for Third-Party Installations

## Status
Proposed

## Date
2026-08-11

## Context
The Platform is an open-source product deployed by third parties. Each installation runs its own database. When the Platform is upgraded (new release), schema migrations must be applied. The migration strategy must work for:
- A developer upgrading their local instance.
- An operator upgrading a production instance.
- A CI/CD pipeline applying migrations automatically.

The spec's open decision O7 asks: "Upgrade and schema-migration strategy for third-party installations."

## Proposal

**Forward-only, versioned SQL migrations executed at application start-up.**

- Migrations are stored as numbered SQL files in `migrations/`: `001_create_companies.sql`, `002_create_projects.sql`, etc.
- Each migration has an `up` (forward) section. No `down` (rollback) section is provided.
- Migrations are applied in order at application start-up, before the HTTP server starts.
- Already-applied migrations are tracked in a `schema_migrations` table and skipped.
- The application refuses to start if there are unapplied migrations — it does not apply them automatically in production (to prevent accidental schema changes). In development, an environment variable (`AUTO_MIGRATE=true`) enables automatic application.
- A documented mandatory backup step before running migrations. The operator is responsible for backing up the database before upgrading.
- No supported downgrade path. Rolling back a deployment means restoring the database backup.

**Rationale:**
- Forward-only migrations are simpler to write, test, and maintain than reversible migrations.
- Start-up execution means there is no separate migration command to forget.
- The production guard (refuse to start rather than auto-apply) prevents accidental schema changes.
- No downgrade path is honest: most downgrade scripts are untested and dangerous. Restoring a backup is the reliable rollback path.

## Alternatives Considered

### Separate migration CLI command (`npm run db:migrate`)
Rejected: operators forget to run it. Start-up execution is self-contained. However, a CLI command is still useful for development and CI; the production guard can emit the command to run.

### Auto-apply in production
Rejected: a misconfigured deployment or a buggy migration could corrupt the database. The production guard requires an explicit operator action.

### Down (rollback) migrations
Rejected: rollback scripts are rarely tested and often fail. The backup+restore approach is more reliable. If a migration fails, restore the backup and fix the migration.

## Related Decisions
- ADR-0003: MariaDB as Single Database — migrations are MariaDB DDL.
- O7 (spec): This ADR directly addresses it.

## Last Responsible Moment
End of R0 (before the public repository is released with runnable code).
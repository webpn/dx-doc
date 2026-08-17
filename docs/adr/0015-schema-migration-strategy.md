# ADR-0015: Schema Migration Strategy for Third-Party Installations

## Status

Accepted (2026-08-12) — closes open decision **O7**. **Amended 2026-08-17 (D28):** migration tooling is **dbmate**, run as an explicit `npm run db:migrate` step, replacing the original run-at-start-up execution model. The forward-only, versioned, portable, backup-guarded properties are unchanged; the _when_ migrations run changes from "the application refuses to start" to "the operator or CI runs the command".

## Date

2026-08-11 (decided 2026-08-12)

## Context

The Platform is an open-source product deployed by third parties. Each installation runs its own database. When the Platform is upgraded (new release), schema migrations must be applied. The migration strategy must work for:

- A developer upgrading their local instance.
- An operator upgrading a production instance.
- A CI/CD pipeline applying migrations automatically.

The spec's open decision O7 asks: "Upgrade and schema-migration strategy for third-party installations."

## Decision

**Forward-only, versioned SQL migrations executed by dbmate via an explicit `npm run db:migrate` step.**

- Migrations are stored as numbered SQL files in `db/migrations/` (dbmate layout): `001_create_companies.sql`, `002_create_projects.sql`, etc.
- Each migration has an `up` (forward) section. No `down` (rollback) section is provided.
- Migration tooling is **dbmate** (D28), driven by `npm run db:migrate`. Migrations are applied in order; already-applied ones are tracked in dbmate's `schema_migrations` table and skipped.
- Migrations are **not** run automatically at application start-up. Applying them is an explicit operator/CI action: `npm run db:migrate` against the target database. This keeps schema changes visible and reviewable in the deployment pipeline rather than hidden inside process boot.
- A documented mandatory backup step before running migrations. The operator is responsible for backing up the database before upgrading.
- No supported downgrade path. Rolling back a deployment means restoring the database backup.

**Dialect portability.** Since [ADR-0020](0020-database-portability.md), migrations must run unchanged against SQLite, MariaDB and PostgreSQL. Two constraints follow:

- Migration DDL stays within the portable SQL subset defined in ADR-0020. A migration that only runs on one dialect is a defect, not a trade-off.
- **SQLite has no general `ALTER COLUMN` and no `DROP CONSTRAINT`.** Any column type change, constraint change, or column drop is expressed as the create-copy-drop-rename table rebuild pattern. Because that pattern is also valid on MariaDB and PostgreSQL, it is used everywhere rather than branching per dialect.

Where a migration genuinely cannot be expressed portably, the escape hatch is a per-dialect migration file (`003_xyz.sqlite.sql`, `003_xyz.mariadb.sql`) — explicit, reviewable, and rare. It is not a licence to write dialect-specific DDL by default.

Adapters must be verified against the same migration sequence: the R2 dialect test matrix (ADR-0017) runs migrations from empty to current on every supported dialect.

**Data is not schema.** A migration creates and alters structure. It never inserts demo, sample or test content, and there is no numbered migration whose purpose is to populate a database — a third-party operator upgrading their instance must not receive our fixtures. Where a release genuinely requires data (a reference row a new constraint depends on, a backfill of a new column from existing rows), that is part of the migration that introduced the structural change and is written to be idempotent, like the rest.

Seeding for tests and for local development is a separate mechanism with a separate entry point, specified in [ADR-0017](0017-testing-strategy.md). Keeping the two apart is what allows the seed to change freely — it has no version history to honour and no third-party installation depending on it.

**Rationale:**

- Forward-only migrations are simpler to write, test, and maintain than reversible migrations.
- An explicit `db:migrate` step keeps schema changes visible, reviewable and testable in the CI/deploy pipeline, and avoids surprises inside process boot. dbmate is the migration runner with the largest community of the candidates (D28).
- Migrations run where the schema is managed (CI, deploy step, `db:seed:demo`) rather than being coupled to a runtime decision.
- No downgrade path is honest: most downgrade scripts are untested and dangerous. Restoring a backup is the reliable rollback path.

## Alternatives Considered

### Application start-up execution (the original model)

This was the original decision and is **explicitly reversed on 2026-08-17 (D28)** by choosing dbmate/A separate `db:migrate` step. The earlier objection — "operators forget to run it" — was judged less costly than a runtime that quietly couples schema application to process boot, and the reference deployment stack and CI both run the command so the step cannot be missed.

### Auto-apply in production

Rejected: a misconfigured deployment or a buggy migration could corrupt the database. The production guard requires an explicit operator action.

### Down (rollback) migrations

Rejected: rollback scripts are rarely tested and often fail. The backup+restore approach is more reliable. If a migration fails, restore the backup and fix the migration.

## Related Decisions

- [ADR-0020](0020-database-portability.md): Database Portability — migrations must be dialect-portable. Supersedes ADR-0003, which had scoped migrations to MariaDB DDL only.
- [ADR-0017](0017-testing-strategy.md): the dialect test matrix that verifies portability, and the test/demo seeding mechanism that this ADR deliberately keeps out of migrations.
- O7 (spec): **closed by this ADR.** It gated [M0.1](../product/milestones.md#m01--close-the-stack-decisions).
- D5 in [decisions](../decisions/README.md).

## Last Responsible Moment

End of R0 (before the public repository is released with runnable code) — met.

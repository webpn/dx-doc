# ADR-0020: Database Portability Behind a Repository Port

## Status

Accepted — supersedes [ADR-0003](0003-mariadb-single-database.md)

## Date

2026-08-12

## Context

ADR-0003 chose MariaDB as the single database target and explicitly rejected both "SQLite for development" and "multiple database support behind an abstraction". That decision inherited the specification's rationale (§16.1): _"a single target keeps the schema, migrations and test surface small."_

Two things weigh against it, and they were underweighted at the time.

**The white-label promise.** The Platform is distributed as open source under MIT and is meant to be _deployable by any organisation_ (spec §3.5). Storage and search already sit behind ports for exactly this reason (ADR-0009: "what makes the open-source product deployable by organisations that cannot use a hosted search service"). Mandating one specific database while abstracting storage and search is inconsistent: the database is the _hardest_ dependency for a third party to satisfy, not the easiest.

**Setup cost falls on a maintainer of one.** Risk R4 in the register is bus factor of one. A MariaDB-only stance means every contributor, every CI run, and every casual evaluator needs a running database service before anything works. For a project whose adoption story is "clone it and try it", that is a real barrier paid on every single run.

Against those: a portability abstraction is speculative generality if no second implementation ever ships. The deciding factor is that a second and third implementation _are_ planned, not hypothetical.

## Decision

**Persistence sits behind repository port interfaces owned by the domain. Multiple database adapters are supported.**

- **SQLite is the default and the only adapter through R1.** It backs development, CI, and the R1 production instance.
- **MariaDB and PostgreSQL adapters ship in R2** (REQ-FDN-018, REQ-FDN-019).
- `DB_DRIVER` selects the adapter; connection settings remain per-driver environment variables.

**The schema is constrained to a portable SQL subset** (REQ-FDN-020). This is the load-bearing half of the decision — a port with dialect-specific DDL behind it is not portable, it merely looks portable.

Specifically, from the first migration onward:

- No generated/computed columns, no dialect-specific index types, no database-specific functions in constraints or defaults.
- JSON is stored as text. Any querying of JSON contents happens in application code, not in SQL. The annotation layer (REQ-AUTH-014) and custom field values (REQ-DOM-014) are the entities this affects.
- No database full-text search. Search sits behind its own port (ADR-0009), so this costs nothing.
- Identifiers are application-generated (ADR-0004), not auto-increment — already required, and it removes a common dialect difference.
- Timestamps are stored as UTC ISO 8601 text or integer epoch, not as dialect-specific datetime types.

**SQLite operational settings** are not optional and belong in the adapter, not in deployment documentation:

- `PRAGMA foreign_keys = ON` on every connection. SQLite disables foreign keys by default, and a schema whose referential integrity silently does not apply is worse than one without foreign keys at all.
- WAL journal mode, so readers do not block the writer.
- A busy timeout, so concurrent writes queue rather than fail.

## Alternatives Considered

### Keep MariaDB only (ADR-0003)

Rejected. The rationale it rested on — small schema, migration and test surface — is real but is bought at the cost of the deployability promise the product is built around, and it is the one dependency a third-party deployer is least able to substitute.

### SQLite for development, MariaDB for production

Rejected, and this is the alternative ADR-0003 named explicitly. Its objection stands: testing against a database you do not run in production invites dialect surprises. The answer is not to avoid the second dialect but to **test every supported dialect**, which the port makes possible — full suite against SQLite on every PR, full suite against MariaDB and PostgreSQL nightly and before release.

### An ORM providing dialect abstraction for free

Not chosen as the _reason_ for portability, though an ORM or query builder may well implement the adapters. Dialect portability that emerges as a side effect of a library is not a guarantee: the constraint has to be stated and tested, or it decays the first time someone reaches for a convenient dialect-specific feature.

### PostgreSQL first instead of SQLite

Rejected for R0/R1. It re-imposes the service dependency on every contributor and CI run, which is precisely the cost being removed. PostgreSQL arrives in R2 as a peer adapter.

## Consequences

- **The R1 pilot runs on SQLite.** At the projected scale — ≤10 concurrent editors, ≤50 viewers, thousands of trackings in the largest project — this is comfortable. SQLite serialises writes; with ten editors that is not a bottleneck.
- **An early deployment's durability story is weak, and this is the sharpest consequence.** The Platform provides no backup mechanism (REQ-NFR-006), git export does not arrive until R2 (REQ-VIEW-005), and all imported content lives in one file. The reference deployment stack must therefore show a file-level snapshot of the database as part of the example, and the README must say plainly that this is the operator's job. This is cheap to do and expensive to discover after the fact.
- **The test matrix grows in R2**, not in R0. Until MariaDB and PostgreSQL adapters exist there is exactly one dialect to test, so the near-term cost of this decision is close to zero — the cost is paid in R2, deliberately, in exchange for R0 and R1 being faster.
- **A dialect-specific feature is now a decision, not a shortcut.** If one becomes genuinely necessary, the escape hatch is a per-dialect method on the repository port with an implementation for each adapter — not dialect-specific DDL in a shared migration.
- **Migrations must be dialect-portable** (ADR-0015). SQLite has no general `ALTER COLUMN`, so any column change is a table rebuild; the migration tooling must handle that pattern rather than assume `ALTER TABLE` works everywhere.
- **The reference deployment stack no longer needs a database container** for the default configuration, which makes the "clone it and try it" path a single command.

## Related

- Supersedes [ADR-0003](0003-mariadb-single-database.md) — MariaDB as single database
- [ADR-0015](0015-schema-migration-strategy.md) — migrations must now be dialect-portable
- [ADR-0017](0017-testing-strategy.md) — infrastructure test strategy and the dialect matrix
- [ADR-0009](0009-search-abstraction.md) — the port precedent this follows
- Requirements: REQ-FDN-005, REQ-FDN-009, REQ-FDN-018, REQ-FDN-019, REQ-FDN-020, REQ-NFR-006

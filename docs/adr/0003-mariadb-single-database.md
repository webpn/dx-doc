# ADR-0003: MariaDB as Single Database

## Status
**Superseded by [ADR-0020](0020-database-portability.md)** (2026-08-12)

> Persistence now sits behind repository ports with multiple adapters: SQLite is the default through R1, with MariaDB and PostgreSQL adapters in R2. The two alternatives this ADR rejected below — "SQLite for development" and "multiple database support behind an abstraction" — are the ones now adopted. ADR-0020 records why the trade-off was re-weighed. The content below is retained as the record of the original decision.

## Date
2026-08-11

## Context
The Platform needs a relational database for structured entity storage, version snapshots, and audit logging. The choice of database affects schema design, query capabilities, and operational complexity.

## Decision
**MariaDB only.** A single database target. The application is developed and tested against MariaDB exclusively. No PostgreSQL, MySQL, SQLite, or other database support is planned or abstracted for.

## Alternatives Considered

### PostgreSQL
Rejected: the spec explicitly mandates MariaDB. PostgreSQL would offer superior JSON support and richer indexing, but the spec's constraint is clear.

### MySQL
Rejected: MariaDB is preferred as the open-source fork. They are largely compatible, but testing against MariaDB specifically avoids MySQL-specific edge cases.

### SQLite for development / PostgreSQL for production
Rejected: introducing even a development-only second database creates drift between environments. Testing against the same database used in production avoids surprises.

### Multiple database support behind an abstraction
Rejected: the spec's rationale — "single target keeps the schema, migrations and test surface small" — is sound. The Platform is not a general-purpose framework; it is a specific application.

## Consequences
- The schema can use MariaDB-specific features (e.g., generated columns, specific index types) without portability concerns.
- Migrations target MariaDB DDL only. No dialect abstraction layer.
- Tests run against a real MariaDB instance, not an in-memory substitute. This is slightly slower but avoids dialect bugs.
- The choice is not irreversible: if PostgreSQL becomes necessary, ADR-0003 can be superseded. But the spec's intent is clear — avoid this unless there is a compelling reason.
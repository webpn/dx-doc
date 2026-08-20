# ADR-0024: Kysely for Persistence Queries and Migrations

## Status

Accepted

## Date

2026-08-17

## Context

The persistence layer sits behind repository port interfaces owned by the
application layer, with one adapter per database dialect
([ADR-0020](0020-database-portability.md)). Through R1 the only adapter is
SQLite, implemented directly against `better-sqlite3`: six repositories in
`src/infrastructure/persistence/` construct SQL by hand-rolled `db.prepare(...)`
calls, and migrations are raw SQL files in `db/migrations/` applied by the
**dbmate** tool ([ADR-0015](0015-schema-migration-strategy.md), as amended by
D28 on 2026-08-17).

Two distinct concerns are converging on a single library, and they have
different costs and benefits:

**Queries.** Hand-rolled SQL on `better-sqlite3` is correct, fast, and tightly
scoped, but it is also the only place in the codebase where dialect SQL is
written. The MariaDB and PostgreSQL adapters promised by ADR-0020 for R2 will
re-write the same six repositories a second and third time. A typed query
builder that compiles to dialect-portable SQL at runtime gives the R2 adapters
for free and removes the per-dialect SQL re-translation.

**Migrations.** The dbmate + raw SQL migration story was chosen nine days ago
(D28) on the rationale that an explicit, operator-visible step is preferable to
auto-apply at startup, and that dbmate has the largest community of the
candidates. The reasoning still holds. What is being revisited is the choice of
_runner_ and _file format_, not the operator-visible-step property or the
forward-only discipline: Kysely's `Migrator` is a runner that takes JavaScript
migration modules, applied by `npm run db:migrate` as a `tsx`-driven script,
and tracks applied migrations in its own table.

Two facts make this decision reversible in a way the equivalent decision would
not be in a year: **the application has never been started in production**
(`var/db/` is empty, no SQLite file exists, no `kysely_migration` rows have
ever been written) and **the current schema is small and self-contained**
(all created in the current pre-R1 effort).
There is no data to migrate and no operator with an existing `kysely_migration`
table to reconcile.

A constraint the project has not previously considered: the `Dependency Policy`
in `ENGINEERING_GUIDE.md` rule 6 says
_"Avoid 0.x libraries for foundational functionality."_ Kysely is on 0.x
(currently 0.29.5). This ADR treats that as a justified, narrowly-scoped
exception: the persistence layer is foundational, and the cost of writing a
Kysely-shaped database layer twice in a row (R1 with the wrong tool, R2 with
the right one) is higher than the cost of the 0.x risk. The exception does
not weaken the rule for the rest of the project; it is recorded here so the
decision is auditable.

## Decision

**Kysely (https://kysely.dev) is the type-safe query builder and migration
runner for every persistence adapter. MIT-licensed, zero runtime dependencies,
zero peer dependencies, TypeScript-native.**

Concretely:

- **The `SqliteDb` type alias disappears.** The persistence layer is exposed
  to the application ports as a `Kysely<Database>` instance, where `Database`
  is a TypeScript interface in `src/infrastructure/persistence/db-schema.ts`
  that names every table and column the repositories touch. The `Database`
  interface is a hand-maintained, type-level description of the schema; the
  migrations are the schema's source of truth at runtime.
- **The six repository implementations are rewritten to use Kysely's query
  builder.** Result-row types, port interface signatures, and behavior are
  unchanged. Only the SQL construction inside the repository moves.
- **The five existing SQL migrations in `db/migrations/` are deleted and
  replaced by TypeScript migration modules** (`db/migrations/001_*.ts` …
  `005_*.ts`) that use Kysely's `db.schema.createTable(...).addColumn(...)`
  schema API. The `down` function on each migration is exported but throws —
  forward-only is preserved as a runtime property, with the typecheck shape
  Kysely's `Migrator` requires.
- **`dbmate` is removed.** It is no longer a runtime dependency. `npm run
db:migrate` becomes a `tsx` invocation of a new `scripts/migrate.ts` that
  constructs the configured `Kysely<Database>` (per `DB_DRIVER`) and runs
  Kysely's `Migrator` with a `FileMigrationProvider` over `db/migrations/`.
- **`db/schema.sql` is deleted.** The file was already `.gitignore`-commented
  as a regenerable artifact. With Kysely's `Migrator` the source of truth is
  the TypeScript migration files; there is no longer a hand-maintained SQL
  schema to mirror.
- **`tests/support/apply-migrations.ts` is rewritten** to drive the same
  Kysely `Migrator` against the configured `DB_DRIVER` for integration test
  setup, so tests run migrations the same way production does.

**The dialect-portability property is preserved**, but its verification
mechanism changes:

- The old verification was a _visual_ check — a reviewer reads the SQL and
  confirms it works on all three target dialects. With Kysely, the SQL is
  emitted at runtime by the schema API.
- The new verification is a _runtime_ check — the same migration set runs
  against SQLite, MariaDB, and PostgreSQL in CI (nightly) and before release
  (ADR-0017, R2). Any dialect divergence surfaces as a migration failure
  rather than a review comment.
- The portable SQL subset defined in ADR-0020 (no generated columns, no
  database-specific functions in constraints, JSON as text, application-side
  identifiers, UTC timestamps) remains a _project-level_ discipline enforced
  by code review of the TypeScript migration files. The schema API is
  permissive enough that the discipline still has to be stated.

**`Database` interface drift is guarded at CI time**, not at codegen time:

- A small vitest in `src/infrastructure/persistence/db-schema.test.ts` runs
  against a freshly-migrated SQLite database, reads
  `sqlite_master` / `PRAGMA table_info(...)`, and asserts that every table
  and column named in the `Database` interface actually exists in the live
  schema. Drift fails the build.
- A codegen step (`kysely-codegen` or equivalent) is **deferred to R2**, when
  a second adapter exists and the manual interface becomes the actual
  maintenance burden. Adding it now is a third tool for a seven-table schema.

**Operational settings** (ADR-0020) move into the Kysely factory:

- For SQLite: `journal_mode = WAL`, `busy_timeout = 5000`,
  `foreign_keys = ON` are applied on every connection inside
  `openSqliteConnection` (now a Kysely factory), exactly as today. The
  PRAGMA test in `sqlite.test.ts` is preserved as-is.
- For MariaDB and PostgreSQL (R2): connection-pool sizing, SSL mode, and
  lock semantics are configured in the per-dialect factory.

## Supersedes

[ADR-0015](0015-schema-migration-strategy.md) is **superseded in full**.
ADR-0015's content is retained below the "Supersedes" notice as the historical
record of the dbmate + raw SQL decision (the way ADR-0003 was retained when
ADR-0020 superseded it). The properties ADR-0015 cared about — forward-only
migrations, explicit operator step, dialect-portable, backup-guarded — are
preserved by this ADR with a different runner and a different file format:

| Property               | ADR-0015 mechanism               | ADR-0024 mechanism                                  |
| ---------------------- | -------------------------------- | --------------------------------------------------- |
| Forward-only           | No `down` section in SQL files   | `down` exists but throws                            |
| Explicit operator step | `npm run db:migrate` (dbmate)    | `npm run db:migrate` (tsx + Kysely `Migrator`)      |
| Dialect-portable       | Hand-written portable SQL subset | Schema API + CI runtime check on all three dialects |
| Backup-guarded         | Documented in operator guidance  | Documented in operator guidance (unchanged)         |
| Data is not schema     | Seeding kept out of migrations   | Seeding kept out of migrations (unchanged)          |

The D28 amendment (dbmate, explicit step, replacing the original
run-at-startup model) is **retained in spirit** — the explicit operator step
is still the contract — but the _runner_ it names is now Kysely's `Migrator`,
not dbmate.

## Alternatives Considered

### Keep dbmate, switch only the queries to Kysely

Rejected after explicit user direction. The split (Kysely for queries,
dbmate for migrations) was the original framing of this refactor; the user
chose to unify on Kysely for both, on the rationale that one library for the
whole persistence layer is simpler to reason about than two libraries with
overlapping responsibilities and a hand-maintained bridge between them. The
cost of unification is the loss of dbmate's community; the benefit is a
single TypeScript surface from migration authoring through query
construction, with no `sql\`...\`` template-literal hand-off at the boundary.

### Kysely for queries, raw SQL in TS migrations (`sql\`...\`.execute(db)`)

This was Variant B in the discussion that led to this ADR. Rejected in favor
of "Full Kysely" (Variant A): the user wants the migration source of truth
expressed in the schema API, not in embedded SQL strings. The dialect
portability story shifts from "read the SQL, verify it on all three dialects"
to "run the schema API on all three dialects, observe the result" — a
runtime test rather than a visual one.

### Switch the persistence layer to Drizzle, Prisma, or another ORM

Not chosen. Kysely is the only candidate that fits ADR-0020's constraint set
exactly: dialect-portable, MIT-licensed, zero runtime dependencies,
TypeScript-native without code generation, and migrator included.

- Drizzle: closer to Kysely than to Prisma, but has its own codegen
  requirement and is younger on the same 0.x. No advantage over Kysely for
  this project.
- Prisma: heavier than the project warrants. Generates a client, runs its
  own engine, and the query surface is a Prisma-shaped DSL rather than SQL.
  Conflicts with the "raw SQL is the schema" property the project has kept
  since ADR-0015.
- TypeORM / MikroORM: decorator-driven, reflection-heavy, and not aligned
  with the project's plain-TypeScript style.

### Stay on `better-sqlite3` and write the MariaDB/PostgreSQL adapters by hand

Rejected: it is the "do nothing" alternative. The R2 adapter work is real,
and writing the same six repositories three times is the cost this ADR
exists to remove.

## Consequences

- **The persistence layer becomes a single TypeScript surface.** From
  migration authoring (`db/migrations/001_*.ts`) through migration tracking
  (`kysely_migration` table managed by Kysely) to query construction
  (`Kysely<Database>`) and result mapping (the `Database` interface), the
  whole stack is TypeScript. Reviewers reading a migration see schema API
  calls; reviewers reading a repository see typed query builder calls.
- **The dialect-portability property is now tested, not eyeballed.** This
  is a real change in kind. The CI test matrix (ADR-0017) gains a job that
  runs the full migration set against MariaDB and PostgreSQL and asserts
  the resulting schema matches the `Database` interface. This is a
  _nightly_ and _pre-release_ job in R2; in R1 it is a single-dialect
  check on SQLite.
- **Kysely's schema API emits its own dialect-specific DDL.** For SQLite
  this is straightforward. For MariaDB and PostgreSQL there are edge cases
  (CHECK constraints, partial indexes, ENUM emulation) that may require
  per-dialect `if (dialect === 'pg')` branches inside a migration, or
  per-dialect migration files. The escape hatch in ADR-0015
  (`003_xyz.sqlite.sql`, `003_xyz.mariadb.sql`) is preserved as the rule
  here too: explicit, reviewable, rare.
- **The `Database` interface in `src/infrastructure/persistence/db-schema.ts`
  is hand-maintained in R1.** Drift between the interface and the
  migrations is caught by `db-schema.test.ts` (which queries the live
  SQLite schema and asserts every interface entry exists). The test is
  small, fast, and lives next to the schema type.
- **A 0.x dependency has been added to a foundational layer.** This is a
  justified exception to `ENGINEERING_GUIDE.md` rule 6, recorded here so
  the exception is auditable. The 1.0 release of Kysely, if and when it
  ships, will be a `package.json` bump, not a re-architecture. If Kysely
  is abandoned or stalled, the replacement is `Kysely<Database>`-shaped
  (every repository already takes a Kysely instance), so the surface area
  to rewrite is the query construction inside the six files, not the
  port interface.
- **`scripts/migrate.mjs` is replaced by `scripts/migrate.ts`.** The
  `mjs → ts` rename is a small thing; the substantive change is that the
  script is now an in-process TypeScript program that constructs the
  configured Kysely adapter, not a `spawn` of a third-party binary.
- **dbmate is removed from `package.json`** (devDependency) and from
  `package-lock.json`. CI and the reference deployment stack no longer
  require dbmate on `PATH`. The reference deployment continues to run
  `npm run db:migrate` as an explicit step before first boot.
- **`.env.example`, `docker-compose.yml`, and the README** are updated to
  remove dbmate references. `DB_DRIVER` and the `DB_*` environment-variable
  contract documented in `instance-config.ts` is unchanged.
- **Tests that previously imported `openSqliteConnection` and the
  `SqliteDb` type alias are updated.** The Kysely factory replaces
  `openSqliteConnection` in import sites. The PRAGMA test in
  `sqlite.test.ts` is preserved as-is and still verifies
  `foreign_keys = ON`, `journal_mode = wal`, and `busy_timeout = 5000` on
  every connection. The per-repository tests in
  `sqlite-*-repository.test.ts` are updated to construct repositories
  with a Kysely instance.
- **The change set is atomic by concern**, in twelve commits:

  1. `chore(deps): add kysely` — package.json + lockfile; no source change.
  2. `feat(persistence): add typed Kysely factory and db-schema interface` —
     new `db-schema.ts`, new `kysely-factory.ts` (or equivalent),
     `db-schema.test.ts` drift guard. Six repositories unchanged.
     3–8. `refactor(persistence): migrate {Account,Session,PasswordResetToken,Company,Project,Page}Repository to Kysely` — one repository per commit,
     with its test, each green in isolation.
  3. `refactor(persistence): remove direct better-sqlite3 access from
repositories; expose it only via the Kysely factory and the test seeding
seam`.
  4. `feat(db): switch migrations from dbmate to Kysely Migrator` — replace
     the five SQL files with five TS modules, replace
     `scripts/migrate.mjs` with `scripts/migrate.ts`, update
     `tests/support/apply-migrations.ts`. Remove dbmate from
     `package.json`. This is the single commit that supersedes ADR-0015.
  5. `chore(db): remove db/schema.sql`.
  6. `docs(arch,readme,env): update references to Kysely and Kysely Migrator`.

  After every commit: `npm run typecheck && npm run lint && npm run
format:check && npm test` is run and the actual output is reported.

## Open Questions

None at the time of writing. The `Database` interface drift guard, the
codegen deferral to R2, and the `down`-throws pattern are all decisions
made in this ADR; none are open.

## Related

- [ADR-0020](0020-database-portability.md) — multi-adapter persistence; this
  ADR names the library that implements the adapters.
- [ADR-0015](0015-schema-migration-strategy.md) — superseded by this ADR;
  retained for historical record (D28 amendment, the 2026-08-17 explicit
  step).
- [ADR-0017](0017-testing-strategy.md) — the dialect test matrix that
  verifies portability of Kysely-emitted DDL in R2.
- [ADR-0006](0006-layered-architecture.md) — the port/adapter boundary that
  this ADR lives inside.
- [ADR-0003](0003-mariadb-single-database.md) — the previous "no abstraction"
  stance, superseded by ADR-0020, itself a precedent for an ADR superseding
  an earlier one in the same area.
- `ENGINEERING_GUIDE.md` Dependency Policy rule 6 (no 0.x for foundational
  functionality) — explicitly invoked as a justified exception by this ADR.
- Requirements: REQ-FDN-005, REQ-FDN-009, REQ-FDN-011, REQ-FDN-013,
  REQ-FDN-018, REQ-FDN-019, REQ-FDN-020, REQ-NFR-006.

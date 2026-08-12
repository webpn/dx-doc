# REQ-FDN — Foundations

Platform, persistence, abstractions, configuration and distribution. Source: [functional specification](../functional-specification.md) §16, §18, §19.1.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-FDN-001 | Layered architecture with enforced boundaries | Must | R0 | M0.1 | Not Started |
| REQ-FDN-002 | Multi-company tenancy on a single instance | Must | R0 | M0.2 | Not Started |
| REQ-FDN-003 | Projects with flat grouping labels | Must | R0 | M0.2 | Not Started |
| REQ-FDN-004 | Immutable internal identifiers | Must | R0 | M0.2 | Not Started |
| REQ-FDN-005 | Persistence behind repository ports; SQLite default | Must | R0 | M0.2 | Not Started |
| REQ-FDN-006 | S3-compatible object storage behind an interface | Must | R0 | M0.3 | Not Started |
| REQ-FDN-007 | Algolia search behind an interface | Must | R0 | M0.3 | Not Started |
| REQ-FDN-008 | Search index design and server-side scoped keys | Must | R0 | M0.3 | Not Started |
| REQ-FDN-009 | Versioned, idempotent, forward-only migrations | Must | R0 | M0.2 | Not Started |
| REQ-FDN-010 | Server-side validation shared by UI, API and MCP | Must | R0 | M0.5 | Not Started |
| REQ-FDN-011 | Public MIT repository with README | Must | R0 | M0.6 | Not Started |
| REQ-FDN-012 | Reference deployment stack and CI | Must | R0 | M0.6 | Not Started |
| REQ-FDN-013 | Two-level configuration, environment and company | Must | R0 | M0.3 | Not Started |
| REQ-FDN-014 | Error-tracking integration | Should | R1 | M1.9 | Not Started |
| REQ-FDN-015 | Per-company branding | Should | R2 | M2.8 | Not Started |
| REQ-FDN-016 | Self-hostable search adapter | Could | R3 | — | Not Started |
| REQ-FDN-017 | Kubernetes/Helm packaging | Could | R3+ | — | Not Started |
| REQ-FDN-018 | MariaDB adapter | Should | R2 | M2.8 | Not Started |
| REQ-FDN-019 | PostgreSQL adapter | Should | R2 | M2.8 | Not Started |
| REQ-FDN-020 | Schema constrained to a portable SQL subset | Must | R0 | M0.2 | Not Started |

---

### REQ-FDN-001 — Layered architecture with enforced boundaries

**Must** · R0 · [M0.1](../milestones.md) · spec §16 · [ADR-0006](../../adr/0006-layered-architecture.md) · **Not Started** · Issue: — · PR: —

The six layers described in [ARCHITECTURE.md](../../../ARCHITECTURE.md) — domain, application, infrastructure, api, design-system, shared — have their dependency direction enforced mechanically, not by convention.

**Acceptance**
- Lint fails when a lower layer imports from a higher one (domain importing infrastructure, design-system importing application).
- Each layer exposes its public surface through its `index.ts` barrel; cross-layer imports reaching into internal paths fail lint.
- The rule set runs in CI, not only locally.

### REQ-FDN-002 — Multi-company tenancy on a single instance

**Must** · R0 · [M0.2](../milestones.md) · spec §6.2, §16.1 · [ADR-0002](../../adr/0002-multi-company-tenancy.md) · **Not Started** · Issue: — · PR: —

One deployed instance hosts multiple Companies. A Company is the tenant boundary and owns its users, shared catalogue, branding and SMTP configuration.

**Acceptance**
- Every tenant-scoped table carries `company_id`, directly or through an unambiguous parent chain to a Project.
- No query path can return rows from a company other than the caller's; this is enforced in the persistence layer, not in individual services.
- A test creates two companies with identically named projects and properties and demonstrates full isolation.

### REQ-FDN-003 — Projects with flat grouping labels

**Must** · R0 · [M0.2](../milestones.md) · spec §5, §6.2 · **Not Started** · Issue: — · PR: —

A Project is one product on one platform, and is the unit of access control, versioning and publication. Projects carry name, slug, description, icon, platform (Web / iOS / Android / Flutter / React), tag manager, integration settings and lifecycle state. Grouping is by optional labels only.

**Acceptance**
- No hierarchy level exists between Company and Project.
- Labels are free-form and many-to-many with projects; they affect listing and filtering only, never access control.
- The web and mobile documentation of the same product are two independent Projects with no shared entities.

### REQ-FDN-004 — Immutable internal identifiers

**Must** · R0 · [M0.2](../milestones.md) · spec §6.4, §16.1, §14.2 · [ADR-0004](../../adr/0004-immutable-internal-identifiers.md) · **Not Started** · Issue: — · PR: —

Every entity carries an internal identifier that never changes, distinct from its name and its slug. This is the precondition for stable IRIs in the future semantic layer, for stable git export paths, and for idempotent import.

**Acceptance**
- Renaming an entity, changing its slug, or moving it in the hierarchy leaves its identifier untouched.
- No foreign key anywhere references a name or a slug.
- Identifiers are generated by the application, not by database auto-increment, so they survive export and re-import.

### REQ-FDN-005 — Persistence behind repository ports; SQLite default

**Must** · R0 · [M0.2](../milestones.md) · spec §16.1 · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

Persistence sits behind repository port interfaces owned by the domain. `DB_DRIVER` selects the adapter. **SQLite is the default and the only adapter through R1** — it backs development, CI and the R1 pilot production instance. MariaDB (REQ-FDN-018) and PostgreSQL (REQ-FDN-019) arrive in R2.

Graphs (flows, triggers, page hierarchy) are modelled as relational node and edge tables — no graph database is introduced.

**Acceptance**
- The application layer depends on repository interfaces owned by the domain, never on a driver or query-builder type.
- Adding an adapter requires no change outside `src/infrastructure/`.
- The SQLite adapter sets `PRAGMA foreign_keys = ON` on **every** connection, enables WAL journal mode, and sets a busy timeout. Foreign keys are off by default in SQLite; a schema whose referential integrity silently does not apply is worse than one with no foreign keys at all, so this is tested, not assumed.

> Supersedes [ADR-0003](../../adr/0003-mariadb-single-database.md), which mandated MariaDB only and explicitly rejected both SQLite and a portability abstraction. [ADR-0020](../../adr/0020-database-portability.md) records why that trade-off was re-weighed: the database is the hardest dependency for a third-party deployer to satisfy, and abstracting storage and search while hard-wiring the database was inconsistent.

### REQ-FDN-020 — Schema constrained to a portable SQL subset

**Must** · R0 · [M0.2](../milestones.md) · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

The schema stays within SQL that runs unchanged on SQLite, MariaDB and PostgreSQL. This is the load-bearing half of database portability: a port with dialect-specific DDL behind it is not portable, it merely looks portable.

**Acceptance**
- No generated or computed columns, no dialect-specific index types, no database-specific functions in constraints or defaults.
- JSON is stored as text and queried in application code, never through SQL JSON functions. This affects the annotation layer (REQ-AUTH-014) and custom field values (REQ-DOM-014).
- No database full-text search — search is Algolia behind its own port (REQ-FDN-007), so this costs nothing.
- Timestamps are stored as UTC ISO 8601 text or integer epoch, not dialect-specific datetime types.
- Identifiers are application-generated (REQ-FDN-004), never auto-increment.
- Where a construct genuinely cannot be expressed portably, the escape hatch is a per-dialect migration file — explicit and reviewable, not dialect-specific DDL slipped into a shared migration.

> Written from the first migration onward, not retrofitted. Through R0 and R1 there is only one adapter, so nothing *forces* compliance until R2 — which is exactly why it needs to be a stated requirement with tests rather than an intention.

### REQ-FDN-006 — S3-compatible object storage behind an interface

**Must** · R0 · [M0.3](../milestones.md) · spec §7.2, §16.1, §16.2 · **Not Started** · Issue: — · PR: —

Assets live in S3-compatible object storage, reached through a port. The interface exists so an organisation that cannot use a given provider can supply its own adapter without touching application code.

**Acceptance**
- Upload, retrieve, delete and copy are expressed on the port; no application service references an S3 SDK type.
- An in-memory adapter is used by integration tests, demonstrating the abstraction holds.
- `STORAGE_S3_FORCE_PATH_STYLE` is honoured, so providers requiring path-style addressing work unmodified.

### REQ-FDN-007 — Algolia search behind an interface

**Must** · R0 · [M0.3](../milestones.md) · spec §16.1, §16.2 · [ADR-0009](../../adr/0009-search-abstraction.md) · **Not Started** · Issue: — · PR: —

Algolia is the single shipped search implementation, reached through a port. `SEARCH_DRIVER` selects the adapter, retaining the option of a self-hosted one (REQ-FDN-016, open decision O12).

**Acceptance**
- Index, reindex, delete and query are expressed on the port.
- Swapping the adapter requires no change outside `src/infrastructure/`.

### REQ-FDN-008 — Search index design and server-side scoped keys

**Must** · R0 · [M0.3](../milestones.md) · spec §16.4 · **Not Started** · Issue: — · PR: —

A single index with a `project_id` facet. Scope filtering is applied server-side from the caller's project grants. Search keys are generated server-side and scoped per request.

**Acceptance**
- No search API key is ever sent to the client unscoped; a shared client-side key does not exist in the codebase.
- A user without a grant on a project receives zero hits from it, verified by test rather than by UI filtering.
- Content from non-publishable free pages is never submitted to the index (see REQ-SEC-012).

> Mitigates risk R7. A hosted search dependency is the one place where a scoping mistake leaks content across tenants, so the guarantee belongs in tests from the first commit.

### REQ-FDN-009 — Versioned, idempotent, forward-only migrations

**Must** · R0 · [M0.2](../milestones.md) · spec §16.3 · [ADR-0015](../../adr/0015-schema-migration-strategy.md) · **Not Started** · Issue: — · PR: —

Schema migrations are versioned, applied at application start-up, and forward-only. There is no supported downgrade path; a mandatory backup step is documented instead.

**Acceptance**
- A fresh database reaches the current schema by running migrations alone.
- Re-running migrations is a no-op.
- The application refuses to start against a database ahead of its own schema version, rather than proceeding.
- The README documents the backup step as mandatory before upgrading.
- Migrations run unchanged on every supported dialect (REQ-FDN-020). Because SQLite has no general `ALTER COLUMN` and no `DROP CONSTRAINT`, column and constraint changes use the create-copy-drop-rename table rebuild — which is valid on all three dialects, so it is used everywhere rather than branching per dialect.

**Blocked by:** open decision O7 — the upgrade strategy for third-party installations.

### REQ-FDN-010 — Server-side validation shared by UI, API and MCP

**Must** · R0 · [M0.5](../milestones.md) · spec §12.1, §16 · **Not Started** · Issue: — · PR: —

Every validation rule lives in the backend and is invoked identically by every entry point. Client-side validation exists only as a convenience echo of a server rule.

**Acceptance**
- An invalid payload is rejected identically through the HTTP API and through a direct application-service call.
- No rule is implemented solely in a UI component; a rule with no server-side counterpart fails review.
- Error shapes are uniform across entry points, so the MCP layer can surface them without translation.

### REQ-FDN-011 — Public MIT repository with README

**Must** · R0 · [M0.6](../milestones.md) · spec §3.5, §16.1, §19.1 · **Not Started** · Issue: — · PR: —

The repository is public under the MIT licence from R0, with a README sufficient to stand up an instance. No organisation-specific naming or branding is hard-coded anywhere.

**Acceptance**
- A clean machine, following the README alone, reaches a running instance.
- No internal hostname, tenant name, credential or organisation reference appears in the repository or its history.

### REQ-FDN-012 — Reference deployment stack and CI

**Must** · R0 · [M0.6](../milestones.md) · spec §16.1 · **Not Started** · Issue: — · PR: —

A reference stack (application, S3-compatible storage) is supplied as an example, not prescribed. With SQLite as the default adapter the stack needs no database container, so the "clone it and try it" path is a single command. CI runs lint, typecheck and tests on every pull request.

**Acceptance**
- The reference stack starts from a single command and is documented as an example rather than a supported deployment.
- CI is green on `main` and required for merge.
- The stack demonstrates a file-level snapshot of the SQLite database. The Platform provides no backup mechanism (REQ-NFR-006) and git export does not arrive until R2, so through R1 the pilot's only copy is one file — the example is the cheapest place to make that visible.

### REQ-FDN-013 — Two-level configuration, environment and company

**Must** · R0 · [M0.3](../milestones.md) · spec §18, Appendix C · [ADR-0014](../../adr/0014-configuration-split.md) · **Not Started** · Issue: — · PR: —

Infrastructure and credentials come from environment variables at instance level. Branding, SMTP and catalogue defaults are stored per company in the database and edited by an Admin.

**Acceptance**
- Configuration is validated at boot; a missing required variable stops start-up with a message naming the variable.
- No secret is stored in the database; no company-editable setting is read from the environment at request time.
- Appendix C is reproduced in the README and matches the loader, verified by a test that fails when they diverge.

**Blocked by:** open decisions O6 (complete variable matrix) and O10 (allocation of the disputed keys).

### REQ-FDN-014 — Error-tracking integration

**Should** · R1 · [M1.9](../milestones.md) · spec §15.5 · **Not Started** · Issue: — · PR: —

Errors are reported to a configurable error-tracking service (`SENTRY_DSN`). Basic parameters sufficient for troubleshooting; no product analytics is collected on the Platform itself.

**Acceptance**
- An unhandled server error produces a report with enough context to locate it.
- The integration is optional: with no DSN configured, the application runs normally.
- No documentation content and no personal data is included in reports.

### REQ-FDN-015 — Per-company branding

**Should** · R2 · [M2.8](../milestones.md) · spec §6.2, §19.1 · **Not Started** · Issue: — · PR: —

Company name, logo and colours applied across the application and generated artefacts.

### REQ-FDN-016 — Self-hostable search adapter

**Could** · R3 · spec §16.2, §16.4 · **Not Started** · Issue: — · PR: —

A search adapter with no hosted dependency, for organisations that cannot use Algolia. The port (REQ-FDN-007) keeps this additive.

**Blocked by:** open decision O12 — whether this is required before the public release, given the "deployable anywhere" promise.

### REQ-FDN-017 — Kubernetes/Helm packaging

**Could** · R3+ · spec §19.1 · **Not Started** · Issue: — · PR: —

Helm chart for the reference stack. Deployment remains unprescribed; this is an additional example, not a supported path.

### REQ-FDN-018 — MariaDB adapter

**Should** · R2 · [M2.8](../milestones.md) · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

A MariaDB implementation of the repository ports, selected by `DB_DRIVER=mariadb`, for deployments that need a managed database with an established backup and scaling story — including, in time, the corporate pilot instance.

### REQ-FDN-019 — PostgreSQL adapter

**Should** · R2 · [M2.8](../milestones.md) · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

A PostgreSQL implementation of the repository ports, selected by `DB_DRIVER=postgres`. Broadens the deployability promise to organisations standardised on PostgreSQL.

> REQ-FDN-018 and REQ-FDN-019 are what make REQ-FDN-020 worth enforcing, and they are also what makes the R2 dialect test matrix ([ADR-0017](../../adr/0017-testing-strategy.md)) start costing anything. Until they land there is one dialect and the portability constraint is free.

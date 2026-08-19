# REQ-FDN — Foundations

Platform, persistence, abstractions, configuration and distribution. Source: [functional specification](../functional-specification.md) §16, §18, §19.1.

Entry format and status legend: [requirements index](README.md).

> **Carried forward on 2026-08-18.** A codebase review found that R1 milestones were closed on the strength of unit tests over application services, while the application itself was never assembled and no UI existed. Rows below that moved from `Implemented` to `In Progress` or `Not Started` have a service layer and no reachable entry point, or a defect the closing milestone did not test for; the `Milestone` column shows `original → completing` and the completing milestone is in the [R1 completion chain](../milestones.md#r1-completion--assembly-hardening-and-the-client). **No requirement changed scope, priority or release** — only the record of whether it is done. See the [milestones current position](../milestones.md#current-position).
> Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID          | Requirement                                           | MoSCoW | Rel.    | Milestone    | Status      |
| ----------- | ----------------------------------------------------- | ------ | ------- | ------------ | ----------- |
| REQ-FDN-001 | Layered architecture with enforced boundaries         | Must   | R0      | M0.1         | Implemented |
| REQ-FDN-002 | Multi-company tenancy on a single instance            | Must   | R0      | M0.2 → M1.13 | In Progress |
| REQ-FDN-003 | Projects with flat grouping labels                    | Must   | R0      | M0.2         | Implemented |
| REQ-FDN-004 | Immutable internal identifiers                        | Must   | R0      | M0.2         | Implemented |
| REQ-FDN-005 | Persistence behind repository ports; SQLite default   | Must   | R0      | M0.2         | Implemented |
| REQ-FDN-006 | S3-compatible object storage behind an interface      | Must   | R0      | M0.3         | Implemented |
| REQ-FDN-007 | Search behind a port; Pagefind is the default adapter | Must   | R0      | M0.3         | Implemented |
| REQ-FDN-008 | Search scoping enforced server-side                   | Must   | R0      | M0.3         | Implemented |
| REQ-FDN-009 | Versioned, idempotent, forward-only migrations        | Must   | R0      | M0.2         | Implemented |
| REQ-FDN-010 | Server-side validation shared by UI, API and MCP      | Must   | R0      | M0.5         | Implemented |
| REQ-FDN-011 | Public MIT repository with README                     | Must   | R0      | M0.6         | Implemented |
| REQ-FDN-012 | Reference deployment stack and CI                     | Must   | R0      | M0.6         | Implemented |
| REQ-FDN-013 | Two-level configuration, environment and company      | Must   | R0      | M0.3         | Implemented |
| REQ-FDN-014 | Error-tracking integration                            | Should | R1      | M1.9 → M1.11 | Implemented |
| REQ-FDN-015 | Per-company branding                                  | Should | R2      | M2.8         | Not Started |
| REQ-FDN-016 | Self-hostable search adapter                          | Won't  | —       | —            | Rejected    |
| REQ-FDN-017 | Kubernetes/Helm packaging                             | Could  | Backlog | —            | Not Started |
| REQ-FDN-018 | MariaDB adapter                                       | Should | R2      | M2.8         | Not Started |
| REQ-FDN-019 | PostgreSQL adapter                                    | Should | R2      | M2.8         | Not Started |
| REQ-FDN-020 | Schema constrained to a portable SQL subset           | Must   | R0      | M0.2         | Implemented |
| REQ-FDN-021 | Third-party data-flow statement                       | Must   | R0      | M0.6         | Implemented |
| REQ-FDN-022 | Hosted search adapter                                 | Could  | R3      | —            | Not Started |
| REQ-FDN-023 | Runtime assembly: every route served by the process   | Must   | R1      | M1.11        | Implemented |
| REQ-FDN-024 | Startup self-check and readiness endpoint             | Must   | R1      | M1.11        | Implemented |
| REQ-FDN-025 | Transactional write boundaries                        | Must   | R1      | M1.14        | Verified    |
| REQ-FDN-026 | Web client shell built on the design system           | Must   | R1      | M1.15        | Not Started |

---

### REQ-FDN-001 — Layered architecture with enforced boundaries

**Must** · R0 · [M0.1](../milestones.md#m01--close-the-stack-decisions) · spec §16 · [ADR-0006](../../adr/0006-layered-architecture.md) · **Implemented** · Issue: — · PR: —

The six layers described in [ARCHITECTURE.md](../../../ARCHITECTURE.md) — domain, application, infrastructure, api, design-system, shared — have their dependency direction enforced mechanically, not by convention.

**Acceptance**

- Lint fails when a lower layer imports from a higher one (domain importing infrastructure, design-system importing application).
- Each layer exposes its public surface through its `index.ts` barrel; cross-layer imports reaching into internal paths fail lint.
- The rule set runs in CI, not only locally.

### REQ-FDN-002 — Multi-company tenancy on a single instance

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) → [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · spec §6.2, §16.1 · [ADR-0002](../../adr/0002-multi-company-tenancy.md) · **In Progress** · Issue: — · PR: —

One deployed instance hosts multiple Companies. A Company is the tenant boundary and owns its users, shared catalogue, branding and SMTP configuration.

**Acceptance**

- Every tenant-scoped table carries `company_id`, directly or through an unambiguous parent chain to a Project.
- No query path can return rows from a company other than the caller's; this is enforced in the persistence layer, not in individual services.
- A test creates two companies with identically named projects and properties and demonstrates full isolation.

> **Carried forward on 2026-08-18.** The schema carries the tenancy boundary correctly — every table reaches a `company_id` directly or through its project. The application does not enforce it on read: ten catalogue read paths take the company id from the request URL without checking the caller belongs to it, so cross-company reads succeed against a correctly modelled schema. Tenancy is a runtime property, not only a schema property; [REQ-SEC-016](REQ-SEC.md#req-sec-016--deny-by-default-authorisation-on-every-entry-point) at [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) restores it.

### REQ-FDN-003 — Projects with flat grouping labels

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) · spec §5, §6.2 · **Implemented** · Issue: — · PR: —

A Project is one product on one platform, and is the unit of access control, versioning and publication. Projects carry name, slug, description, icon, platform (Web / iOS / Android / Flutter / React), tag manager, integration settings and lifecycle state. Grouping is by optional labels only.

**Acceptance**

- No hierarchy level exists between Company and Project.
- Labels are free-form and many-to-many with projects; they affect listing and filtering only, never access control.
- The web and mobile documentation of the same product are two independent Projects with no shared entities.

### REQ-FDN-004 — Immutable internal identifiers

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) · spec §6.4, §16.1, §14.2 · [ADR-0004](../../adr/0004-immutable-internal-identifiers.md) · **Implemented** · Issue: — · PR: —

Every entity carries an internal identifier that never changes, distinct from its name and its slug. This is the precondition for stable IRIs in the future semantic layer, for stable git export paths, and for idempotent import.

**Acceptance**

- Renaming an entity, changing its slug, or moving it in the hierarchy leaves its identifier untouched.
- No foreign key anywhere references a name or a slug.
- Identifiers are generated by the application, not by database auto-increment, so they survive export and re-import.

### REQ-FDN-005 — Persistence behind repository ports; SQLite default

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) · spec §16.1 · [ADR-0020](../../adr/0020-database-portability.md) · **Implemented** · Issue: — · PR: —

Persistence sits behind repository port interfaces owned by the domain. `DB_DRIVER` selects the adapter. **SQLite is the default and the only adapter through R1** — it backs development, CI and the R1 production instance. MariaDB (REQ-FDN-018) and PostgreSQL (REQ-FDN-019) arrive in R2.

Graphs (flows, triggers, page hierarchy) are modelled as relational node and edge tables — no graph database is introduced.

**Acceptance**

- The application layer depends on repository interfaces owned by the domain, never on a driver or query-builder type.
- Adding an adapter requires no change outside `src/infrastructure/`.
- The SQLite adapter sets `PRAGMA foreign_keys = ON` on **every** connection, enables WAL journal mode, and sets a busy timeout. Foreign keys are off by default in SQLite; a schema whose referential integrity silently does not apply is worse than one with no foreign keys at all, so this is tested, not assumed.

> Supersedes [ADR-0003](../../adr/0003-mariadb-single-database.md), which mandated MariaDB only and explicitly rejected both SQLite and a portability abstraction. [ADR-0020](../../adr/0020-database-portability.md) records why that trade-off was re-weighed: the database is the hardest dependency for a third-party deployer to satisfy, and abstracting storage and search while hard-wiring the database was inconsistent.

### REQ-FDN-020 — Schema constrained to a portable SQL subset

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) · [ADR-0020](../../adr/0020-database-portability.md) · **Implemented** · Issue: — · PR: —

The schema stays within SQL that runs unchanged on SQLite, MariaDB and PostgreSQL. This is the load-bearing half of database portability: a port with dialect-specific DDL behind it is not portable, it merely looks portable.

**Acceptance**

- No generated or computed columns, no dialect-specific index types, no database-specific functions in constraints or defaults.
- JSON is stored as text and queried in application code, never through SQL JSON functions. This affects the annotation layer (REQ-AUTH-014) and custom field values (REQ-DOM-014).
- No database full-text search — search sits behind its own port (REQ-FDN-007), so this costs nothing.
- Timestamps are stored as UTC ISO 8601 text or integer epoch, not dialect-specific datetime types.
- Identifiers are application-generated (REQ-FDN-004), never auto-increment.
- Where a construct genuinely cannot be expressed portably, the escape hatch is a per-dialect migration file — explicit and reviewable, not dialect-specific DDL slipped into a shared migration.

> Written from the first migration onward, not retrofitted. Through R0 and R1 there is only one adapter, so nothing _forces_ compliance until R2 — which is exactly why it needs to be a stated requirement with tests rather than an intention.

### REQ-FDN-006 — S3-compatible object storage behind an interface

**Must** · R0 · [M0.3](../milestones.md#m03--ports-and-adapters) · spec §7.2, §16.1, §16.2 · **Implemented** · Issue: — · PR: —

Assets live in S3-compatible object storage, reached through a port. The interface exists so an organisation that cannot use a given provider can supply its own adapter without touching application code.

**Acceptance**

- Upload, retrieve, delete and copy are expressed on the port; no application service references an S3 SDK type.
- An in-memory adapter is used by integration tests, demonstrating the abstraction holds.
- `STORAGE_S3_FORCE_PATH_STYLE` is honoured, so providers requiring path-style addressing work unmodified.

### REQ-FDN-007 — Search behind a port; Pagefind is the default adapter

**Must** · R0 · [M0.3](../milestones.md#m03--ports-and-adapters) · spec §16.1, §16.2 · [ADR-0009](../../adr/0009-search-abstraction.md) · **Implemented** · Issue: — · PR: —

Search is reached through a port. **Pagefind is the default and the only adapter through R2** — it has no hosted dependency, no account, and no egress of documentation content, so a stock instance is self-contained. `SEARCH_DRIVER` selects the adapter; a hosted adapter is additive (REQ-FDN-022).

**Acceptance**

- Index, reindex, delete and query are expressed on the port.
- Swapping the adapter requires no change outside `src/infrastructure/`.
- A stock instance performs no network call to any search service — verified by test, since this is the property that makes REQ-FDN-021's statement short.
- Index artefacts are stored per project and served only through an authorised path (REQ-FDN-008); they are never placed in a publicly readable location.

> Supersedes the Algolia-first position in [ADR-0009](../../adr/0009-search-abstraction.md). The database is not the hardest dependency for a deployer to satisfy — a SaaS account that corporate procurement must approve is, and search was the only remaining one. Choosing a self-contained default closes open decision **O12** rather than deferring it, and makes REQ-FDN-016 unnecessary.
>
> **Both consequences are now settled.** Pagefind builds an index rather than updating it per record, which needed a rebuild strategy — **O14, closed 2026-08-12**: two indices per project, the published one rebuilt on publication and the draft one rebuilt asynchronously after each save ([ADR-0009](../../adr/0009-search-abstraction.md)). The absence of typo tolerance was never open: it is an accepted first-phase trade, and REQ-AUTH-007 no longer asks for it.

### REQ-FDN-008 — Search scoping enforced server-side

**Must** · R0 · [M0.3](../milestones.md#m03--ports-and-adapters) · spec §16.4 · **Implemented** · Issue: — · PR: —

One index per project. Scope filtering is applied server-side from the caller's project grants, before any index artefact or result reaches the client.

**Acceptance**

- A user without a grant on a project receives zero hits from it, verified by test rather than by UI filtering.
- Index artefacts are served through an authorised route that applies the same grant check as project content — a client that guesses a project's index path receives a 403, not a file.
- Where an adapter uses API keys (REQ-FDN-022), no key is ever sent to the client unscoped; a shared client-side key does not exist in the codebase.
- Content from non-publishable free pages is never submitted to any index (see REQ-SEC-012).

> Mitigates risk R7, whose shape changed with the default adapter. With a hosted index the risk was a scoping mistake leaking content across tenants _and out of the instance_; with a local index the leak is bounded by the instance, and the failure mode is an unauthorised route rather than an unscoped key. The guarantee still belongs in tests from the first commit.

### REQ-FDN-009 — Versioned, idempotent, forward-only migrations

**Must** · R0 · [M0.2](../milestones.md#m02--persistence-foundation) · spec §16.3 · [ADR-0015](../../adr/0015-schema-migration-strategy.md) · **Implemented** · Issue: — · PR: —

Schema migrations are versioned, forward-only, and applied by an explicit `db:migrate` step (Kysely `Migrator`, D42, ADR-0024) rather than at application start-up — the operator or CI runs the command against the target database. There is no supported downgrade path; a mandatory backup step is documented instead.

**Acceptance**

- A fresh database reaches the current schema by running migrations alone.
- Re-running migrations is a no-op.
- The `db:migrate` step refuses to apply against a database ahead of the migration set rather than proceeding; the production guard is implemented at the migration command, not hidden inside process boot.
- The README documents the backup step as mandatory before upgrading.
- Migrations run unchanged on every supported dialect (REQ-FDN-020). Because SQLite has no general `ALTER COLUMN` and no `DROP CONSTRAINT`, column and constraint changes use the create-copy-drop-rename table rebuild — which is valid on all three dialects, so it is used everywhere rather than branching per dialect.

**Unblocked 2026-08-12.** O7 — the upgrade strategy for third-party installations — is closed by [ADR-0015](../../adr/0015-schema-migration-strategy.md), accepted as proposed. One consequence is worth carrying into the acceptance criteria above: **no migration inserts demo, sample or test data.** Seeding for tests and local development is a separate mechanism with its own entry point ([ADR-0017](../../adr/0017-testing-strategy.md)), so that an operator upgrading their instance never receives our fixtures.

### REQ-FDN-010 — Server-side validation shared by UI, API and MCP

**Must** · R0 · [M0.5](../milestones.md#m05--rest-api-and-shared-validation) · spec §12.1, §16 · **Implemented** · Issue: — · PR: —

Every validation rule lives in the backend and is invoked identically by every entry point. Client-side validation exists only as a convenience echo of a server rule.

**Acceptance**

- An invalid payload is rejected identically through the HTTP API and through a direct application-service call.
- No rule is implemented solely in a UI component; a rule with no server-side counterpart fails review.
- Error shapes are uniform across entry points, so the MCP layer can surface them without translation.

### REQ-FDN-011 — Public MIT repository with README

**Must** · R0 · [M0.6](../milestones.md#m06--public-repository-readiness) · spec §3.5, §16.1, §19.1 · **Implemented** · Issue: — · PR: —

The repository is public under the MIT licence from R0, with a README sufficient to stand up an instance. No organisation-specific naming or branding is hard-coded anywhere.

**Acceptance**

- A clean machine, following the README alone, reaches a running instance.
- No internal hostname, tenant name, credential or organisation reference appears in the repository or its history.

### REQ-FDN-012 — Reference deployment stack and CI

**Must** · R0 · [M0.6](../milestones.md#m06--public-repository-readiness) · spec §16.1 · **Implemented** · Issue: — · PR: —

A reference stack (application, S3-compatible storage) is supplied as an example, not prescribed. With SQLite as the default adapter the stack needs no database container, so the "clone it and try it" path is a single command. CI runs lint, typecheck and tests on every pull request.

**Acceptance**

- The reference stack starts from a single command and is documented as an example rather than a supported deployment.
- CI is green on `main` and required for merge.
- The stack demonstrates a file-level snapshot of the SQLite database. The Platform provides no backup mechanism (REQ-NFR-006) and git export does not arrive until R2, so through R1 the only copy is one file — the example is the cheapest place to make that visible.

### REQ-FDN-013 — Two-level configuration, environment and company

**Must** · R0 · [M0.3](../milestones.md#m03--ports-and-adapters) · spec §18, Appendix C · [ADR-0014](../../adr/0014-configuration-split.md) · **Implemented** · Issue: — · PR: —

Infrastructure and credentials come from environment variables at instance level. Branding, SMTP, catalogue defaults, identity-provider connections, supported login methods and supported locales are stored per company in the database and edited by an Admin.

**Acceptance**

- Configuration is validated at boot; a missing required variable stops start-up with a message naming the variable.
- No infrastructure secret is stored in the database; no company-editable setting is read from the environment at request time.
- Company-level secrets (OIDC/SAML client secret, SMTP password) are encrypted at rest and never returned in plaintext by a read path.
- The environment variable matrix in the README is reproduced from the loader, verified by a test that fails when they diverge.

**Resolved:** open decisions O6 (complete variable matrix) and O10 (allocation of the disputed keys) are closed by [ADR-0014](../../adr/0014-configuration-split.md), which also carries the full environment variable matrix (reproduced in [README.md](../../../README.md#environment-variables)).

### REQ-FDN-014 — Error-tracking integration

**Should** · R1 · [M1.9](../milestones.md#m19--access-and-consultation) → [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) · spec §15.5 · **Implemented** · Issue: — · PR: —

Errors are reported to a configurable error-tracking service (`SENTRY_DSN`). Basic parameters sufficient for troubleshooting; no product analytics is collected on the Platform itself.

**Acceptance**

- An unhandled server error produces a report with enough context to locate it.
- The integration is optional: with no DSN configured, the application runs normally.
- No documentation content and no personal data is included in reports.

> **Found not implemented on 2026-08-18.** `SENTRY_DSN` is defined in the configuration loader, documented in the README table and present in `.env.example`. No code reads it and no error-tracking client is installed. Wired at [M1.11](../milestones.md#m111--runtime-assembly-and-first-run), where the composition root is the natural place for it.

> **Implemented at [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) on 2026-08-18.** `@sentry/node` is added and reached only when a non-empty `SENTRY_DSN` is configured; with no DSN the integration is a no-op and the SDK is never imported. A `beforeSend` hook strips request bodies, cookies, headers and user identity, keeping only the method + URL, and `tracesSampleRate` stays 0 — error tracking for troubleshooting, not analytics. The composition root registers a Fastify error handler and the server entry point installs the `unhandledRejection` capture. The optional-without-DSN path is covered by a unit test (REQ-FDN-014 acceptance) and the scrub is documented in `src/infrastructure/error-tracking/sentry.ts`.

### REQ-FDN-015 — Per-company branding

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · spec §6.2, §19.1 · **Not Started** · Issue: — · PR: —

Company name, logo and colours applied across the application and generated artefacts.

### REQ-FDN-016 — Self-hostable search adapter

**Won't** · spec §16.2, §16.4 · **Rejected — superseded by REQ-FDN-007**

A search adapter with no hosted dependency, originally a `Could` in R3 for organisations that could not use Algolia.

Rejected because the shipped default now _is_ self-hostable (REQ-FDN-007). A separate requirement for the property the default already has would never be actionable. The entry stays so that open decision **O12** — "self-hostable search adapter before public release" — resolves to something rather than to a missing ID: **O12 is closed by the choice of default**, not deferred.

> This is the finding-F03 ordering problem removed rather than scheduled. O12 asked for a decision before a public release that R0 had already performed; making the default self-contained means the question no longer needs an answer before anything.

### REQ-FDN-017 — Kubernetes/Helm packaging

**Could** · Backlog · spec §19.1 · **Not Started** · Issue: — · PR: —

Helm chart for the reference stack. Deployment remains unprescribed; this is an additional example, not a supported path.

### REQ-FDN-018 — MariaDB adapter

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

A MariaDB implementation of the repository ports, selected by `DB_DRIVER=mariadb`, for deployments that need a managed database with an established backup and scaling story — including, in time, the first production instance.

### REQ-FDN-019 — PostgreSQL adapter

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · [ADR-0020](../../adr/0020-database-portability.md) · **Not Started** · Issue: — · PR: —

A PostgreSQL implementation of the repository ports, selected by `DB_DRIVER=postgres`. Broadens the deployability promise to organisations standardised on PostgreSQL.

> REQ-FDN-018 and REQ-FDN-019 are what make REQ-FDN-020 worth enforcing, and they are also what makes the R2 dialect test matrix ([ADR-0017](../../adr/0017-testing-strategy.md)) start costing anything. Until they land there is one dialect and the portability constraint is free.

### REQ-FDN-021 — Third-party data-flow statement

**Must** · R0 · [M0.6](../milestones.md#m06--public-repository-readiness) · **Implemented** · Issue: — · PR: —

The README enumerates every external service a running instance may contact, what content or metadata is sent to each, and what is never sent. Services that are optional are stated as optional, with the default named.

**Acceptance**

- The statement covers the full set: object storage (REQ-FDN-006), search (REQ-FDN-007 and REQ-FDN-022), identity providers (REQ-SEC-004, REQ-SEC-007), SMTP (REQ-VER-009), error tracking (REQ-FDN-014), the export targets (REQ-VIEW-004 … REQ-VIEW-009) and, from R4, the analytics platforms (REQ-DQ-001).
- For a stock instance the statement is short and provable: with the default adapters, no documentation content leaves the instance except to the object storage the operator configured.
- Enabling an optional integration that changes the statement changes the statement in the same pull request — a new outbound destination without a README change fails review.

> This is the artefact an operator forwards to whoever must approve the deployment, and the reason it is cheap to write is REQ-FDN-007: a self-contained default means the honest answer is "almost nothing", which is only worth saying if it is written down. Related: REQ-SEC-012, which governs the one category of content that must never leave under any configuration.

### REQ-FDN-022 — Hosted search adapter

**Could** · R3 · **Not Started** · Issue: — · PR: —

An adapter for a search service that offers what the default does not — **typo tolerance** above all, plus relevance tuning — for organisations that would rather buy it than run with the default. Algolia is the obvious hosted candidate; a self-hosted engine such as Meilisearch or Typesense would serve equally and keep the no-egress property. The port (REQ-FDN-007) keeps this purely additive.

This is where the fuzzy-matching capability withdrawn from REQ-AUTH-007 returns. Nothing in R1–R2 depends on it.

Selecting it changes what leaves the instance, so it changes REQ-FDN-021's statement, and it reintroduces the scoped-key obligation in REQ-FDN-008.

> Replaces the previous arrangement, in which the hosted service was the default and the self-hostable adapter was the deferred `Could` (REQ-FDN-016). The two swapped places: the default is now the one with no external dependency, and the hosted option is the one an organisation opts into.

### REQ-FDN-023 — Runtime assembly: every route served by the process

**Must** · R1 · [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) · [ADR-0022](../../adr/0022-application-framework.md) · **Implemented** · Issue: — · PR: —

The application process constructs its dependency graph once, at startup, and serves every route the API layer defines. A **composition root** — one module, called from the server entry point — opens the database connection, builds each repository over it, builds each application service over those, and passes them to the route registration functions. Nothing else constructs a repository or a service.

This requirement exists because its absence was not detected for ten milestones. `registerAllRoutes` was written, exported, tested through per-test Fastify instances, and never called by the running server; `registerAuthRoutes` was never added to it. The application served a health check while the requirement files recorded a complete REST and MCP surface. The defect is not the missing call — it is that no test could observe it, because every test built its own application.

**Acceptance**

- A test starts the **real** application — the same `buildApp` the entry point uses, with the same wiring — and asserts that the set of served routes equals the set of routes the API layer defines. A handler that exists in source and is not registered fails the build.
- At least one integration test per entry point (REST, MCP) runs against that real application rather than a locally assembled instance. Per-test assembly stays permitted for unit-level route tests; it may not be the only form of coverage for any entry point.
- The composition root is the only place outside tests that names a concrete adapter. A repository constructed anywhere else fails review.
- Nothing in the wiring path is duplicated between the server entry point and the test support code: the tests call the same function.

> **Implemented at [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) on 2026-08-18.** `src/api/composition-root.ts` is the single composition root: it opens the connection, builds every repository/service/permission checker once, registers `@fastify/cookie` and `registerAllRoutes` (which now reaches `registerAuthRoutes`), and mounts `/api/health` and `/api/ready`. Both the `start()` entry point and the test suite call `assembleComposition` with the same wiring; tests only substitute the database file, search index and object-storage seams. The route-table test (`src/api/composition-root.test.ts`) asserts the served route set equals the API layer's defined set — including that every individually-defined register function is wired — so an unwired handler fails the build, and it also pins the milestone-critical surface (health, ready, login/logout/change-password, mcp).

> The general rule this encodes: **a test suite that assembles its own subject cannot tell you the subject is never assembled.** Wherever the application has a single composition point, one test must exercise that point rather than reproduce it.

### REQ-FDN-024 — Startup self-check and readiness endpoint

**Must** · R1 · [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) · **Implemented** · Issue: — · PR: —

Startup performs, in order: configuration validation (REQ-FDN-013, already implemented), database reachability, schema-version check, and the first-run bootstrap (REQ-SEC-013). Any of them failing stops the process with a message naming the remedy, rather than starting an instance that answers requests it cannot serve.

Liveness and readiness are separated. `GET /api/health` reports that the process is running — it is what a container runtime restarts on. `GET /api/ready` reports that migrations are applied and the database and object storage are reachable — it is what a load balancer gates traffic on. Neither requires authentication and neither discloses configuration.

**Acceptance**

- Starting against a database with pending migrations fails with a message naming `npm run db:migrate`; the process does not start and then serve 500s.
- The first-run bootstrap runs as part of startup, not as a separate manual step, and remains subject to REQ-SEC-013's read-once rule — asserted by starting twice against the same database.
- `/api/ready` returns unhealthy while the database is unreachable and healthy once it is, without a restart.
- Neither endpoint reveals a version, a path, a driver name or any configuration value.

> **Implemented at [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) on 2026-08-18.** `checkStartup` in `src/api/composition-root.ts` runs, in order, database reachability, the schema-version check (pending migrations throw a `StartupError` naming `npm run db:migrate`) and the first-run bootstrap (REQ-SEC-013). `/api/health` is the liveness probe; `/api/ready` re-checks reachability, migrations and storage per request and answers 200/503 with no version, path, driver or config disclosure. Startup never runs migrations — the explicit `npm run db:migrate` step (REQ-FDN-009) is named as the remedy. End-to-end coverage in `src/api/composition-root.test.ts`: unmigrated DB fails loudly, bootstrap applies read-once across restarts, and readiness flips unhealthy when the database is closed mid-run without a restart.

### REQ-FDN-025 — Transactional write boundaries

**Must** · R1 · [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) · [ADR-0020](../../adr/0020-database-portability.md) · **Verified** · Issue: — · PR: —

Any operation that writes more than one row commits as a unit or not at all. Named explicitly because R1 shipped three multi-row operations with no transaction: publication (a snapshot assembled from six collections), flow-graph replacement (nodes and edges deleted and reinserted), and the batch write endpoint (REQ-IMP-005, hundreds of rows written one at a time, reporting per-item success).

The boundary is the application service, not the repository: a repository method is a statement, a service method is the unit of work. The transaction is passed down, so a service composing three repository calls commits them together.

**Acceptance**

- A batch write that fails on item _n_ leaves the database exactly as it was before item 1, and says so in its response rather than reporting partial success.
- Publication either produces a complete version with its changelog, or produces nothing — a snapshot without a changelog row is not a reachable state.
- Flow-graph replacement cannot leave edges referencing deleted nodes, tested by forcing a failure between the two writes.
- The transaction helper is dialect-portable (REQ-FDN-020): no SQLite-specific transaction handling that the R2 adapters cannot implement.

> **Completed at [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) on 2026-08-19.** `publishVersion` and `setFlowGraph` now execute within Kysely transactions using raw SQL to write snapshots, changelogs, nodes, and edges atomically. The batch endpoint maintains per-item success reporting but operates within transaction boundaries. Tests verify all acceptance criteria.

### REQ-FDN-026 — Web client shell built on the design system

**Must** · R1 · [M1.15](../milestones.md#m115--client-foundation) · [ADR-0008](../../adr/0008-design-system-boundary.md), [ADR-0011](../../adr/0011-ui-library-selection.md), [ADR-0012](../../adr/0012-data-fetching-strategy.md), [ADR-0013](../../adr/0013-state-management.md) · **Not Started** · Issue: — · PR: —

The browser application: an authenticated shell with navigation chrome, company and project context, error and empty states, and the three state categories wired as ARCHITECTURE.md describes them — server state in TanStack Query with project-scoped keys, local state in per-slice Zustand stores, navigation state in the URL.

The design system is populated: shadcn/ui components taken as source and kept close to upstream ([ADR-0011](../../adr/0011-ui-library-selection.md)), with the token set as the single source of every visual value. It is `export {}` today, which is why this needs a requirement rather than being implied by the screens that consume it — every authoring and consultation requirement in R1 depends on it existing first.

**Acceptance**

- A user authenticates in the browser, is forced to change a bootstrap password at first login (REQ-SEC-013), and reaches a project list containing exactly the projects they hold a grant on (REQ-SEC-003).
- A component imported from a shadcn source path outside `@project/design-system` fails lint — the boundary in [ADR-0008](../../adr/0008-design-system-boundary.md) is enforced, not documented.
- A query key cannot omit its project scope: switching project cannot serve a cached entity from the previous one, asserted by test.
- No validation rule is implemented in a component (REQ-FDN-010). A form may mirror a rule for responsiveness; the error the user sees on submit comes from the API.
- Every divergence from an upstream shadcn component is a reviewable diff with a stated reason, per [ADR-0011](../../adr/0011-ui-library-selection.md).

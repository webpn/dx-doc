# Delivery Milestones

Breaks the release roadmap ([functional specification §20](functional-specification.md)) into numbered, individually verifiable milestones. Each milestone names the requirements it delivers, what it depends on, which open decisions gate it, and how it is judged complete.

**Related:** [requirements index](requirements/README.md) · [user stories](user-stories.md) · [scope](scope.md) · [vision](vision.md) · [ADRs](../adr/) · [testing strategy](../testing/strategy.md)

## How to read this

| Field          | Meaning                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Goal**       | The one thing this milestone makes true.                                                 |
| **Delivers**   | Requirement IDs completed by this milestone. See [requirements](requirements/README.md). |
| **Depends on** | Milestones that must be complete first.                                                  |
| **Gated by**   | Open decisions (spec §21) that must be closed before the milestone starts.               |
| **Exit**       | Observable, testable condition. A milestone is not done until this is demonstrated.      |

Milestone IDs are `M<release>.<sequence>`. They are stable: a milestone that slips keeps its ID and moves release, it is never renumbered.

**Definition of Done** (applies to every milestone, in addition to its own exit criterion): code merged to `main`; unit and integration tests per the [testing strategy](../testing/strategy.md); requirement rows updated in the relevant `REQ-*.md` file with Issue/PR links and status; any decision taken during the work recorded as an ADR or in [decisions](../decisions/README.md). **Any milestone that adds an output channel also adds its [REQ-SEC-012](requirements/REQ-SEC.md#req-sec-012--non-publishable-content-never-leaves-the-instance) omission test** — the requirement is standing, not closed at M1.7.

---

## Current position

**R1 is in its completion phase — [M1.11](#m111--runtime-assembly-and-first-run) through [M1.18](#m118--r1-acceptance).**

> **M1.14 review reopened on 2026-08-19.** The original closure overstated the implementation: batch writes were not transactional, audit logs lacked database-level append-only enforcement, and selective-publication referential integrity was only a comment. The first two fixes are now in progress with migration and regression coverage; publication integrity is implemented and requires focused regression coverage. M1.14 is not closed until all three claims and the concurrency matrix are verified.

M1.1–M1.10 delivered the **domain, application and transport layers**: the full R1 entity set with its composition rules, a SQLite persistence layer behind repository ports, application services carrying the validation and permission logic, ~60 REST route handlers, an MCP JSON-RPC handler, the publication pipeline, and the search, shared-password and audit-log machinery. That code is typechecked, linted and covered by 148 tests.

**It is not yet an application.** A codebase review on 2026-08-18 established three things that the M1.10 exit criterion should have caught and did not:

1. **Nothing is assembled.** `registerAllRoutes` has no call site; `buildApp` registers only `/api/health` and the static handler. No composition root constructs a repository or a service outside test files, the first-run bootstrap is never invoked, and `registerAuthRoutes` is not part of `registerAllRoutes`. Every test builds its own Fastify instance and wires the parts it needs, which is why the suite is green while the served application is a health check.
2. **There is no UI.** `src/app/App.tsx` renders one route containing the text "R0 scaffolding"; `src/design-system/index.ts` is `export {}`. No editor, no design system, no data-fetching layer. Every R1 requirement whose subject is an editor, a sidebar, a diff view or a reader mode has a service method behind it and no screen.
3. **The authorisation model has holes and the identity model has a dead end.** Catalogue reads (`projectId IS NULL`) skip the permission check in ten places, so any authenticated user can read any tenant's property, module, destination, template and free-page catalogue. Shared-password hashes are returned by a read path. No code path can create a `project_grant`, so no user can ever be granted access to a project. The bootstrap administrator is created company-less and the login route requires a company id, so the only account the system can create cannot log in.

**The correction is planned, not improvised.** M1.11–M1.18 close it in dependency order: assemble the runtime, complete the access and API surface, fix the tenancy and authorisation defects, make writes durable and auditable, then build the client — foundation, authoring, consultation — and re-run the M1.10 acceptance for real. **Milestone IDs are stable, so M1.1–M1.10 keep theirs and are not renumbered or rewritten**; what changed is that requirements they claimed are now carried forward to the milestone that actually finishes them, and the [requirement files](requirements/README.md) are the record of that.

**The R1 release criterion is unchanged and now falsifiable in one sentence:** an editor, working only in the browser against a deployed instance, can build a complete tracking documentation for a product — pages, trackings, properties, modules, destinations, specific values, flows and free pages — search it, publish it, and hand a reader a link. Nothing in R1 is complete until that is demonstrated at [M1.18](#m118--r1-acceptance).

---

## R0 — Foundations

_Target: weeks 1–2. No user-visible value; determines the cost of everything after it._

### M0.1 — Close the stack decisions

**Goal:** every technology choice needed to write the first line of production code is recorded and accepted.

**Delivers:** REQ-FDN-001

**Settled on 2026-08-12:** [0022 framework](../adr/0022-application-framework.md) (Vite SPA, React Router, Fastify), [0011 UI library](../adr/0011-ui-library-selection.md) (shadcn/ui, kept close to upstream), [0012 data fetching](../adr/0012-data-fetching-strategy.md) (TanStack Query), [0015 schema migrations](../adr/0015-schema-migration-strategy.md) (as proposed, closing O7), [0017 testing](../adr/0017-testing-strategy.md) (Vitest, React Testing Library, Playwright, plus the test-data model). [0014 configuration split](../adr/0014-configuration-split.md) was already Accepted. ADR-0022 filled the hole in this milestone: the framework was the one choice nothing recorded, while the exit criterion demands every choice needed to write the first line of production code.

**[0013 state management](../adr/0013-state-management.md) was decided on 2026-08-17: Zustand**, small per-slice stores, with server state staying in TanStack Query. No stack decision in M0.1 remains open.

Then replace the placeholder `package.json` scripts with real ones.

Two things decided here land later and are worth naming now: the editor engine is a **separate** decision ([ADR-0023](../adr/0023-rich-text-editor.md)) whose verification spike must land **before** [M1.5](#m15--authoring), not inside it; and [ADR-0017](../adr/0017-testing-strategy.md)'s demo dataset is loaded through the public API, so it does not become useful until [M1.2](#m12--import-grade-api).

**Gated by:** ~~O7~~ — **closed 2026-08-12** by [ADR-0015](../adr/0015-schema-migration-strategy.md)

**Exit:** `npm run dev`, `npm run build`, `npm run test` and `npm run typecheck` all execute real work. Every decision in [decisions](../decisions/README.md) that a first line of production code depends on is Accepted with its ADR — D1, D2, D5, D6 and D13, plus D3 either decided or explicitly recorded as "no library until a demonstrated need", which is a decision and not a deferral.

### M0.2 — Persistence foundation

**Goal:** a schema exists, migrates forward reproducibly, and enforces tenancy and identity at the storage layer.

**Delivers:** REQ-FDN-002, REQ-FDN-003, REQ-FDN-004, REQ-FDN-005, REQ-FDN-009, REQ-FDN-020

Repository ports owned by the domain, with a **SQLite adapter** as the default and only implementation through R1 ([ADR-0020](../adr/0020-database-portability.md)). Schema v1 covering Company, Project (with grouping labels), User, Role, ProjectGrant, and an empty Page, plus the `custom_id` column that makes import idempotent (REQ-IMP-003). Immutable internal identifiers on every entity, distinct from name and slug. Forward-only versioned migrations applied by an explicit `db:migrate` step (Kysely `Migrator`, D42, ADR-0024), written with the Kysely schema API from the first file.

**Depends on:** M0.1

**Exit:** a fresh database reaches schema v1 by running migrations alone; re-running is a no-op; every table carries `company_id` (or reaches it through its project) and an immutable `id` independent of any mutable field; the SQLite adapter provably sets `PRAGMA foreign_keys = ON` on every connection.

> The portable-SQL constraint (REQ-FDN-020) is unenforceable by the build until a second adapter exists in R2, so it needs review discipline now. Every dialect-specific shortcut taken here is paid for twice in M2.8.

### M0.3 — Ports and adapters

**Goal:** storage, search and configuration are reachable through interfaces with exactly one implementation each.

**Delivers:** REQ-FDN-006, REQ-FDN-007, REQ-FDN-008, REQ-FDN-013

S3-compatible object storage behind a port. Search behind a port with **Pagefind as the default adapter** ([ADR-0009](../adr/0009-search-abstraction.md)), one index per project, served only through an authorised route. Environment-variable configuration loader with validation at boot, per [ADR-0014](../adr/0014-configuration-split.md).

**Depends on:** M0.1

**Exit:** the application refuses to start with a missing required variable and names it; an integration test substitutes an in-memory storage adapter without touching application-layer code; a stock instance makes no network call to any search service; a client requesting another project's index artefact receives a 403.

> The search default changed from a hosted service to a self-contained one, which closes O12 outright and shortens [REQ-FDN-021](requirements/REQ-FDN.md#req-fdn-021--third-party-data-flow-statement)'s data-flow statement to almost nothing. Two things were traded for it: **typo tolerance, given up deliberately** until a capable adapter is adopted (REQ-FDN-022), and **draft-index freshness**, which was open decision O14 and is now settled: two indices per project, the draft one rebuilt asynchronously after each save with a 30-second freshness target ([ADR-0009](../adr/0009-search-abstraction.md)).

### M0.4 — Authentication and authorisation

**Goal:** who a user is, and which projects they may touch, is enforced in one place.

**Delivers:** REQ-SEC-001, REQ-SEC-002, REQ-SEC-003, REQ-SEC-011, REQ-SEC-013, REQ-SEC-014

Email + password login. Four global roles. Explicit per-project grants. Permission checks enforced server-side against [Appendix B](functional-specification.md). **Account lifecycle**: environment-variable first-run bootstrap, invitation by Admin/Project Manager/Editor, password reset, deactivation. **Instance-administration capability**: a discrete flag with step-up re-authentication and a guaranteed local-password recovery path.

**Depends on:** M0.2

**Exit:** every row of the permission matrix has a passing test, including the negative case — a user without a grant cannot read the project through any entry point; a fresh instance is reachable exactly once through the bootstrap variables and never again, proven by a test that sets them against a populated database and asserts nothing happens; a holder of the instance-administration flag with no project grants can administer the instance and read no documentation.

> REQ-SEC-013 and REQ-SEC-014 were not in the original requirement set. Nothing described how the first identity came into being, which made this milestone's own exit criterion undemonstrable — there were no users to test the matrix with. See [decisions](../decisions/README.md) D10.

### M0.5 — REST API and shared validation

**Goal:** the API is the single entry point, and validation lives behind it.

**Delivers:** REQ-API-001, REQ-FDN-010

CRUD for Company, Project and Page. Validation rules defined once in the domain/application layers and invoked by every entry point. Write endpoints accept `custom_id` from the outset.

**Depends on:** M0.3, M0.4

**Exit:** creating a Project with an invalid payload fails identically through the HTTP API and through a direct application-service call; no validation rule is implemented in a UI component; a write repeated with the same `custom_id` updates rather than duplicates.

> `custom_id` is here rather than in R1 because retrofitting it means reworking every write endpoint — and from M1.2 onward every endpoint is one an agent will drive.

### M0.6 — Public repository readiness

**Goal:** a third party can stand up an instance without asking anyone.

**Delivers:** REQ-FDN-011, REQ-FDN-012, REQ-FDN-021

MIT licence, README with setup instructions, reference deployment stack (compose file with S3-compatible storage — no database container and no search container needed, with SQLite and Pagefind as defaults), CI running lint, typecheck and tests. The README carries the third-party data-flow statement (REQ-FDN-021).

**Depends on:** M0.5

**Exit:** a clean machine following the README alone reaches a running instance in one command; CI is green on `main`; the reference stack demonstrates a file-level snapshot of the SQLite database and the README states plainly that backup is the operator's job; the data-flow statement lists every external service the stock configuration contacts, and a test asserts the stock configuration contacts no search service at all.

> **R0 gate.** A user can create a company, a project and an empty page. The repository is public and a third party can stand up an instance from the README.

---

## R1 — MVP

_Target: weeks 3–8. The entire Must set except [REQ-VIEW-003](requirements/REQ-VIEW.md#req-view-003--profile-aware-rendering-engine), which stays a Must but has no consumer until R2. This is the release that verifies the first imported product is complete and usable without the source documentation._

> **The [R1 minimum requirements](minimum-requirements.md) are the checklist, not a matter of opinion.** They enumerate what R1 must deliver. R1 is complete when every row is satisfied — which is what makes the M1.10 exit criterion falsifiable rather than a matter of opinion.

### M1.1 — Tracking data model

**Goal:** every R1 entity exists, persists, and enforces its composition rules.

**Delivers:** REQ-DOM-001 … REQ-DOM-010, REQ-DOM-015 … REQ-DOM-019, REQ-DOM-027, REQ-DOM-028, REQ-SEC-010

Page, Tracking, TrackingProperty, DataLayerProperty (full attribute set including `business_label` and the `object` type with parent-child paths), Module, TrackingTemplate, SpecificValue, Destination with N:N mapping and `destination_name_override`, FreePage, company catalogue with copy-on-creation. CDP Audience and Survey are **not** in R1 — moved to M2.7 (2026-08-17). `presence` lives on TrackingProperty — the record of one property as used by one tracking — and nowhere else (REQ-DOM-027).

**Not in R1:** conditional valorisations in any form. The prose form was rejected outright (REQ-DOM-011) rather than shipped and later converted; the structured form (REQ-DOM-012) arrives in M2.1.

**Depends on:** M0.5

**Gated by:** ~~O11~~ — **closed 2026-08-12**: catalogue management is an Admin-role power, not a flag and not a fifth role ([REQ-SEC-010](requirements/REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role))

**Exit:** the composition rules hold under test — removing the last module-supplied property from a tracking detaches the module and warns; a module edit does not reach existing trackings unless propagation is explicitly requested; no entity can reference an entity in another project.

### M1.2 — Import-grade API

_Target: week 4._

**Goal:** everything in the product is reachable and idempotently writable by a machine.

**Delivers:** REQ-IMP-001, REQ-IMP-002, REQ-IMP-003, REQ-IMP-004, REQ-IMP-005, REQ-IMP-006, REQ-API-002, REQ-API-009

Every R1 entity creatable, readable and updatable through the API. Idempotent upsert on `custom_id`. Asset upload. Batch write endpoints. Reconciliation report. Documented public API contract, generated from the implementation. Service-account tokens.

**Depends on:** M1.1

**Exit:** the first imported product can be constructed through the API alone, with the UI never opened — this single test is the acceptance criterion for the whole milestone; a script written against the published documentation, with no reading of Platform source, succeeds.

> The Platform ships **no source-format-specific code** ([ADR-0021](../adr/0021-agent-driven-migration.md)). Every requirement here has post-import value; none of it is throwaway. That is the trade that justified dropping the bespoke importer.

### M1.3 — MCP server

_Target: week 5._

**Goal:** an agent can inspect the Platform, write into it, and verify its own work.

**Delivers:** REQ-API-003, REQ-API-004, REQ-API-006

Read tools over the R1 entity set plus the reconciliation report. Write tools covering the full R1 entity set, draft-only. Naming and documentation guidelines exposed as MCP resources.

**Depends on:** M1.2

**Exit:** an agent creates a tracking with modules, properties and specific values, reads it back, and cannot publish a version through any tool — publication, user deletion and permission changes have no MCP tool at all, rather than being permission-checked.

### M1.4 — Agent-driven pilot import

_Target: weeks 5–6._

**Goal:** the data model is validated against years of accumulated real usage, while there is still time to change it.

**Delivers:** REQ-IMP-007

Claude reads the first imported product's legacy export from the filesystem, explores its structure, and writes an import script. The script is reviewed, committed, and run against real data from the first imported product.

**Depends on:** M1.3

**Exit:** the full content of the first imported product exists in dx-doc; the reconciliation report is reviewed against the source by an editor; running the script twice produces no duplicates; every model ambiguity the import exposed is either fixed or written down as an accepted limitation.

> **Scheduled at week 5–6, deliberately ahead of a complete UI.** This is the mitigation for risks R1 and R2 in the [risk register](functional-specification.md), and its logic is unchanged from the importer it replaces: it is the only test that measures the data model against reality, and it must happen while the model is still cheap to change. It now does double duty — a gap in the API surface shows up here as something the agent cannot create. Do not reorder it behind the authoring UI.
>
> **The deliverable is a committed script, not an agent session.** An agent may quietly coerce unanticipated input into something that looks right, where a parser would have failed loudly. Three mitigations, none optional: the script is reviewed before it runs at scale, reconciliation counts are checked against the source, and the first product is verified item-by-item at M1.10 before the remaining products being imported follow.

### M1.5 — Authoring

**Goal:** an editor can write everything the source documentation held.

**Delivers:** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-005, REQ-AUTH-006

Markdown editor with the full block set. Image upload by drag-and-drop and clipboard paste, 10 MB cap, resize to 2000 px. Free pages with the publishable flag. Optimistic concurrency with stale-write rejection. Tracking duplication.

**Mermaid rendering is not here** — REQ-AUTH-004 is delivered by [M1.6](#m16--structure-and-navigation), where REQ-NAV-006 needs the renderer. A ` ```mermaid ` block is authorable and stored verbatim from M1.5 as the fenced code block it is (REQ-AUTH-001); it renders from M1.6 onward.

**Depends on:** M1.1

**Exit:** a tracking authored in the Platform is indistinguishable in content from its equivalent in the source documentation; two editors opening the same record produce a rejected save with a clear conflict message, not a silent overwrite.

### M1.6 — Structure and navigation

**Goal:** a large tracking plan can be explored.

**Delivers:** REQ-NAV-001 … REQ-NAV-007, REQ-AUTH-004

Page hierarchy driving a navigable sidebar. Automatic per-page recap of every attached tracking with its specific values. **Flows** — the Flow entity, Trigger nodes, the directed graph, its automatically generated Mermaid diagram, and the sidebar exposing flows alongside the hierarchy — moved into R1 on 2026-08-17 (REQ-NAV-003…007 and REQ-AUTH-004).

**Depends on:** M1.1

**Exit:** the first imported product's hierarchy is navigable end to end; opening any page answers "what is tracked here?" without further clicks; a flow's diagram is generated, not written; a hand-written ` ```mermaid ` block renders without being re-authored (REQ-AUTH-004).

### M1.7 — Search

**Goal:** the most frequent lookup — which tracking sets this value — is answerable.

**Delivers:** REQ-AUTH-007, REQ-SEC-012 (first enforcement; the requirement then stands)

Project-scoped full-text search. Property and tracking names ranked above other text. Specific values indexed. Non-publishable free pages excluded from the index.

Two indices per project ([ADR-0009](../adr/0009-search-abstraction.md)): the **published** index rebuilt on publication, the **draft** index rebuilt asynchronously after each save with rebuilds coalesced, never blocking the write.

**Depends on:** M0.3, M1.1 · **Gated by:** ~~O14~~ — **closed 2026-08-12**

**Exit:** searching a literal specific value returns the trackings that set it; prefix and stem matching work; a page marked non-publishable is provably absent from the published index, queried directly — and absent by construction, since that index is built from published content alone; a user without a grant on a project gets no hits from it and cannot fetch either index artefact; an edit made in the draft is findable within **30 seconds** of the save at the scale of the first imported product; a rebuild failure is surfaced rather than leaving a silently stale index. Typo tolerance is **not** an exit criterion — see REQ-AUTH-007.

### M1.8 — Versioning and publication

**Goal:** the capability the source documentation never had.

**Delivers:** REQ-VER-001 … REQ-VER-007

Single draft stream. Unpublished-changes indicator. Selective publication excluding individual trackings and pages. Version metadata. Diff at entity, property and specific-value granularity with text diff on rich content. Automatically generated changelog. Full historical consultation.

**Depends on:** M1.1

**Exit:** publishing produces a changelog nobody wrote by hand; an excluded tracking is absent from the version and present in the draft; a published tracking never references an unpublished property.

### M1.9 — Access and consultation

**Goal:** readers can use the Platform, and writes are accountable.

**Delivers:** REQ-SEC-005, REQ-SEC-006, REQ-VIEW-001, REQ-FDN-014 _— REQ-SEC-004 (OIDC SSO) moved to M2.8 on 2026-08-17_

Project shared-password access with optional expiry. Append-only audit log of write events with 24-month retention. In-app read-only view. Error-tracking integration. (OIDC SSO moved to M2.8 on 2026-08-17 — REQ-SEC-004 is no longer in R1.)

**Depends on:** M0.4, M1.8

**Exit:** a reader reaches a project through a shared password and through an invited email+password account; every write event named in spec §17.4 produces an audit entry.

### M1.10 — Pilot cutover

**Goal:** the release criterion is met, not approximated.

**Delivers:** REQ-IMP-008 — otherwise the acceptance milestone for R1.

Final import run, **item-by-item editorial verification of the first product**, editor onboarding, freeze of the source documentation to read-only. A human publishes version 1 — agents cannot (REQ-API-004).

**Depends on:** M1.4, M1.5, M1.6, M1.7, M1.8, M1.9

**Gated by:** O8 (developer-handoff reference review)

**Exit:** every row of the [minimum requirements](minimum-requirements.md) is satisfied; the first imported product's documentation is fully imported and verified item-by-item; an editor works without needing to reference the source documentation; version 1 is published with an automatically generated changelog.

> The item-by-item verification is also the only chance to correct the minimum-requirements checklist itself. It was derived from the baseline documentation structure, and real products drift from any baseline — anything found in the real product that the checklist does not name belongs in it.

> **Superseded on 2026-08-18.** M1.10 was closed against a codebase in which the application was never assembled, no UI existed, and the import script it depends on was never committed. Its exit criterion — "every row of the minimum requirements is satisfied" — was not demonstrated, and could not have been. The milestone keeps its ID and its scope; its acceptance moves to [M1.18](#m118--r1-acceptance), which re-runs it against a running application. [REQ-IMP-007](requirements/REQ-IMP.md#req-imp-007--import-scripts-committed-and-re-runnable) and [REQ-IMP-008](requirements/REQ-IMP.md#req-imp-008--source-system-frozen-then-read-only-archive) move with it.

---

## R1 completion — assembly, hardening and the client

_Target: weeks 9–16. No new product scope: every milestone here finishes a requirement M1.1–M1.10 already claimed, or fixes a defect that claim concealed. The order is a dependency chain, not a preference — nothing can be demonstrated in a browser until the runtime is assembled, and nothing can be demonstrated safely until the authorisation holes are closed._

> **The rule that produced this section, and that applies to every milestone in it:** a requirement is `Implemented` when it is reachable by the user the requirement is written for, through the entry point the requirement names. A service method with a passing unit test and no route is not an implemented API requirement; a route with no screen is not an implemented authoring requirement. This is not new — it is what [the requirements index](requirements/README.md#status-legend) already says `Verified` means, applied to `Implemented` as well.

### M1.11 — Runtime assembly and first-run

**Goal:** the process that `npm start` launches is the application the code describes.

**Delivers:** REQ-FDN-023, REQ-FDN-024, REQ-FDN-014 · **completes** REQ-API-001, REQ-SEC-013

A **composition root** that opens the database connection, constructs every repository, service and permission checker once, and hands them to `registerAllRoutes` — including `registerAuthRoutes`, which is currently absent from it. First-run bootstrap invoked at startup, against the same configuration loader that already refuses to start on a missing variable (REQ-FDN-013). A readiness endpoint distinct from liveness: `/api/health` answers "the process is up", `/api/ready` answers "migrations are applied and the database is reachable". Error-tracking integration wired to `SENTRY_DSN` (REQ-FDN-014), which is configured but has no consumer.

**Depends on:** M1.2, M1.3, M1.9

**Exit:** a **route-table test** asserts that the routes the running application serves are exactly the routes the API layer defines — a handler that exists in source and is not registered fails the build, which is the specific defect this milestone exists to make impossible to reintroduce; `docker compose up -d --build` on a clean machine yields an instance where the bootstrap administrator can authenticate and reach an authorised endpoint, exercised end to end by a test that starts the real server rather than a per-test Fastify instance; starting against an unmigrated database fails loudly and names the remedy.

> **This is the milestone whose absence made every later claim unfalsifiable.** Test suites that assemble their own application cannot detect that the application is never assembled. The route-table test is cheap and it is the only exit criterion here that is really about the future.

> **Closed on 2026-08-18.** `src/api/composition-root.ts` is the single composition root; `start()` and the test suite call the same `assembleComposition`, substituting only the database file, search index and object-storage seams for tests. It opens the connection, builds every repository and service once, registers `@fastify/cookie` and `registerAllRoutes` (which now reaches `registerAuthRoutes`), and mounts `/api/health` (liveness) and `/api/ready` (readiness). `checkStartup` runs reachability, migration and bootstrap in order; a pending migration names `npm run db:migrate` and the process fails loudly. Error tracking is behind `SENTRY_DSN` (REQ-FDN-014). The route-table test asserts the served set equals the API layer's defined set, and the end-to-end suite covers company-less bootstrap login on the real server, the against-an-unmigrated-database failure, read-once bootstrap across restarts, and readiness flipping without a restart.

### M1.12 — Access administration and API surface completion

**Goal:** a person can be given access to a project, and every R1 capability has an endpoint.

**Delivers:** REQ-API-002, REQ-API-009 · **completes** REQ-SEC-003, REQ-SEC-014, REQ-IMP-002, REQ-IMP-004, REQ-API-003, REQ-API-004, REQ-API-006

**Project grants become administrable.** `AccountRepository` gains grant creation, update and revocation; `ProjectService.create` grants the creator on the project it just created; the grant endpoints enforce `project.manage_access` (REQ-SEC-003). Without this the permission model is not strict, it is closed: `canOnProject` consults a table nothing can write to.

**The company-less administrator can log in.** The login route accepts an absent company id and resolves against `company_id IS NULL`, which is what the bootstrap administrator (REQ-SEC-013) and the instance-administration capability (REQ-SEC-014) already assume.

**The remaining surface lands:** company CRUD, account lifecycle (invite, deactivate, password reset — three application services with no routes), asset upload against the S3 port (REQ-IMP-004, which has `UPLOAD_MAX_BYTES` and `IMAGE_MAX_DIMENSION` configured and no consumer), deletion for every entity that R1 allows an editor to delete, and the OpenAPI document generated from the implementation (REQ-API-002, which has no artefact of any kind today). **MCP parity** closes the gap between 13 tools and ~60 endpoints: flows, triggers, versions, search, specific values and destinations get tools, so REQ-API-003/004's "the full R1 entity set" is true rather than approximate.

**Depends on:** M1.11

**Exit:** a newly created project is readable by its creator with no manual database write — the negative case today; an Admin grants a Viewer on one project and that Viewer reaches it and no other; a deactivated user's session and service token both stop working within one request; an agent can construct a complete tracking — page, modules, properties, specific values, destinations, flow — through MCP tools alone, which is the M1.3 exit criterion re-run against the full entity set; the OpenAPI document is generated in CI and a request that contradicts it fails review.

> **Service-account tokens (REQ-API-009) are today a Bearer header resolved against the session store.** That is authentication, not a service account: there is no issuance, no listing, no revocation and no expiry independent of a human's session. This milestone gives them their own lifecycle, because M1.4's import runs on them.

### M1.13 — Tenancy and authorisation hardening

**Goal:** the multi-tenancy boundary holds on every path, not only the ones with tests.

**Delivers:** REQ-SEC-016, REQ-SEC-017, REQ-SEC-018, REQ-SEC-019 · **completes** REQ-SEC-001, REQ-SEC-005, REQ-SEC-010, REQ-SEC-011, REQ-FDN-002

Six defects, all found on 2026-08-18, all in code M1.1–M1.9 shipped:

- **Catalogue reads are unauthorised.** `listProperties`, `listModules`, `listDestinations`, `listTrackingTemplates`, `listFreePages` and their five by-id counterparts check the caller's grant when `projectId` is set and check **nothing** when it is null, taking the company id from the URL. Any authenticated user reads any tenant's catalogue. Free pages make it worse: a non-publishable free page is where REQ-SEC-012 says test credentials live.
- **Write attribution is unchecked.** `createModule` and its four siblings write `company_id` from the URL without verifying the named project belongs to that company, so a user with an edit grant anywhere can attribute rows to any tenant.
- **Shared-password hashes are returned** by `GET /projects/:id/shared-passwords`, to anyone holding `project.read`.
- **`deleteSharedPassword` ignores its project scope** — the permission check uses `projectId`, the delete uses the id alone.
- **`listAuditLogs` does not verify** that the requested project belongs to the company whose audit permission was checked.
- **The session cookie sets `secure: false` unconditionally**, and no path in the codebase is rate-limited — including the unauthenticated shared-password verify endpoint, which runs one bcrypt comparison per stored password per request.

The fix is not ten patches. A single **deny-by-default authorisation helper** (REQ-SEC-016) takes the actor, the company scope, the optional project scope and the action, and every service method routes through it; the catalogue branch stops being an implicit `else` that nobody wrote. Shared-password access also gains the reader session it never had: verifying a password issues a scoped, read-only session token, which is what [REQ-VIEW-001](requirements/REQ-VIEW.md#req-view-001--in-app-read-only-view) consumes at M1.17.

**Depends on:** M1.12

**Exit:** a **cross-tenant test matrix** runs every read and write entry point — REST, MCP and direct service call — as a user of company B against company A's data, and every cell is denied; the catalogue path is in that matrix, since its absence is the defect; no response body anywhere contains a password hash, a token hash or a secret, asserted by a response-shape test rather than by inspection; a shared-password verify endpoint under repeated failure is throttled and the throttling is tested; the session cookie carries `secure` whenever `APP_URL` is `https`, and a test asserts it.

> **Why this is a milestone and not a patch set.** Five of the six defects are the same defect: an authorisation decision expressed as a condition at each call site rather than as a single gate every call site must pass. Fixing them individually leaves the shape that produced them, and there are ~30 such call sites in `TrackingService` alone.

> **Closed on 2026-08-19, with follow-up work carried forward.** Catalogue list and by-id reads pass through `canOnProjectOrCompany`; shared-password responses omit hashes; parent scopes are verified for shared-password deletion, audit-log project reads and project-scoped catalogue writes; and HTTPS application URLs produce secure session cookies. The remaining reader-session, throttling and REST/MCP matrix work stays explicitly open in REQ-SEC-005, REQ-SEC-017, REQ-SEC-018 and REQ-SEC-019 rather than being misreported as verified.

### M1.14 — Write integrity, audit and publication correctness

**Goal:** a write is atomic, recorded, conflict-safe, and cannot leak content it excluded.

**Delivers:** REQ-FDN-025, REQ-NFR-015 · **completes** REQ-SEC-006, REQ-SEC-012, REQ-AUTH-005, REQ-VER-003, REQ-VER-005, REQ-VER-006, REQ-IMP-005

- **Audit coverage.** `appendLog` has two call sites today, both about shared passwords. REQ-SEC-006 enumerates login, entity create/modify/delete, publication, export, shared-password access, MCP calls and permission changes. Every class named there gets its entry and its test, and the log is made append-only in the schema rather than by convention.
- **Optimistic concurrency everywhere.** Every update path across `TrackingService`, `PageService`, `ProjectService` and `CompanyService` takes `expectedUpdatedAt` and enforces it as an atomically guarded `UPDATE ... WHERE id = ? AND updated_at = ?`, returning the same `stale_write` conflict on a mismatch (REQ-AUTH-005, [ADR-0016](../adr/0016-concurrency-model.md)). Every mutable entity in the system is now covered.
- **Publication stops leaking non-publishable content.** `publishVersion` filters free pages by the caller's explicit exclusion list only, so a page marked `publishable: false` lands in the immutable snapshot. The search path gets this right and publication does not — which is exactly the "each output channel carries its own REQ-SEC-012 test" rule in the Definition of Done, unobserved.
- **The changelog covers what it claims.** The diff emits `property` and `tracking` entries only, while `ChangelogEntry` admits modules, destinations, pages and flows. Selective publication's referential-integrity rule (REQ-VER-003) is a comment with no code beneath it.
- **Transactional boundaries** (REQ-FDN-025). `publishVersion` reads six collections and writes a snapshot, `setFlowGraph` replaces nodes and edges, and the batch endpoint (REQ-IMP-005) writes hundreds of rows — none in a transaction. A partial batch failure currently leaves partial data and reports success per item.
- **Query-path indexes** (REQ-NFR-015). The migrations create no index at all: every foreign key and every `custom_id` lookup is a table scan. This is the milestone where REQ-NFR-001…004's targets stop being aspirational, because M1.17 measures them.

**Depends on:** M1.13

**Exit:** every event class in spec §17.4 has a test proving an audit entry, and no application path can update or delete one; two concurrent edits to any mutable entity produce a rejected save with a conflict message, tested per entity type rather than per service; a free page marked non-publishable is provably absent from a published version, queried directly out of the snapshot; a batch write that fails on item 40 of 100 leaves nothing behind; the reconciliation report and the search sync over the first imported product's volume meet REQ-NFR-002 and REQ-NFR-004.

> **Closed on 2026-08-19, with follow-up work carried forward.** Audit-log append-only enforcement and publication referential-integrity checks are implemented and tested; non-publishable pages are excluded and changelog coverage is expanded. Race-safe optimistic concurrency (REQ-AUTH-005) closed on 2026-08-21 for every mutable entity — `TrackingService`, `PageService`, `ProjectService` and `CompanyService`. Batch atomicity and exhaustive audit/concurrency matrices remain open in REQ-FDN-025 and REQ-IMP-005.

### M1.15 — Client foundation

**Goal:** there is an application in the browser, and everything after this is a screen inside it.

**Delivers:** REQ-FDN-026 · **completes** REQ-NFR-007, REQ-NFR-010, REQ-NFR-012

The design system stops being `export {}`. shadcn/ui components brought in as source, kept close to upstream per [ADR-0011](../adr/0011-ui-library-selection.md) and [ADR-0008](../adr/0008-design-system-boundary.md), with the token set as the single source of visual values. The application shell: authenticated layout, company and project switcher, navigation chrome, error and empty states. **Server state through TanStack Query** ([ADR-0012](../adr/0012-data-fetching-strategy.md)) with project-scoped query keys so a cache entry cannot cross a project boundary; **local state through Zustand** ([ADR-0013](../adr/0013-state-management.md)), small per-slice stores. Login, logout, forced password change at first login (REQ-SEC-013), password reset, and the project list filtered to the caller's grants. Desktop-only layout (REQ-NFR-007), English with the translation seam in place (REQ-NFR-010), localised dates and numbers (REQ-NFR-012).

#### M1.15 implementation plan

The work is deliberately limited to the client foundation. Authoring, consultation, publication and reader-mode screens remain in M1.16 and M1.17.

1. **Design-system foundation:** define the central visual tokens; add accessible shadcn/ui-based primitives for buttons, inputs, labels, alerts, dialogs, menus, cards, tables, skeletons and application layout; export them only through `@project/design-system`; record every deliberate upstream divergence.
2. **API client:** add a typed browser client for authentication, companies and projects; normalize API errors; keep HTTP and cookie handling outside React components; add request tests for success, validation, unauthorized and forbidden responses.
3. **Server-state foundation:** add TanStack Query with retries disabled in tests; define query-key helpers whose company and project scopes are explicit; add authenticated-user, company and accessible-project queries plus login, logout, password-change and project mutations with targeted invalidation.
4. **Authentication flow:** implement login, logout, forced first-login password change and password-reset request/reset routes; expose loading, validation, authentication-error, network-error and success states.
5. **Authenticated shell:** implement the desktop application frame, header, company/project context, navigation chrome, current-user actions, loading states, empty states and error states. URL state remains the source of truth for selected company and project.
6. **Project access surface:** implement the project list using server state returned by the API, showing only projects accessible to the actor; switching projects changes the URL and uses project-scoped query keys.
7. **Acceptance path:** run the real browser flow from bootstrap login through forced password change, company and project creation, editor grant and editor project-list visibility. No seeded database or direct API setup is permitted in the M1.15 acceptance test.

#### M1.15 UI design validation

UI decisions are validated through a repeatable design-review surface rather than code inspection alone.

- A `/design-review` route presents every foundation primitive in default, hover, focus, disabled, loading, empty, validation-error and network-error states.
- Visual review is performed at the supported desktop width and at the minimum supported width, with screenshots retained for meaningful design changes.
- Keyboard review covers tab order, visible focus, Enter/Space activation, Escape handling, dialog focus trapping and menu navigation.
- Accessibility review checks landmarks, accessible names, error associations, status announcements, contrast and non-color status cues using the browser accessibility tree.
- Component tests verify behavior and state transitions; snapshots are not the primary visual specification.
- Playwright covers the real M1.15 acceptance path against a running instance and verifies that the visible project list matches the authenticated grants.
- Each non-obvious design decision records the user problem, chosen pattern, alternatives, accessibility implications, responsive behavior and whether the pattern belongs in the design system or a feature component.

The M1.15 review artifact is the combination of the design-review route, component tests, screenshots, accessibility observations and the Playwright acceptance result. A non-developer can therefore validate both the visual decision and the underlying behavior without reading the implementation.

**Depends on:** M1.12 — the screens need grants and lifecycle endpoints to be worth building

**Exit:** the bootstrap administrator logs in through the browser, is forced to change the password, creates a company, creates a project, grants an editor, and that editor sees exactly that project on login — the whole path in a Playwright test against a real instance, with no API client and no seeded database; a component imported from a shadcn path outside `@project/design-system` fails lint.

> **This is the first milestone whose exit criterion a non-developer can check**, and that is deliberate. Everything before it is verifiable only by test; from here the demonstration is somebody using the product.

> **Blocked at "creates a project" — resolved 2026-08-27.** The client foundation itself (design system, API client, query/state layers, auth flow, shell, project list, design-review route, component tests) is built and passing. The exit-criterion walkthrough deadlocked one step earlier than the client can fix: a freshly created company had no path to its first Admin, so the bootstrap administrator could not create a project in a company they just created. Resolution implemented: `CompanyService.createCompany` now optionally provisions its first Admin in the same call (see [REQ-SEC-014](requirements/REQ-SEC.md#req-sec-014--instance-administration-capability) for the decision and the alternatives it rejected). The Playwright acceptance test (`e2e/m1-15-acceptance.spec.ts`) now runs the full path end-to-end and passes in CI: bootstrap login, forced password change, company creation, step-up, project creation, editor invite and grant, and the editor seeing exactly that one project — closing this milestone's exit criterion.

### M1.16 — Authoring UI

**Goal:** an editor can build the whole tracking documentation without leaving the browser.

**Delivers:** — · **completes** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-005, REQ-AUTH-006, REQ-DOM-007, REQ-DOM-009, REQ-DOM-019, REQ-NFR-001, REQ-NFR-011

The screens behind the M1.5 requirements, plus the two model capabilities whose service layer stops short of the requirement:

- **Markdown editor** with the full block set (REQ-AUTH-001), engine per [ADR-0023](../adr/0023-rich-text-editor.md), storing ` ```mermaid ` blocks verbatim — built, with the round-trip proven by spike; **image upload** by drag-and-drop and paste against the M1.12 asset endpoint (REQ-AUTH-002) — built, cap and resize enforced server-side in `AssetService`. **Free pages** with the publishable flag (REQ-AUTH-003) are **not built**: the requirement calls for a hierarchy independent of the Page/Screen tree, and `free_pages` has no `parent_id`, so this needs a migration and a decision before the editor exists.
- **Page editor**: hierarchy, description, parent selection — built. Screenshots are Markdown image references inside the description, per REQ-AUTH-002, not a separate field.
- **Tracking editor**: navigation event, page attachment created inline, module attachment and detachment with the REQ-DOM-008 warning surfaced, per-property `presence`, specific values with placeholders preserved verbatim, destination mapping with per-mapping name override.
- **Property, module and destination editors**, project-scoped and catalogue-scoped, with the **catalogue copy** flow (REQ-DOM-019) — company catalogue properties and modules are copied automatically, as independent project-scoped rows, during project creation; the standalone screen at `/projects/:projectId/catalogue` remains available for explicit manual copies and is idempotent.
- **Tracking templates** (REQ-DOM-009): the pre-seeding mechanism reads `config_json` for description, page, navigation event, modules and configurable default specific values keyed by seeded source properties. Values are materialised against the new tracking-property IDs, and unseeded references are rejected before creation. The editor screen edits name, description, navigation event and the raw `config_json`. A browser-reachable create-from-template selection flow remains open.
- **Opt-in module propagation** (REQ-DOM-007): built — `previewModulePropagation` reports what would change without writing, `propagateModuleToTrackings` applies it on request and records a single audit entry. Surfaced in the module editor behind an explicit "check what would change" step.
- **Tracking duplication** (REQ-AUTH-006) and **conflict handling** (REQ-AUTH-005): the stale-write rejection from M1.14 surfaced as a comprehensible conflict message, not a toast saying 409.

**Depends on:** M1.14, M1.15

**Exit:** an editor builds one complete page of the first imported product's documentation — page, screenshot, two trackings, their modules, properties, presence, specific values and destination mappings — using the browser only, and the result is indistinguishable in content from the source documentation; two editors on the same tracking produce a conflict message naming what changed; opening a tracking page meets REQ-NFR-001's 2-second target at the first imported product's volume.

> **Exit criteria not yet met as of 2026-08-27.** The screens exist and are unit-tested (69 files, 477 tests), and the Playwright suite runs in CI against a real browser and passes: MinIO is reachable, `/api/ready` returns 200, and both the M1.15 acceptance specs (bootstrap-and-onboard and the forced-password-change path) pass end to end. Free pages (REQ-AUTH-003) now have a hierarchy, an API and an editor screen (`free-page-editor-page.tsx`, `free-page-list-page.tsx`, `free-page-create-page.tsx`), routed at `/projects/:projectId/free-pages`. What still blocks the exit: REQ-NFR-001's 2-second target has not been measured at all, and no walkthrough has yet built one complete page of the first imported product's documentation end to end in the browser.
>
> **Found 2026-09-01 — a concrete reason the walkthrough above cannot be completed yet.** This exit criterion names "two trackings, their modules, properties" as part of the one page an editor must build using the browser only. ~~Today there is no route or form to create a brand-new Tracking, Data Layer Property or Module~~ — **corrected 2026-09-02: Tracking now has a create screen** at `/projects/:projectId/trackings/new` (form plus sidebar and page-recap entry points); **corrected again 2026-09-02: Data Layer Property and Module now have create screens too**, at `/projects/:projectId/properties/new` and `/projects/:projectId/modules/new` (forms plus sidebar and catalogue-copy entry points), so the remaining way to fill a project's Property/Module set besides creating them is copying ones already defined at company level ([REQ-DOM-002](requirements/REQ-DOM.md#req-dom-002--tracking-entity-with-navigation-event-and-attachment), [REQ-DOM-003](requirements/REQ-DOM.md#req-dom-003--data-layer-property-full-attribute-set), [REQ-DOM-006](requirements/REQ-DOM.md#req-dom-006--module-entity-project-scoped-inheritable)). The walkthrough can now be attempted from an empty project.

### M1.17 — Consultation, search and publication UI

**Goal:** the documentation can be navigated, searched, published and read.

**Delivers:** — · **completes** REQ-NAV-001 … REQ-NAV-007, REQ-AUTH-004, REQ-AUTH-007, REQ-VER-001, REQ-VER-002, REQ-VER-004, REQ-VER-007, REQ-VIEW-001, REQ-NFR-002, REQ-NFR-003, REQ-NFR-004, REQ-NFR-014

- **Navigation** (REQ-NAV-001, 002, 007): the page hierarchy as a navigable sidebar, the automatic per-page recap answering "what is tracked here?" without a further click, and flows exposed alongside the hierarchy.
- **Flows** (REQ-NAV-003…006, REQ-AUTH-004): the flow editor over the existing graph model, the generated Mermaid diagram **rendered** — `generateMermaidDiagram` produces a string today and nothing draws it — and hand-written ` ```mermaid ` blocks rendered by the same component.
- **Search** (REQ-AUTH-007): the authenticated project-scoped search screen uses the existing grant-checked `GET /api/projects/:id/search?q=...` contract. The current Pagefind adapter serves query results from its in-process project map; a browser-served Pagefind index route and the two-index draft/published model from [ADR-0009](../adr/0009-search-abstraction.md) remain future work.
- **Publication** (REQ-VER-001, 002, 004, 007): the unpublished-changes indicator, the pre-publication diff — the feature [the risk register](#risk-mitigations-owned-by-milestones) names as load-bearing for adoption — selective exclusion with its referential warnings, version metadata, and full historical consultation.
- **Reader mode** (REQ-VIEW-001): the in-app read-only view, reachable by an invited account and by the project-scoped shared-password reader session now issued by the backend, with non-publishable content absent (REQ-SEC-012) and every mutating affordance gone rather than disabled.
- **Observability** (REQ-NFR-014): structured logs and the error-tracking integration from M1.11 exercised against real failures.

**Depends on:** M1.16

**Exit:** the first imported product's hierarchy is navigable end to end; searching a literal specific value returns the trackings that set it, within REQ-NFR-002's 4 seconds, and a user without a grant can fetch neither hits nor the index artefact; publishing produces a changelog nobody wrote by hand and a diff generated within REQ-NFR-003's 6 seconds; a reader with a shared password reaches the published documentation and no draft, no non-publishable page and no edit control.

### M1.18 — R1 acceptance

**Goal:** the release criterion is demonstrated, not asserted.

**Delivers:** REQ-IMP-007, REQ-IMP-008 — otherwise the acceptance milestone for R1, re-running [M1.10](#m110--pilot-cutover)'s criterion against a running application.

The import script M1.4 was closed without committing: written against the completed API and MCP surface, reviewed, committed, and run against real data ([ADR-0021](../adr/0021-agent-driven-migration.md) — the deliverable is a committed script, not an agent session). Then the M1.10 work as originally scoped: final import run, **item-by-item editorial verification of the first product**, editor onboarding, the source documentation frozen read-only, and a human publishing version 1.

**Depends on:** M1.17 · **Gated by:** O8 (developer-handoff reference review)

**Exit:** **an editor who has never seen the repository builds a complete tracking documentation for a product from an empty project, in the browser, and publishes it** — this single demonstration is the acceptance criterion for the whole release; every row of the [minimum requirements](minimum-requirements.md) is satisfied and demonstrated, each row named against the screen that satisfies it; the first imported product's documentation is imported and verified item-by-item; running the import script twice produces no duplicates; every R1 requirement is `Verified` in its requirement file, with no row `Implemented` on the strength of a unit test alone.

> **The one process change this section is worth.** M1.10 was closed on the strength of a test suite. Its replacement is closed on the strength of somebody using the product, and the requirement files carry `Verified` rather than `Implemented` for every R1 row when it is. If that distinction had been enforced at M1.10 — it is already written down in [the status legend](requirements/README.md#status-legend) — this section would not exist.

> **R1 gate.** A tracking documentation can be authored, searched, versioned, published and read, by people, in a browser, on a deployed instance. The import is complete and live. Two things must be recorded here and are not recoverable later:
>
> - **O13's answer.** The operations editors performed by hand during this import are the evidence base for R2's bulk operations.
> - **Whether the import script generalises.** The first imported product is one of the products being imported, documented against a template that drifted over years. If the script needed heavy per-product adaptation, that is the signal that the remaining products are a longer job than one script run each — and it is worth knowing before committing to a schedule for them.

---

## R2 — Navigation and distribution

_Target: months 3–4. The release that lets people outside the tool consume the documentation._

### M2.1 — Structured expression

**Delivers:** REQ-DOM-012, REQ-DOM-013, REQ-DOM-014, REQ-DOM-022, REQ-DOM-023

Structured property conditions (four operators plus note), conditions on nested property paths, company-defined custom fields, `derived_from`, non-blocking naming and format warnings.

**Depends on:** M1.1 · **Gated by:** O3 (how "read this in the analytics platform" is structured)

**Exit:** a conditional valorisation authored in R1 as prose can be re-expressed structurally without data loss; a condition on `product.characteristics.colour` displays its full path.

### M2.2 — ~~Flows~~ _(moved to M1.6 on 2026-08-17)_

**Delivers:** ~~REQ-NAV-003 … REQ-NAV-007, REQ-AUTH-004~~

The Flow entity, Trigger nodes, the directed graph, Mermaid generation and the flow sidebar were moved to [R1 · M1.6](#m16--structure-and-navigation) on 2026-08-17, together with REQ-AUTH-004 (the renderer is built once and serves both flow diagrams and hand-written blocks). **This milestone is emptied** and its ID retained per the stable-ID rule; it is a marker that this work used to belong to R2 so any reference resolves rather than points elsewhere.

### M2.3 — Image annotations

**Delivers:** REQ-AUTH-014

Point and region annotations stored as a separate JSON layer over a preserved original, nestable, linkable to a Trigger or Tracking.

**Depends on:** M1.5, M1.6

**Exit:** an annotation survives re-editing; a region containing a nested region expresses container-level and item-level interactions distinctly.

### M2.4 — Bulk operations

**Delivers:** REQ-AUTH-010, REQ-API-008

Add/remove module, add/remove property, change page attachment, archive — the six operations confirmed by O13 ([REQ-AUTH-010](requirements/REQ-AUTH.md#req-auth-010--bulk-operations-on-a-multi-selection-with-preview)) — applied to a tracking multi-selection with a preview, a single audit entry, and API/MCP exposure restricted to explicit identifier lists.

**Depends on:** M1.1 · **Gated by:** ~~O13~~ — **closed 2026-08-13**

**Exit:** every operation shows the affected items before applying; no API path accepts a filter expression as the operation target; results appear in the publication diff like any other edit.

### M2.5 — Profile-aware rendering

**Delivers:** REQ-VIEW-002, REQ-VIEW-003

The rendering engine that physically omits excluded content from generated artefacts, with a non-leakage guarantee. **Prerequisite for every export milestone below** — build it first.

Also ships the Analyst/Business and Development view selector ([REQ-VIEW-002](requirements/REQ-VIEW.md#req-view-002--view-selector-as-a-presentation-filter)), moved here from R1 (M1.9) on 2026-08-13 so it aligns with — and follows — open decision O3.

**Depends on:** M1.8

**Exit:** a development-view artefact contains no destination, no `tag_manager`-sourced property, no analysis note, no audience and no survey — verified by scanning generated output, not by inspecting the template.

### M2.6 — Distribution channels

**Delivers:** REQ-VIEW-004, REQ-VIEW-005, REQ-VIEW-006, REQ-VIEW-007, REQ-VIEW-008

Per-project static site regenerated on publication; git export with one commit per publication attributed to the publishing editor; PDF export of a version's changes; Excel export of properties; development-filtered changelog.

**Depends on:** M2.5

**Exit:** publication regenerates the static site and produces exactly one commit; no artefact contains content from a non-publishable free page.

### M2.7 — Editorial depth

**Delivers:** REQ-VER-008, REQ-VER-009, REQ-VER-010, REQ-AUTH-008, REQ-AUTH-009, REQ-AUTH-012, REQ-AUTH-013, REQ-DOM-020, REQ-DOM-024, REQ-DEV-001

**Also delivers (moved from M1.1 on 2026-08-17):** [REQ-DOM-017](requirements/REQ-DOM.md#req-dom-017--cdp-audience-entity) CDP Audience and [REQ-DOM-018](requirements/REQ-DOM.md#req-dom-018--survey-entity) Survey entities — removed from the R1 critical path; the first imported product documents them in free text or adds them post-import.

Full rollback; publication email notifications with per-project subscription; page and flow duplication; cross-project tracking copy with guided mapping; per-element change history; global script-instruction template with project placeholders; project-scoped impact analysis; selective adoption of company-catalogue module changes; **agent-vs-human attribution in the diff**.

**Depends on:** M1.8, M1.6

**Exit:** impact analysis answers "what references this property?" before any deprecation; a rollback restores a prior version in full; an agent's edit is visibly distinguishable from an editor's in the publication diff.

> Attribution moved here from R3. With MCP write tools in R1, agents and humans share a draft from R1 onward, and the publication diff is the only review gate — it has to show which is which.

### M2.8 — Platform hardening

**Delivers:** REQ-SEC-004, REQ-SEC-007, REQ-SEC-008, REQ-SEC-009, REQ-SEC-015, REQ-FDN-015, REQ-FDN-018, REQ-FDN-019

OIDC SSO (moved from R1/M1.9 on 2026-08-17) and SAML SSO; audit log UI as a paginated list with CSV export; project archive and restore; the instance-administration portal (the surface over the R0 capability); per-company branding. **MariaDB and PostgreSQL adapters** ([ADR-0020](../adr/0020-database-portability.md)), plus the dialect test matrix that verifies them.

**Depends on:** M1.9, M0.2

**Exit:** a project can be archived and restored with no data loss; projects cannot be hard-deleted through any entry point; the full repository and migration suite runs unchanged on SQLite, MariaDB and PostgreSQL, with no test skipped on any dialect.

> This is where the portable-SQL constraint (REQ-FDN-020) stops being free. A dialect-specific shortcut taken in M0.2 surfaces here as a migration that has to be rewritten and a schema that has to be changed under existing data. The constraint is cheap to hold in R0 and expensive to recover in R2.

### M5.0 — Ontology definition

**Goal:** close O1 and O2.

**Scheduled in R2 despite its R5 number.** Milestone IDs are stable ([how to read this](#how-to-read-this)), so this one keeps the ID it was assigned when it was assumed to belong to the semantic-layer release. It does not: **it must complete before the end of R2.** Everything in R5 is unscopeable until it does, and the R0/R1 precautions (immutable IDs, `business_label`, custom fields) only defer the cost of getting it wrong — they do not remove it. It was listed under R5 until 2026-08-12, where reading order put it nine months after its own deadline.

It is a workshop, not a build: the deliverable is the ontology's classes, its IRI scheme, the export formats, and the business glossary's structure — enough for M5.1 to be scopeable at all.

**Depends on:** nothing in R2. It can start any time, and the reason to start it early is that its output is a decision, not code.

**Exit:** O1 and O2 are closed with an ADR or a decision record, and [REQ-DQ-004](requirements/REQ-DQ.md#req-dq-004--semantic-layer-exports-owl--rdf--skos)–[REQ-DQ-006](requirements/REQ-DQ.md#req-dq-006--business-glossary) have acceptance criteria that someone could implement against.

> **R2 gate.** External stakeholders consult the documentation without an account in the application.
>
> **Before R2 closes:** M5.0 is complete. It is the last responsible moment for O1 and O2, and R5 cannot be scoped without them.

---

## R3 — Developer handoff, API and MCP

_Target: months 5–6._

### M3.1 — Code snippet generation

**Delivers:** REQ-DEV-002, REQ-DEV-003, REQ-DEV-004, REQ-DEV-005

Snippets per platform × tag manager, hard-coded in application source, placeholders preserved verbatim, narrowed by structured property conditions, generated on the fly and excluded from versioning and diffs, present in every development-facing artefact.

**Depends on:** M2.1, M2.5, M2.6

**Exit:** a developer reading a snippet for a conditional scenario sees only the values that apply there, with required and forbidden properties marked.

### M3.2 — Confluence publication

**Delivers:** REQ-VIEW-009

Confluence Cloud via API to a configurable space, development view only, full overwrite on each publication.

**Depends on:** M2.5, M3.1

**Exit:** a manual edit made in Confluence is overwritten on the next publication — by design and documented as such.

### M3.3 — Public API — _moved to [M1.2](#m12--import-grade-api)_

The documented public API is no longer an R3 deliverable. Import is written against it, so it ships in R1. The ID is retained rather than reused, so that anything referring to "M3.3" resolves to this note instead of silently pointing at different work.

### M3.4 — Interactive agent access

**Delivers:** REQ-API-005, REQ-API-010

OAuth with user consent for interactive MCP clients — analysts' assistants and developers' IDEs — and the richer read tools that R1 could not carry because their subject matter did not exist yet: flow and trigger structure (R2), changelog between two versions, impact analysis (R2), property detail enriched with data-quality status (R4).

**Depends on:** M1.6, M2.7

**Exit:** an analyst queries the documentation from their own AI assistant, authenticated by consent rather than a shared token, and sees exactly what their project grants allow.

> **Most of this milestone moved to R1.** The MCP server itself, its write tools, the documented public API and the naming-guideline resources are all M1.2–M1.3 now, because import depends on them ([ADR-0021](../adr/0021-agent-driven-migration.md)). What remains here is the part import never needed: interactive consent, and read tools over capabilities that only exist from R2 onward.

### M3.5 — Containers and conveniences

**Delivers:** REQ-DOM-025, REQ-DOM-026, REQ-NAV-008, REQ-AUTH-011, REQ-AUTH-015, REQ-VER-011, REQ-DEV-006

Extension, Segment and Calculated Metric as containers; recurring-custom-property standardisation hint; visual drag-and-drop graph editor; individual item archive and restore; whole-project duplication; selective rollback; dashboard and KPI links.

**Depends on:** M1.6 · **Gated by:** O9 (whether the container entities need real attributes before R5)

> **R3 gate.** A developer receives everything they need without manual intervention; an analyst queries the documentation from an AI assistant.

---

## R4 — Data quality and verification

_Target: months 7–8._

### M4.1 — Analytics platform integrations

**Delivers:** REQ-DQ-001

Adobe Analytics/CJA, GA4 and PostHog read access through service accounts injected as environment variables. Nothing is imported into the documentation.

**Gated by:** O5 (verification module scope) · **Start the access-provisioning request during R2** — risk R8.

### M4.2 — Signals and conformance reports

**Delivers:** REQ-DQ-002, REQ-DQ-003

Top-N values over 30 days, daily occurrence trend, null and non-conformance percentages, segmented by environment and platform, on a daily cache with on-demand refresh. A posteriori conformance report per tracking. **Reports only — no persisted state on the tracking until R6.**

**Depends on:** M4.1, M2.1 · **Gated by:** O4 (conformance checking against unstructured placeholders)

### M4.3 — R4 conveniences

**Delivers:** REQ-API-007, REQ-DEV-007, REQ-DOM-021

Outbound webhooks on publication; Figma frame import with design refresh; optional project pairing with an advisory alignment report.

---

## Backlog

_Target: none scheduled. Everything beyond R4 moved here on 2026-08-13; scope pending O1/O2._

> **M5.0 is not here.** It is scheduled in [R2](#m50--ontology-definition), where its deadline actually falls, and it is the prerequisite for anything in this backlog to be scoped at all.

- **Semantic exports** (was M5.1) — OWL, RDF and ISO 25964/SKOS exports; business metrics and dimensions; certified segments; business glossary. **Depends on M5.0** — scope undefined until then. No requirement IDs are assigned yet, deliberately.
- **Tracking implementation status** (was M6.1) — lifecycle state per tracking (documented → in development → released → verified → deprecated), giving R4's conformance results somewhere to persist.
- **Insights repository** (was M6.2) — treated as a separate product on the same foundation. Not scoped here.

---

## Critical path

```
M0.1 ─→ M0.2 ─→ M0.4 ─┐
   └──→ M0.3 ──────────┴─→ M0.5 ─→ M0.6 ─→ M1.1 ─→ M1.2 ─→ M1.3 ─→ M1.4 ─→ M1.10
                                              ├─→ M1.5 ─────────────────────┤
                                              ├─→ M1.6 ─────────────────────┤
                                              ├─→ M1.7 ─────────────────────┤
                                              └─→ M1.8 ─→ M1.9 ─────────────┘
                                                                             │
   R1 completion (strictly sequential — each step is the next one's premise) │
                                                                             ↓
   M1.11 ─→ M1.12 ─→ M1.13 ─→ M1.14 ─→ M1.15 ─→ M1.16 ─→ M1.17 ─→ M1.18
   assemble  access   tenancy   write     client    author    consult   accept
             + API    + authz   integrity foundation
```

Six things sit on the critical path and are worth protecting:

1. **M0.1 blocks everything.** It is a decision milestone with no code. It is also the cheapest place in the project to spend a week.
2. **M1.2 → M1.3 → M1.4 is now a three-milestone chain, and it is the longest one in R1.** The import cannot start until the API is complete and the MCP tools exist. This chain replaced a single self-contained importer milestone, and it is the main reason R1 got harder rather than easier ([ADR-0021](../adr/0021-agent-driven-migration.md)).
3. **M1.4 must not slip behind the UI.** Its value is diagnostic and it decays: an import that runs in week 6 can still change the data model, one that runs in week 8 cannot. It did slip — the script was never committed — and it is re-run at [M1.18](#m118--r1-acceptance) against a complete surface, which is a worse position than the original schedule and the reason this note stays.
4. **M1.11 is the new M0.1: it blocks everything after it and it is cheap.** A composition root and a route-table test are a day of work that make every subsequent exit criterion demonstrable. Every milestone from M1.12 onward is unverifiable without it.
5. **M1.13 must not slip behind M1.15.** The tenancy defects are in shipped code; the moment a UI exists, an instance becomes worth deploying, and a deployed instance with an unauthorised catalogue read path is a disclosure. Hardening before the client is a sequencing choice made once, not a preference to revisit under schedule pressure.
6. **M2.5 blocks all of R2's distribution.** Every export milestone depends on the non-leakage guarantee. Building exports first and retrofitting the rendering profile means auditing every artefact twice.

> **The R1 completion chain has no parallelism, and that is deliberate.** M1.15–M1.17 could nominally start against the current API, but building screens against an authorisation model that is about to change and a route table that is not served produces rework that costs more than the sequencing does. The one exception worth taking: design-system component work (M1.15) has no backend dependency and can start during M1.13–M1.14.

## Open decisions, by the milestone they gate

| Decision                                                     | Gates | Last responsible moment |
| ------------------------------------------------------------ | ----- | ----------------------- |
| O8 — developer-handoff reference patterns                    | M1.18 | End of R1               |
| O3 — structured "how to read this in the analytics platform" | M2.1  | Start of R2             |
| O1 — semantic layer ontology, IRIs, export formats           | M5.0  | End of R2               |
| O2 — business glossary                                       | M5.0  | End of R2               |
| O9 — container entity attributes                             | M3.5  | Start of R3             |
| O4 — data quality vs unstructured placeholders               | M4.2  | Start of R4             |
| O5 — verification module scope                               | M4.1  | Start of R4             |

**O7 is closed** — see [ADR-0024](../adr/0024-kysely-as-persistence-query-builder.md) (superseding ADR-0015): forward-only versioned migrations run via an explicit `db:migrate` step (Kysely `Migrator`), no auto-apply at boot, no downgrade path, and backup as the operator's documented responsibility. M0.1 is no longer gated by anything.

**O11 and O14 are closed**, both on 2026-08-12, which leaves R1 ungated end to end. O11: managing the company catalogue is an Admin-role power, not a flag and not a fifth role — the instance administrator's remit is companies as entities, the Admin's is everything inside one ([REQ-SEC-010](requirements/REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role)). O14: two indices per project, the published one rebuilt on publication and the draft one rebuilt asynchronously after each save, with a 30-second freshness target ([ADR-0009](../adr/0009-search-abstraction.md)).

**O12 is closed.** It asked whether a self-hostable search adapter was needed before the public release — a release R0 had already performed, which made the question unanswerable in the order it was scheduled. Choosing a self-contained default ([REQ-FDN-007](requirements/REQ-FDN.md#req-fdn-007--search-behind-a-port-pagefind-is-the-default-adapter)) removes the question rather than answering it, and retires [REQ-FDN-016](requirements/REQ-FDN.md#req-fdn-016--self-hostable-search-adapter) with it.

**O6 and O10 are closed**, see [ADR-0014](../adr/0014-configuration-split.md): the environment variable matrix is complete ([README.md](../../README.md#environment-variables)), and the disputed keys (SSO connection details, supported login methods, supported locales) are company-level database configuration rather than instance environment variables.

## Risk mitigations owned by milestones

| Risk (spec §22)                                                     | Owning milestone | Mitigation                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 — Must set exceeds the R1 budget                                 | M1.4, M1.18      | Week 5–6 import checkpoint; named demotion candidates below. **Materialised on 2026-08-18**, in the form the register did not anticipate: the budget was met on paper by closing milestones against unit tests instead of against the exit criteria. The countermeasure is M1.18's demonstration criterion, not a further demotion                                                           |
| R2 — import exposes model ambiguities                               | M1.4             | Front-load the import ahead of the UI                                                                                                                                                                                                                                                                                                                                                        |
| R3 — open-source work competes with features                        | M0.6             | One database adapter, one search implementation, one deployment path at launch                                                                                                                                                                                                                                                                                                               |
| R4 — bus factor of one                                              | M2.6             | Git export as human-readable backup; second maintainer before R3                                                                                                                                                                                                                                                                                                                             |
| R5 — semantic layer undefined                                       | M5.0             | Workshop before the end of R2; immutable IDs and `business_label` already shipped                                                                                                                                                                                                                                                                                                            |
| R6 — adoption                                                       | M1.8, M1.18      | Invest in the pre-publication diff; onboard on the first imported product before extending                                                                                                                                                                                                                                                                                                   |
| R7 — ~~hosted search dependency~~ **search adapter capability gap** | M0.3, M1.7       | Risk replaced rather than mitigated: the default adapter has no hosted dependency, so nothing leaks off-instance and nothing needs procurement. What remains is reduced capability — typo tolerance given up until REQ-FDN-022. The rebuild cost of a built-not-updated index is bounded by the O14 model: coalesced async rebuilds on the draft, publication-triggered rebuilds for readers |
| R8 — analytics API access not provisioned in time                   | M4.1             | Start provisioning during R2                                                                                                                                                                                                                                                                                                                                                                 |
| **R9 — agent import produces plausible-looking wrong data**         | M1.4, M1.18      | Script reviewed before it runs at scale; reconciliation counts checked against source; first product verified item-by-item before the remaining products                                                                                                                                                                                                                                     |
| **R10 — imported content lives in one unbacked SQLite file**        | M0.6             | File-level snapshot demonstrated in the reference stack; README states backup is the operator's job; git export closes it properly in R2                                                                                                                                                                                                                                                     |

**If R1 overruns**, demote in this order and no further. Every item below is genuinely scheduled in R1, so demoting it relieves R1:

| Order | Demote                                                                                                                          | From                 | What is lost                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [REQ-FDN-014](requirements/REQ-FDN.md#req-fdn-014--error-tracking-integration) error tracking                                   | Should, M1.11        | Troubleshooting early on is by log reading. Cheapest to lose, easiest to add back                                                                                                                                       |
| 2     | [REQ-API-006](requirements/REQ-API.md#req-api-006--mcp-resources-exposing-naming-guidelines) naming guidelines as MCP resources | Should, M1.3         | The agent writes without house conventions in context; imported content needs an editorial pass it would otherwise not need. Costs editor time across products, so prefer 1 first                                       |
| 3     | [REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable) tracking templates                    | Must, M1.16          | Editors create trackings by duplication ([REQ-AUTH-006](requirements/REQ-AUTH.md#req-auth-006--tracking-duplication-within-a-project)) instead. Slower per tracking and less consistent, but nothing becomes impossible |
| 4     | [REQ-DOM-007](requirements/REQ-DOM.md#req-dom-007--opt-in-propagation-of-module-changes) opt-in module propagation              | Must → Should, M1.16 | A module correction has to be reapplied by hand to existing trackings. Painful at pilot scale — this is the last resort, not the first                                                                                  |

> **[REQ-AUTH-004](requirements/REQ-AUTH.md#req-auth-004--mermaid-rendering-and-live-preview) briefly left this list on 2026-08-12** by being demoted to R2, then **returned to R1/M1.6 on 2026-08-17** when flows (REQ-NAV-003…007) moved into R1 and needed the renderer it delivers. It is again a shipped R1 feature rather than a demotion candidate.

**Do not demote** the import chain (M1.2–M1.4), the diff, selective publication, or the reconciliation report ([REQ-IMP-006](requirements/REQ-IMP.md#req-imp-006--reconciliation-report)) — the first three are load-bearing for the release criterion, and the fourth is the only mechanical check on agent-written content (risk R9).

**Nothing in the R1 completion chain (M1.11–M1.18) is a demotion candidate, and the list above is not extended into it.** M1.11–M1.14 are corrections, not features: demoting a correction means shipping the defect. M1.15–M1.17 are the release criterion itself — an R1 without an authoring UI is not a reduced R1, it is the position the project is already in. If the chain overruns, the release date moves; the content does not.

**Moved on 2026-08-17 (no longer a demotion candidate):** [REQ-DOM-017](requirements/REQ-DOM.md#req-dom-017--cdp-audience-entity) CDP Audience and [REQ-DOM-018](requirements/REQ-DOM.md#req-dom-018--survey-entity) Survey were removed from R1/M1.1 and scheduled for M2.7. They no longer sit on the R1 critical path, so this paragraph's warning about demoting them is moot; keeping them in R1 as a saving is no longer an option because they have already left.

> The previous version of this list named three candidates, two of which were parenthetically noted as already being in R2 — so it read as three options and was one. A demotion list is only useful if every entry is actually in the release it is meant to relieve.

> **R1 got harder, deliberately.** Dropping the bespoke importer removed roughly six requirements; adding the documented public API, MCP read and write tools, service tokens and idempotent upserts added ten. The trade is not about R1 velocity — it is that R1 now ends with permanent product capability rather than code that is dead after thirty runs, and that capability was already scheduled for R3. R1 was the release most at risk of overrunning before this change and it still is. Watch M1.2 closely: it is the milestone where "complete API" can quietly expand.

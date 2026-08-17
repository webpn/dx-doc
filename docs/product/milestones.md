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

**M1.1 (Tracking Data Model), M1.2 (Import-grade API), & M1.3 (MCP Server) are implemented.** Core R1 entities, composition invariants, Kysely repositories, REST endpoints, batch writers, reconciliation reports, service token auth, and the MCP Streamable HTTP server with read/write tools and naming guideline resources are all complete, tested, and validated. M1.4 (Agent-driven pilot import) is next.

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

> **R1 gate.** The import is complete and live. Two things must be recorded here and are not recoverable later:
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
```

Four things sit on the critical path and are worth protecting:

1. **M0.1 blocks everything.** It is a decision milestone with no code. It is also the cheapest place in the project to spend a week.
2. **M1.2 → M1.3 → M1.4 is now a three-milestone chain, and it is the longest one in R1.** The import cannot start until the API is complete and the MCP tools exist. This chain replaced a single self-contained importer milestone, and it is the main reason R1 got harder rather than easier ([ADR-0021](../adr/0021-agent-driven-migration.md)).
3. **M1.4 must not slip behind the UI.** Its value is diagnostic and it decays: an import that runs in week 6 can still change the data model, one that runs in week 8 cannot.
4. **M2.5 blocks all of R2's distribution.** Every export milestone depends on the non-leakage guarantee. Building exports first and retrofitting the rendering profile means auditing every artefact twice.

## Open decisions, by the milestone they gate

| Decision                                                     | Gates | Last responsible moment |
| ------------------------------------------------------------ | ----- | ----------------------- |
| O8 — developer-handoff reference patterns                    | M1.10 | End of R1               |
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
| R1 — Must set exceeds the R1 budget                                 | M1.4, M1.10      | Week 5–6 import checkpoint; named demotion candidates below                                                                                                                                                                                                                                                                                                                                  |
| R2 — import exposes model ambiguities                               | M1.4             | Front-load the import ahead of the UI                                                                                                                                                                                                                                                                                                                                                        |
| R3 — open-source work competes with features                        | M0.6             | One database adapter, one search implementation, one deployment path at launch                                                                                                                                                                                                                                                                                                               |
| R4 — bus factor of one                                              | M2.6             | Git export as human-readable backup; second maintainer before R3                                                                                                                                                                                                                                                                                                                             |
| R5 — semantic layer undefined                                       | M5.0             | Workshop before the end of R2; immutable IDs and `business_label` already shipped                                                                                                                                                                                                                                                                                                            |
| R6 — adoption                                                       | M1.8, M1.10      | Invest in the pre-publication diff; onboard on the first imported product before extending                                                                                                                                                                                                                                                                                                   |
| R7 — ~~hosted search dependency~~ **search adapter capability gap** | M0.3, M1.7       | Risk replaced rather than mitigated: the default adapter has no hosted dependency, so nothing leaks off-instance and nothing needs procurement. What remains is reduced capability — typo tolerance given up until REQ-FDN-022. The rebuild cost of a built-not-updated index is bounded by the O14 model: coalesced async rebuilds on the draft, publication-triggered rebuilds for readers |
| R8 — analytics API access not provisioned in time                   | M4.1             | Start provisioning during R2                                                                                                                                                                                                                                                                                                                                                                 |
| **R9 — agent import produces plausible-looking wrong data**         | M1.4, M1.10      | Script reviewed before it runs at scale; reconciliation counts checked against source; first product verified item-by-item before the remaining products                                                                                                                                                                                                                                     |
| **R10 — imported content lives in one unbacked SQLite file**        | M0.6             | File-level snapshot demonstrated in the reference stack; README states backup is the operator's job; git export closes it properly in R2                                                                                                                                                                                                                                                     |

**If R1 overruns**, demote in this order and no further. Every item below is genuinely scheduled in R1, so demoting it relieves R1:

| Order | Demote                                                                                                                          | From          | What is lost                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [REQ-FDN-014](requirements/REQ-FDN.md#req-fdn-014--error-tracking-integration) error tracking                                   | Should, M1.9  | Troubleshooting early on is by log reading. Cheapest to lose, easiest to add back                                                                                                                                       |
| 2     | [REQ-API-006](requirements/REQ-API.md#req-api-006--mcp-resources-exposing-naming-guidelines) naming guidelines as MCP resources | Should, M1.3  | The agent writes without house conventions in context; imported content needs an editorial pass it would otherwise not need. Costs editor time across products, so prefer 1 first                                       |
| 3     | [REQ-DOM-009](requirements/REQ-DOM.md#req-dom-009--tracking-template-editor-configurable) tracking templates                    | Must, M1.1    | Editors create trackings by duplication ([REQ-AUTH-006](requirements/REQ-AUTH.md#req-auth-006--tracking-duplication-within-a-project)) instead. Slower per tracking and less consistent, but nothing becomes impossible |
| 4     | [REQ-DOM-007](requirements/REQ-DOM.md#req-dom-007--opt-in-propagation-of-module-changes) opt-in module propagation              | Must → Should | A module correction has to be reapplied by hand to existing trackings. Painful at pilot scale — this is the last resort, not the first                                                                                  |

> **[REQ-AUTH-004](requirements/REQ-AUTH.md#req-auth-004--mermaid-rendering-and-live-preview) briefly left this list on 2026-08-12** by being demoted to R2, then **returned to R1/M1.6 on 2026-08-17** when flows (REQ-NAV-003…007) moved into R1 and needed the renderer it delivers. It is again a shipped R1 feature rather than a demotion candidate.

**Do not demote** the import chain (M1.2–M1.4), the diff, selective publication, or the reconciliation report ([REQ-IMP-006](requirements/REQ-IMP.md#req-imp-006--reconciliation-report)) — the first three are load-bearing for the release criterion, and the fourth is the only mechanical check on agent-written content (risk R9).

**Moved on 2026-08-17 (no longer a demotion candidate):** [REQ-DOM-017](requirements/REQ-DOM.md#req-dom-017--cdp-audience-entity) CDP Audience and [REQ-DOM-018](requirements/REQ-DOM.md#req-dom-018--survey-entity) Survey were removed from R1/M1.1 and scheduled for M2.7. They no longer sit on the R1 critical path, so this paragraph's warning about demoting them is moot; keeping them in R1 as a saving is no longer an option because they have already left.

> The previous version of this list named three candidates, two of which were parenthetically noted as already being in R2 — so it read as three options and was one. A demotion list is only useful if every entry is actually in the release it is meant to relieve.

> **R1 got harder, deliberately.** Dropping the bespoke importer removed roughly six requirements; adding the documented public API, MCP read and write tools, service tokens and idempotent upserts added ten. The trade is not about R1 velocity — it is that R1 now ends with permanent product capability rather than code that is dead after thirty runs, and that capability was already scheduled for R3. R1 was the release most at risk of overrunning before this change and it still is. Watch M1.2 closely: it is the milestone where "complete API" can quietly expand.

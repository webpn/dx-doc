# Delivery Milestones

Breaks the release roadmap ([functional specification §20](functional-specification.md)) into numbered, individually verifiable milestones. Each milestone names the requirements it delivers, what it depends on, which open decisions gate it, and how it is judged complete.

**Related:** [requirements index](requirements/README.md) · [scope](scope.md) · [vision](vision.md) · [ADRs](../adr/) · [testing strategy](../testing/strategy.md)

## How to read this

| Field | Meaning |
|---|---|
| **Goal** | The one thing this milestone makes true. |
| **Delivers** | Requirement IDs completed by this milestone. See [requirements](requirements/README.md). |
| **Depends on** | Milestones that must be complete first. |
| **Gated by** | Open decisions (spec §21) that must be closed before the milestone starts. |
| **Exit** | Observable, testable condition. A milestone is not done until this is demonstrated. |

Milestone IDs are `M<release>.<sequence>`. They are stable: a milestone that slips keeps its ID and moves release, it is never renumbered.

**Definition of Done** (applies to every milestone, in addition to its own exit criterion): code merged to `main`; unit and integration tests per the [testing strategy](../testing/strategy.md); requirement rows updated in the relevant `REQ-*.md` file with Issue/PR links and status; any decision taken during the work recorded as an ADR or in [decisions](../decisions/README.md).

---

## Current position

**Pre-R0.** The repository holds documentation, configuration and empty layer barrels (`src/*/index.ts`). No framework is chosen, no persistence exists, and `package.json` scripts for `dev`, `build`, `test` and `db:migrate` are placeholders. M0.1 is therefore the first executable milestone and it is a decision milestone, not a coding one.

---

## R0 — Foundations

*Target: weeks 1–2. No user-visible value; determines the cost of everything after it.*

### M0.1 — Close the stack decisions

**Goal:** every technology choice needed to write the first line of production code is recorded and accepted.

**Delivers:** REQ-FDN-001

Accept or supersede the pending ADRs: [0011 UI library](../adr/0011-ui-library-selection.md), [0012 data fetching](../adr/0012-data-fetching-strategy.md), [0013 state management](../adr/0013-state-management.md), [0014 configuration split](../adr/0014-configuration-split.md), [0015 schema migrations](../adr/0015-schema-migration-strategy.md), [0017 testing](../adr/0017-testing-strategy.md). Replace the placeholder `package.json` scripts with real ones.

**Gated by:** O6 (environment variable matrix), O10 (instance vs company configuration split), O7 (upgrade and migration strategy for third-party installs)

**Exit:** `npm run dev`, `npm run build`, `npm run test` and `npm run typecheck` all execute real work. Decisions D1–D6 in [decisions](../decisions/README.md) are marked Accepted with their ADRs.

### M0.2 — Persistence foundation

**Goal:** a schema exists, migrates forward reproducibly, and enforces tenancy and identity at the storage layer.

**Delivers:** REQ-FDN-002, REQ-FDN-003, REQ-FDN-004, REQ-FDN-005, REQ-FDN-009, REQ-FDN-020

Repository ports owned by the domain, with a **SQLite adapter** as the default and only implementation through R1 ([ADR-0020](../adr/0020-database-portability.md)). Schema v1 covering Company, Project (with grouping labels), User, Role, ProjectGrant, and an empty Page, plus the `external_ref` column that makes migration idempotent (REQ-MIG-003). Immutable internal identifiers on every entity, distinct from name and slug. Forward-only versioned migrations run at start-up, written in the portable SQL subset from the first file.

**Depends on:** M0.1

**Exit:** a fresh database reaches schema v1 by running migrations alone; re-running is a no-op; every table carries `company_id` (or reaches it through its project) and an immutable `id` independent of any mutable field; the SQLite adapter provably sets `PRAGMA foreign_keys = ON` on every connection.

> The portable-SQL constraint (REQ-FDN-020) is unenforceable by the build until a second adapter exists in R2, so it needs review discipline now. Every dialect-specific shortcut taken here is paid for twice in M2.8.

### M0.3 — Ports and adapters

**Goal:** storage, search and configuration are reachable through interfaces with exactly one implementation each.

**Delivers:** REQ-FDN-006, REQ-FDN-007, REQ-FDN-008, REQ-FDN-013

S3-compatible object storage behind a port. Algolia search behind a port, with the single-index-plus-`project_id`-facet design and server-side scoped key generation. Environment-variable configuration loader with validation at boot.

**Depends on:** M0.1

**Gated by:** O6, O10

**Exit:** the application refuses to start with a missing required variable and names it; an integration test substitutes an in-memory storage adapter without touching application-layer code; no search key is ever generated client-side.

### M0.4 — Authentication and authorisation

**Goal:** who a user is, and which projects they may touch, is enforced in one place.

**Delivers:** REQ-SEC-001, REQ-SEC-002, REQ-SEC-003, REQ-SEC-011

Email + password login. Four global roles. Explicit per-project grants. Permission checks enforced server-side against [Appendix B](functional-specification.md).

**Depends on:** M0.2

**Exit:** every row of the permission matrix has a passing test, including the negative case — a user without a grant cannot read the project through any entry point.

### M0.5 — REST API and shared validation

**Goal:** the API is the single entry point, and validation lives behind it.

**Delivers:** REQ-API-001, REQ-FDN-010

CRUD for Company, Project and Page. Validation rules defined once in the domain/application layers and invoked by every entry point. Write endpoints accept `external_ref` from the outset.

**Depends on:** M0.3, M0.4

**Exit:** creating a Project with an invalid payload fails identically through the HTTP API and through a direct application-service call; no validation rule is implemented in a UI component; a write repeated with the same `external_ref` updates rather than duplicates.

> `external_ref` is here rather than in R1 because retrofitting it means reworking every write endpoint — and from M1.2 onward every endpoint is one an agent will drive.

### M0.6 — Public repository readiness

**Goal:** a third party can stand up an instance without asking anyone.

**Delivers:** REQ-FDN-011, REQ-FDN-012

MIT licence, README with setup instructions, reference deployment stack (compose file with S3-compatible storage — no database container needed with SQLite), CI running lint, typecheck and tests.

**Depends on:** M0.5

**Exit:** a clean machine following the README alone reaches a running instance in one command; CI is green on `main`; the reference stack demonstrates a file-level snapshot of the SQLite database and the README states plainly that backup is the operator's job.

> **R0 gate.** A user can create a company, a project and an empty page. The repository is public and a third party can stand up an instance from the README.

---

## R1 — MVP: parity plus versioning

*Target: weeks 3–8. The entire Must set. This is the release that retires the legacy wiki for the pilot product.*

### M1.1 — Tracking data model

**Goal:** every R1 entity exists, persists, and enforces its composition rules.

**Delivers:** REQ-DOM-001 … REQ-DOM-011, REQ-DOM-015 … REQ-DOM-019, REQ-DOM-027, REQ-DOM-028, REQ-SEC-010

Page, Tracking, DataLayerProperty (full attribute set including `presence`, `business_label`, `object` type with parent-child paths), Module, TrackingTemplate, SpecificValue, Destination with N:N mapping and `destination_name_override`, CdpAudience, Survey, FreePage, company catalogue with copy-on-creation.

**Depends on:** M0.5

**Gated by:** O11 (whether *manage company catalogue* is a permission flag or a fifth role)

**Exit:** the composition rules hold under test — removing the last module-supplied property from a tracking detaches the module and warns; a module edit does not reach existing trackings unless propagation is explicitly requested; no entity can reference an entity in another project.

### M1.2 — Migration-grade API

*Target: week 4.*

**Goal:** everything in the product is reachable and idempotently writable by a machine.

**Delivers:** REQ-MIG-001, REQ-MIG-002, REQ-MIG-003, REQ-MIG-004, REQ-MIG-005, REQ-MIG-006, REQ-API-002, REQ-API-009

Every R1 entity creatable, readable and updatable through the API. Idempotent upsert on `external_ref`. Asset upload. Batch write endpoints. Reconciliation report. Documented public API contract, generated from the implementation. Service-account tokens.

**Depends on:** M1.1

**Exit:** the pilot product can be constructed through the API alone, with the UI never opened — this single test is the acceptance criterion for the whole milestone; a script written against the published documentation, with no reading of Platform source, succeeds.

> The Platform ships **no source-format-specific code** ([ADR-0021](../adr/0021-agent-driven-migration.md)). Every requirement here has post-migration value; none of it is throwaway. That is the trade that justified dropping the bespoke importer.

### M1.3 — MCP server

*Target: week 5.*

**Goal:** an agent can inspect the Platform, write into it, and verify its own work.

**Delivers:** REQ-API-003, REQ-API-004, REQ-API-006

Read tools over the R1 entity set plus the reconciliation report. Write tools covering the full R1 entity set, draft-only. Naming and documentation guidelines exposed as MCP resources.

**Depends on:** M1.2

**Exit:** an agent creates a tracking with modules, properties and specific values, reads it back, and cannot publish a version through any tool — publication, user deletion and permission changes have no MCP tool at all, rather than being permission-checked.

### M1.4 — Agent-driven pilot import

*Target: weeks 5–6.*

**Goal:** the data model is validated against years of accumulated real usage, while there is still time to change it.

**Delivers:** REQ-MIG-007

Claude reads the pilot product's legacy export from the filesystem, explores its structure, and writes a migration script. The script is reviewed, committed, and run against real pilot data.

**Depends on:** M1.3

**Exit:** the full pilot content exists in dx-doc; the reconciliation report is reviewed against the source by an editor; running the script twice produces no duplicates; every model ambiguity the migration exposed is either fixed or written down as an accepted limitation.

> **Scheduled at week 5–6, deliberately ahead of a complete UI.** This is the mitigation for risks R1 and R2 in the [risk register](functional-specification.md), and its logic is unchanged from the importer it replaces: it is the only test that measures the data model against reality, and it must happen while the model is still cheap to change. It now does double duty — a gap in the API surface shows up here as something the agent cannot create. Do not reorder it behind the authoring UI.
>
> **The deliverable is a committed script, not an agent session.** An agent may quietly coerce unanticipated input into something that looks right, where a parser would have failed loudly. Three mitigations, none optional: the script is reviewed before it runs at scale, reconciliation counts are checked against the source, and the first product is verified item-by-item at M1.10 before the remaining ~29 follow.

### M1.5 — Authoring

**Goal:** an editor can write everything the legacy wiki held.

**Delivers:** REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-005, REQ-AUTH-006

Markdown editor with the full block set and Mermaid live preview. Image upload by drag-and-drop and clipboard paste, 10 MB cap, resize to 2000 px. Free pages with the publishable flag. Optimistic concurrency with stale-write rejection. Tracking duplication.

**Depends on:** M1.1

**Exit:** a tracking authored in the Platform is indistinguishable in content from its legacy-wiki equivalent; two editors opening the same record produce a rejected save with a clear conflict message, not a silent overwrite.

### M1.6 — Structure and navigation

**Goal:** a large tracking plan can be explored.

**Delivers:** REQ-NAV-001, REQ-NAV-002

Page hierarchy driving a navigable sidebar. Automatic per-page recap of every attached tracking with its specific values.

**Depends on:** M1.1

**Exit:** the pilot product's hierarchy is navigable end to end; opening any page answers "what is tracked here?" without further clicks.

### M1.7 — Search

**Goal:** the most frequent lookup — which tracking sets this value — is answerable.

**Delivers:** REQ-AUTH-007, REQ-SEC-012

Project-scoped full-text and fuzzy search. Property and tracking names ranked above other text. Specific values indexed. Non-publishable free pages excluded from the index.

**Depends on:** M0.3, M1.1

**Exit:** searching a literal specific value returns the trackings that set it; a page marked non-publishable is provably absent from the index; a user without a grant on a project gets no hits from it.

### M1.8 — Versioning and publication

**Goal:** the capability the legacy wiki never had.

**Delivers:** REQ-VER-001 … REQ-VER-007

Single draft stream. Unpublished-changes indicator. Selective publication excluding individual trackings and pages. Version metadata. Diff at entity, property and specific-value granularity with text diff on rich content. Automatically generated changelog. Full historical consultation.

**Depends on:** M1.1

**Exit:** publishing produces a changelog nobody wrote by hand; an excluded tracking is absent from the version and present in the draft; a published tracking never references an unpublished property.

### M1.9 — Access and consultation

**Goal:** readers can use the Platform, and writes are accountable.

**Delivers:** REQ-SEC-004, REQ-SEC-005, REQ-SEC-006, REQ-VIEW-001, REQ-VIEW-002, REQ-FDN-014

OIDC SSO. Project shared-password access with optional expiry. Append-only audit log of write events with 24-month retention. In-app read-only view. Analyst/Business and Development view selector as a presentation filter. Error-tracking integration.

**Depends on:** M0.4, M1.8

**Exit:** a reader reaches a project through SSO and through a shared password; every write event named in spec §17.4 produces an audit entry; the view selector changes presentation only — it is documented and tested as not being a security boundary.

### M1.10 — Pilot cutover

**Goal:** the release criterion is met, not approximated.

**Delivers:** REQ-MIG-008 — otherwise the acceptance milestone for R1.

Final migration run, **item-by-item editorial verification of the first product**, editor onboarding, freeze of the legacy wiki to read-only. A human publishes version 1 — agents cannot (REQ-API-004).

**Depends on:** M1.4, M1.5, M1.6, M1.7, M1.8, M1.9

**Gated by:** O12 (self-hostable search adapter before public release), O13 (confirm the bulk-operation list from what was actually done by hand during migration), O8 (developer-handoff reference review)

**Exit:** the pilot product's documentation is fully migrated and verified item-by-item; an editor works a full week without returning to the legacy wiki; version 1 is published with an automatically generated changelog.

> **R1 gate.** The pilot is migrated and live. Two things must be recorded here and are not recoverable later:
>
> - **O13's answer.** The operations editors performed by hand during this migration are the evidence base for R2's bulk operations.
> - **Whether the migration script generalises.** The pilot is one of ~30 products documented against a template that drifted over years. If the script needed heavy per-product adaptation, that is the signal that the remaining products are a longer job than one script run each — and it is worth knowing before committing to a schedule for them.

---

## R2 — Navigation and distribution

*Target: months 3–4. The release that lets people outside the tool consume the documentation.*

### M2.1 — Structured expression

**Delivers:** REQ-DOM-012, REQ-DOM-013, REQ-DOM-014, REQ-DOM-022, REQ-DOM-023

Structured property conditions (four operators plus note), conditions on nested property paths, company-defined custom fields, `derived_from`, non-blocking naming and format warnings.

**Depends on:** M1.1 · **Gated by:** O3 (how "read this in the analytics platform" is structured)

**Exit:** a conditional valorisation authored in R1 as prose can be re-expressed structurally without data loss; a condition on `product.characteristics.colour` displays its full path.

### M2.2 — Flows

**Delivers:** REQ-NAV-003 … REQ-NAV-007

Flow entity; Trigger nodes distinct from purely visual Page→Page connections; directed graph with labels and descriptive conditions; automatic Mermaid generation; sidebar exposing flows alongside the hierarchy.

**Depends on:** M1.6

**Exit:** a navigation-bar action with five source pages and no destination is modelled without a special case; the diagram is generated, not written.

### M2.3 — Image annotations

**Delivers:** REQ-AUTH-014

Point and region annotations stored as a separate JSON layer over a preserved original, nestable, linkable to a Trigger or Tracking.

**Depends on:** M1.5, M2.2

**Exit:** an annotation survives re-editing; a region containing a nested region expresses container-level and item-level interactions distinctly.

### M2.4 — Bulk operations

**Delivers:** REQ-AUTH-010, REQ-API-008

Add/remove/swap module, add/remove property, set presence, change page attachment, archive — applied to a tracking multi-selection with a preview, a single audit entry, and API/MCP exposure restricted to explicit identifier lists.

**Depends on:** M1.1 · **Gated by:** O13

**Exit:** every operation shows the affected items before applying; no API path accepts a filter expression as the operation target; results appear in the publication diff like any other edit.

### M2.5 — Profile-aware rendering

**Delivers:** REQ-VIEW-003

The rendering engine that physically omits excluded content from generated artefacts, with a non-leakage guarantee. **Prerequisite for every export milestone below** — build it first.

**Depends on:** M1.8

**Exit:** a development-view artefact contains no destination, no `tag_manager`-sourced property, no analysis note, no audience and no survey — verified by scanning generated output, not by inspecting the template.

### M2.6 — Distribution channels

**Delivers:** REQ-VIEW-004, REQ-VIEW-005, REQ-VIEW-006, REQ-VIEW-007, REQ-VIEW-008

Per-project static site regenerated on publication; git export with one commit per publication attributed to the publishing editor; PDF export of a version's changes; Excel export of properties; development-filtered changelog.

**Depends on:** M2.5

**Exit:** publication regenerates the static site and produces exactly one commit; no artefact contains content from a non-publishable free page.

### M2.7 — Editorial depth

**Delivers:** REQ-VER-008, REQ-VER-009, REQ-VER-010, REQ-AUTH-008, REQ-AUTH-009, REQ-AUTH-012, REQ-AUTH-013, REQ-DOM-020, REQ-DOM-024, REQ-DEV-001

Full rollback; publication email notifications with per-project subscription; page and flow duplication; cross-project tracking copy with guided mapping; per-element change history; global script-instruction template with project placeholders; project-scoped impact analysis; selective adoption of company-catalogue module changes; **agent-vs-human attribution in the diff**.

**Depends on:** M1.8, M2.2

**Exit:** impact analysis answers "what references this property?" before any deprecation; a rollback restores a prior version in full; an agent's edit is visibly distinguishable from an editor's in the publication diff.

> Attribution moved here from R3. With MCP write tools in R1, agents and humans share a draft from R1 onward, and the publication diff is the only review gate — it has to show which is which.

### M2.8 — Platform hardening

**Delivers:** REQ-SEC-007, REQ-SEC-008, REQ-SEC-009, REQ-FDN-015, REQ-FDN-018, REQ-FDN-019

SAML SSO; audit log UI as a paginated list with CSV export; project archive and restore; per-company branding. **MariaDB and PostgreSQL adapters** ([ADR-0020](../adr/0020-database-portability.md)), plus the dialect test matrix that verifies them.

**Depends on:** M1.9, M0.2

**Exit:** a project can be archived and restored with no data loss; projects cannot be hard-deleted through any entry point; the full repository and migration suite runs unchanged on SQLite, MariaDB and PostgreSQL, with no test skipped on any dialect.

> This is where the portable-SQL constraint (REQ-FDN-020) stops being free. A dialect-specific shortcut taken in M0.2 surfaces here as a migration that has to be rewritten and a schema that has to be changed under existing data. The constraint is cheap to hold in R0 and expensive to recover in R2.

> **R2 gate.** External stakeholders consult the documentation without an account in the application.
>
> **Before R2 closes:** hold the semantic-layer workshop and close O1 and O2. They are the last responsible moment, and R5 cannot be scoped without them.

---

## R3 — Developer handoff, API and MCP

*Target: months 5–6.*

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

### M3.3 — Public API — *moved to [M1.2](#m12--migration-grade-api)*

The documented public API is no longer an R3 deliverable. Migration is written against it, so it ships in R1. The ID is retained rather than reused, so that anything referring to "M3.3" resolves to this note instead of silently pointing at different work.

### M3.4 — Interactive agent access

**Delivers:** REQ-API-005, REQ-API-010

OAuth with user consent for interactive MCP clients — analysts' assistants and developers' IDEs — and the richer read tools that R1 could not carry because their subject matter did not exist yet: flow and trigger structure (R2), changelog between two versions, impact analysis (R2), property detail enriched with data-quality status (R4).

**Depends on:** M2.2, M2.7

**Exit:** an analyst queries the documentation from their own AI assistant, authenticated by consent rather than a shared token, and sees exactly what their project grants allow.

> **Most of this milestone moved to R1.** The MCP server itself, its write tools, the documented public API and the naming-guideline resources are all M1.2–M1.3 now, because migration depends on them ([ADR-0021](../adr/0021-agent-driven-migration.md)). What remains here is the part migration never needed: interactive consent, and read tools over capabilities that only exist from R2 onward.

### M3.5 — Containers and conveniences

**Delivers:** REQ-DOM-025, REQ-DOM-026, REQ-NAV-008, REQ-AUTH-011, REQ-AUTH-015, REQ-VER-011, REQ-DEV-006

Extension, Segment and Calculated Metric as containers; recurring-custom-property standardisation hint; visual drag-and-drop graph editor; individual item archive and restore; whole-project duplication; selective rollback; dashboard and KPI links.

**Depends on:** M2.2 · **Gated by:** O9 (whether the container entities need real attributes before R5)

> **R3 gate.** A developer receives everything they need without manual intervention; an analyst queries the documentation from an AI assistant.

---

## R4 — Data quality and verification

*Target: months 7–8.*

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

## R5 — Semantic layer

*Target: months 9+. Scope pending.*

### M5.0 — Ontology definition

**Goal:** close O1 and O2. **This milestone must complete before the end of R2**, not at the start of R5 — everything in R5 is unscopeable until it does, and the R0/R1 precautions (immutable IDs, `business_label`, custom fields) only defer the cost, they do not remove it.

### M5.1 — Semantic exports

OWL, RDF and ISO 25964/SKOS exports; business metrics and dimensions; certified segments; business glossary.

**Depends on:** M5.0 — scope undefined until then. No requirement IDs are assigned yet, deliberately.

---

## R6 — Lifecycle and insights

### M6.1 — Tracking implementation status

Lifecycle state per tracking (documented → in development → released → verified → deprecated), giving R4's conformance results somewhere to persist.

### M6.2 — Insights repository

Treated as a separate product on the same foundation. Not scoped here.

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
2. **M1.2 → M1.3 → M1.4 is now a three-milestone chain, and it is the longest one in R1.** The migration cannot start until the API is complete and the MCP tools exist. This chain replaced a single self-contained importer milestone, and it is the main reason R1 got harder rather than easier ([ADR-0021](../adr/0021-agent-driven-migration.md)).
3. **M1.4 must not slip behind the UI.** Its value is diagnostic and it decays: a migration that runs in week 6 can still change the data model, one that runs in week 8 cannot.
4. **M2.5 blocks all of R2's distribution.** Every export milestone depends on the non-leakage guarantee. Building exports first and retrofitting the rendering profile means auditing every artefact twice.

## Open decisions, by the milestone they gate

| Decision | Gates | Last responsible moment |
|---|---|---|
| O6 — environment variable matrix | M0.1, M0.3 | Immediately |
| O10 — instance vs company configuration split | M0.1, M0.3 | Immediately |
| O7 — upgrade and schema-migration strategy | M0.1 | End of R0 |
| O11 — *manage company catalogue* permission vs role | M1.1 | Start of R1 |
| O12 — self-hostable search adapter before public release | M1.10 | End of R1 |
| O13 — bulk-operation list completeness | M1.10, M2.4 | End of R1 |
| O8 — developer-handoff reference patterns | M1.10 | End of R1 |
| O3 — structured "how to read this in the analytics platform" | M2.1 | Start of R2 |
| O1 — semantic layer ontology, IRIs, export formats | M5.0 | End of R2 |
| O2 — business glossary | M5.0 | End of R2 |
| O9 — container entity attributes | M3.5 | Start of R3 |
| O4 — data quality vs unstructured placeholders | M4.2 | Start of R4 |
| O5 — verification module scope | M4.1 | Start of R4 |

## Risk mitigations owned by milestones

| Risk (spec §22) | Owning milestone | Mitigation |
|---|---|---|
| R1 — Must set exceeds the R1 budget | M1.4, M1.10 | Week 5–6 migration checkpoint; named demotion candidates below |
| R2 — pilot migration exposes model ambiguities | M1.4 | Front-load the migration ahead of the UI |
| R3 — open-source work competes with features | M0.6 | One database adapter, one search implementation, one deployment path at launch |
| R4 — bus factor of one | M2.6 | Git export as human-readable backup; second maintainer before R3 |
| R5 — semantic layer undefined | M5.0 | Workshop before the end of R2; immutable IDs and `business_label` already shipped |
| R6 — adoption | M1.8, M1.10 | Invest in the pre-publication diff; onboard on the pilot before extending |
| R7 — hosted search dependency | M0.3 | Server-side scoped keys; non-publishable pages excluded from the index |
| R8 — analytics API access not provisioned in time | M4.1 | Start provisioning during R2 |
| **R9 — agent migration produces plausible-looking wrong data** | M1.4, M1.10 | Script reviewed before it runs at scale; reconciliation counts checked against source; first product verified item-by-item before the remaining ~29 |
| **R10 — pilot content lives in one unbacked SQLite file** | M0.6 | File-level snapshot demonstrated in the reference stack; README states backup is the operator's job; git export closes it properly in R2 |

**If R1 overruns**, demote in this order and no further: the audit-log UI (REQ-SEC-008, already R2), non-blocking validation warnings (REQ-DOM-023, already R2), then opt-in module propagation (REQ-DOM-007) from Must to Should. Do not demote the migration chain (M1.2–M1.4), the diff, or selective publication — each is load-bearing for the release criterion.

> **R1 got harder, deliberately.** Dropping the bespoke importer removed roughly six requirements; adding the documented public API, MCP read and write tools, service tokens and idempotent upserts added ten. The trade is not about R1 velocity — it is that R1 now ends with permanent product capability rather than code that is dead after thirty runs, and that capability was already scheduled for R3. R1 was the release most at risk of overrunning before this change and it still is. Watch M1.2 closely: it is the milestone where "complete API" can quietly expand.

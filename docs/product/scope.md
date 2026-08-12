# Product Scope

Defines what is in scope, out of scope, and deferred. References: [`functional-specification.md`](functional-specification.md), [`vision.md`](vision.md), [`user-stories.md`](user-stories.md).

**If you are looking for what R1 must do**, read [What R1 parity means](#what-r1-parity-means) rather than this page's feature lists. That section is the enumerated definition; everything else here is scope boundary.

## What R1 parity means

R1 is described elsewhere as *"parity plus versioning"*. **Parity is not "whatever the legacy wiki did"** — that phrasing is unfalsifiable, and it is the reason this section exists. Parity means the enumerated list below: every capability the legacy documentation template provided, matched to the requirement that replaces it. R1 is at parity when every row is satisfied, and not before.

The list is derived from the legacy template's own authoring guidelines. **It is a checklist, not a survey of what products actually contain** — the template drifted over years of use across ~30 products, so the item-by-item verification at [M1.10](milestones.md) is what confirms it, and anything found there that is missing from this table belongs in this table.

### Document structure, per product

| The legacy template provided | dx-doc replaces it with | Requirement |
|---|---|---|
| A standard template duplicated for each new product | Company catalogue copied into a project at creation | [REQ-DOM-019](requirements/REQ-DOM.md) |
| A project icon matching the tracked product's logo | Project `icon` attribute | [REQ-FDN-003](requirements/REQ-FDN.md) |
| Table names prefixed with the product name to avoid collisions | **Obsolete.** Entities are project-scoped, so collisions are impossible by construction and no prefix is needed | [REQ-DOM-028](requirements/REQ-DOM.md) |

### The five template sections

| The legacy template provided | dx-doc replaces it with | Requirement |
|---|---|---|
| **Data Layer overview** — what the data layer is and how it must be populated, with implementation guidance varying by web / native app / Flutter | Free page; the platform-specific variation is carried by the project's `platform` attribute | [REQ-AUTH-003](requirements/REQ-AUTH.md), [REQ-FDN-003](requirements/REQ-FDN.md) |
| **Script/SDK integration instructions** — naming the tag-manager profile and the per-product tracking IDs for the analytics, survey and session-replay tools | Free page in R1; company-level template with per-project placeholders in R2 | [REQ-AUTH-003](requirements/REQ-AUTH.md) → [REQ-AUTH-013](requirements/REQ-AUTH.md) |
| **Tracking list** — the documentation proper, as a page tree | Page hierarchy driving a navigable sidebar | [REQ-NAV-001](requirements/REQ-NAV.md) |
| **Changelog** — full history of changes with references to the elements updated, maintained by hand | Generated from the diff, per publication | [REQ-VER-005](requirements/REQ-VER.md), [REQ-VER-006](requirements/REQ-VER.md) |
| **References** — a service page visible only to the documentation team: development contacts, wireframe and functional-analysis links, test URLs, test app links, test credentials | Free page marked non-publishable, enforced across every index and output channel | [REQ-AUTH-003](requirements/REQ-AUTH.md), [REQ-SEC-012](requirements/REQ-SEC.md) |

### The structured tables

| The legacy template provided | dx-doc replaces it with | Requirement |
|---|---|---|
| **Pages / Screens**, with CMS-driven content catalogued as generic page templates rather than instances | Page entity, same rule | [REQ-DOM-001](requirements/REQ-DOM.md) |
| A short behavioural description per page, with supporting screenshots | Page description and image upload | [REQ-DOM-001](requirements/REQ-DOM.md), [REQ-AUTH-001](requirements/REQ-AUTH.md), [REQ-AUTH-002](requirements/REQ-AUTH.md) |
| **Trackings**, each with a speaking name | Tracking entity | [REQ-DOM-002](requirements/REQ-DOM.md) |
| — attached to a page, creatable inline while editing the tracking | Page attachment | [REQ-DOM-002](requirements/REQ-DOM.md) |
| — a navigation event: screen view, popup view, element click, form submission, user error | Navigation event, held as data rather than a hard-coded enum so the list can grow | [REQ-DOM-002](requirements/REQ-DOM.md) |
| — a list of modules | Module attachment | [REQ-DOM-006](requirements/REQ-DOM.md) |
| — specific values | Specific values, placeholders preserved verbatim | [REQ-DOM-010](requirements/REQ-DOM.md) |
| **Modules** — reusable bundles of data layer properties | Module entity, project-scoped, not nestable | [REQ-DOM-006](requirements/REQ-DOM.md) |
| **Data Layer Properties**, with standard ones present by default and custom ones added with name, an exhaustive description of content and data source, and example values | DataLayerProperty with the full attribute set, seeded from the catalogue | [REQ-DOM-003](requirements/REQ-DOM.md), [REQ-DOM-019](requirements/REQ-DOM.md) |
| **Specific valorisations** | SpecificValue entity | [REQ-DOM-010](requirements/REQ-DOM.md) |
| **Analytics variables** and **analytics events** as two separate tables, mapped to properties | A single Destination entity with N:N mapping and a per-mapping name override — covering Adobe, CJA, GA4 and PostHog rather than one platform | [REQ-DOM-015](requirements/REQ-DOM.md), [REQ-DOM-016](requirements/REQ-DOM.md) |
| A note field on each variable for analysis guidance | `analysis_notes`, plus a per-destination note | [REQ-DOM-003](requirements/REQ-DOM.md), [REQ-DOM-015](requirements/REQ-DOM.md) |
| The property's description shown automatically in the variable table | Rendered from the relationship, never copied | [REQ-DOM-015](requirements/REQ-DOM.md) |
| Tag-manager processing recorded per variable — which extensions manipulate the value, and under what conditions | Per-destination note in R1; Extension entity from R3 | [REQ-DOM-015](requirements/REQ-DOM.md) → [REQ-DOM-025](requirements/REQ-DOM.md) |

### Authoring behaviours

| The legacy template provided | dx-doc replaces it with | Requirement |
|---|---|---|
| Creating a tracking pre-seeded with defaults, separately for a page load and for a user action | Tracking Template, editor-configurable with no software release | [REQ-DOM-009](requirements/REQ-DOM.md) |
| Specific values auto-proposed on creation — `page_name` for page views; `action_effect`, `action_detail`, `action_name` for user actions | Template default specific values — the two legacy templates are expressible as instances of this mechanism, with no hard-coded behaviour left | [REQ-DOM-009](requirements/REQ-DOM.md) |
| Duplicating an existing tracking | Tracking duplication, fully independent copy | [REQ-AUTH-006](requirements/REQ-AUTH.md) |
| Grouping multi-page processes under a container page with an overall description and a hand-drawn flow diagram | R1: page hierarchy plus hand-written Mermaid. R2: Flow entity with a diagram generated from the graph | [REQ-AUTH-004](requirements/REQ-AUTH.md) → [REQ-NAV-003](requirements/REQ-NAV.md) … [REQ-NAV-006](requirements/REQ-NAV.md) |

### Data layer conventions the guidelines imposed

These were prose rules a human had to remember. In R1 they are documented and machine-readable; enforcement as non-blocking warnings arrives in R2.

| The legacy guidelines required | dx-doc | Requirement |
|---|---|---|
| Property names lowercase, underscore-separated | R1: retrievable by agents as an MCP resource. R2: non-blocking warning | [REQ-API-006](requirements/REQ-API.md) → [REQ-DOM-023](requirements/REQ-DOM.md) |
| Booleans as `si`/`no`; timestamps ISO 8601; environment `dev`/`qa`/`prod`; `,` as macro separator and `\|` for sub-properties | as above | [REQ-API-006](requirements/REQ-API.md) → [REQ-DOM-023](requirements/REQ-DOM.md) |
| Speaking names; generic properties qualified by context preferred over scope-specific ones; names like *category* or *type* avoided | **Deliberately not automated** — recorded as a human review responsibility | [REQ-DOM-023](requirements/REQ-DOM.md) |
| Identifiers documented precisely: who produces them, how they are used, collected in clear text, hashed downstream by the tag manager with a per-destination algorithm | `hashing_policy` plus the description and `data_source` attributes | [REQ-DOM-003](requirements/REQ-DOM.md) |
| Data layer and analytics mapping kept coherent between a product's web and app versions | Manual through R3; advisory, read-only alignment report in R4 | [REQ-DOM-021](requirements/REQ-DOM.md) |

### What R1 adds beyond parity

Everything above is replacement. These are the capabilities the legacy wiki never had, and they are why R1 is *"parity **plus versioning**"*:

- Draft → published versioning, selective publication, and an automatically generated diff and changelog ([REQ-VER-001](requirements/REQ-VER.md) … [REQ-VER-007](requirements/REQ-VER.md))
- Search over specific values, so *"which tracking sets this value?"* is answerable ([REQ-AUTH-007](requirements/REQ-AUTH.md))
- Analyst/Business and Development audience views ([REQ-VIEW-002](requirements/REQ-VIEW.md))
- A complete API and MCP surface — anything doable in the UI is doable by a machine ([REQ-API-001](requirements/REQ-API.md) … [REQ-API-004](requirements/REQ-API.md))
- Read access without a licensed account, via project shared passwords ([REQ-SEC-005](requirements/REQ-SEC.md))
- An append-only audit log ([REQ-SEC-006](requirements/REQ-SEC.md))
- CDP audiences and feedback surveys as first-class entities ([REQ-DOM-017](requirements/REQ-DOM.md), [REQ-DOM-018](requirements/REQ-DOM.md))

### What R1 deliberately does not carry over

- **Conditional valorisations in any form.** The legacy wiki expressed these in prose; R1 has no mechanism at all, and the structured form arrives in R2 ([REQ-DOM-011](requirements/REQ-DOM.md) rejected, [REQ-DOM-012](requirements/REQ-DOM.md)).
- **Flows and process diagrams are not imported** — they are catalogued by hand after import ([REQ-MIG-009](requirements/REQ-MIG.md)).
- **History is not imported.** Every imported project starts at version 1.
- **Internal cross-links are not imported.**

> **Two rows are worth checking against a real product before R1 planning is locked.** CDP audiences and surveys are listed above as *beyond* parity, because the legacy authoring guidelines do not describe a table for either — yet [REQ-DOM-017](requirements/REQ-DOM.md) and [REQ-DOM-018](requirements/REQ-DOM.md) are `Must` in R1 on the grounds that a 1:1 migration losing them would fail the pilot. Both cannot be true. Either they exist in product documentation beyond the template, in which case they are parity, or their `Must` justification needs restating.

## In Scope

The documentation of tracking plans for websites and mobile applications:

- The pages/screens that compose a product, including modals, popups, and page templates.
- The tracking events attached to them (page views, popup views, element clicks, form submissions, user errors).
- The data layer properties those events carry, including their full documentation (meaning, format, origin, allowed values, examples).
- How those properties map onto analytics platforms (Adobe Analytics, CJA, GA4, PostHog).
- Reusable property modules.
- Tracking templates for standardised creation.
- Specific values (including placeholders) for each property within a tracking.
- Conditional valorisations of properties — structured only, from R2. Not expressible in R1 in any form.
- Destinations (analytics variables/events/schema paths) with many-to-many mapping to properties.
- CDP audiences.
- Feedback surveys.
- Free wiki pages for unstructured content (integration instructions, references).
- User journeys (Flows) as named directed graphs over Pages, with Trigger nodes.

### Authoring

- Rich text (Markdown) editor with the full block set including Mermaid with live preview.
- Image upload (drag & drop, clipboard paste), resize, S3 storage.
- Structural image annotations (R2).
- Duplication of trackings, pages, flows, and projects.
- Bulk operations on a multi-selection of trackings with preview (R2).
- Optimistic concurrency with stale-write rejection.
- Per-element change history (R2).

### Structure and Navigation

- Page hierarchy with navigable sidebar.
- Automatic per-page tracking recap.
- Flow entity with directed graph (R2).
- Trigger nodes distinct from visual page transitions (R2).
- Auto-generated Mermaid diagrams from the graph (R2).
- Full-text search within a project, indexing specific values. Prefix and stem matching; typo tolerance deliberately deferred to an optional adapter (R3).

### Versioning and Publication

- Single draft → published model. No branches, no merges, no approval workflow.
- Selective publication: exclude individual trackings and pages/flows per version.
- Automatically generated diff and changelog.
- Full historical version consultation.
- Full rollback (R2).
- Publication email notifications (R2).

### Audience Views and Distribution

- Two audience views: Analyst/Business and Development. In-app as presentation filters; in published artefacts as physical omission.
- In-app read-only view behind SSO, email+password, or shared password.
- Static site per project, regenerated on publication (R2).
- Git export, one commit per publication (R2).
- PDF export of version changes (R2).
- Excel export of data layer properties (R2).
- Confluence Cloud publication, development view only (R3).

### Developer Handoff

- Figma frame links on pages and trackings (R2).
- Code snippet generation per platform × tag manager (R3).
- Snippets narrowed by structured property conditions (R3).

### API and MCP

- Internal REST API (R0), the single entry point for all operations.
- Documented public API (R1) — the basis for importing content from other systems.
- MCP read and write tools (R1), as a layer above the REST API.
- Service-account API tokens (R1) for scripted clients.
- OAuth with user consent for interactive agent clients (R3).

### Import

- **No source-format-specific code in the Platform.** Content is imported by an AI agent driving the public API, producing a committed re-runnable script ([ADR-0021](../adr/0021-agent-driven-migration.md)).
- API surface complete enough to construct any project without opening the UI.
- Idempotent upsert keyed on `external_ref`, so an import can be corrected and re-run.
- Asset upload through the API into object storage.
- Batch write endpoints and a reconciliation report.
- General-purpose: the same capability serves any bulk ingestion, from any source system.

### Foundation

- Multi-company tenancy on a single instance.
- Immutable internal IDs on every entity.
- Persistence behind repository ports: SQLite by default, MariaDB and PostgreSQL adapters in R2. Schema constrained to a portable SQL subset.
- S3-compatible storage behind an interface.
- Search behind an interface: Pagefind by default, with no hosted dependency and no documentation content leaving the instance. A hosted adapter is optional and additive (R3).
- Environment-variable configuration.
- Versioned schema migrations.
- Server-side validation shared by UI, API, and MCP.
- Four company-scoped roles: Admin, Project Manager, Editor, Viewer.
- An instance-administration capability above the companies, held by whoever runs the deployment: creates companies, grants company-admin access, reaches no documentation content.
- Per-project access grants.
- Append-only audit log of write events.
- Email + password login.
- OIDC SSO (R1), SAML SSO (R2).
- Project shared-password access with expiry (R1).
- Public MIT repository with README and reference deployment stack (R0).

## Out of Scope

- The Platform is not an analytics tool — it does not report on analytics data.
- It is not a project-management tool — no ticketing, assignment, or deadlines.
- It does not own the tracking implementation — it describes what must be implemented.
- It is not a data catalogue for the whole enterprise data estate.
- No mobile/responsive layout — desktop only.
- No offline mode.
- No WCAG or public-sector accessibility compliance.
- No dedicated Design view — designers use the Analyst/Business view.
- No field-level permissions — views are presentation filters, not security boundaries.
- No cross-project search.
- No cross-project references — entities may only reference entities in their own project.
- No flow or graph reconstruction from a source system — flows are catalogued manually after import.
- No history import — each imported project starts at version 1.
- No importer UI and no import endpoint accepting an export archive — the Platform holds no knowledge of any source format.

## Deferred (with target release)

| Module | Release | Notes |
|---|---|---|
| Data quality and pre-release verification | R4 | Analytics platform integrations; data-quality signals; conformance reports (reports only, no persisted state) |
| Semantic layer | R5 | OWL/RDF/SKOS exports; business metrics, dimensions, certified segments; business glossary (pending O1, O2) |
| Tracking implementation status | R6 | Lifecycle state on each tracking |
| Figma frame import | R4 | Design-refresh of screenshots |
| Insights repository | R6+ | Separate product on the same foundation |

## Deferred Entities (containers only until semantic layer)

- Extension (tag manager transformation)
- Segment (certified analytics segment)
- Calculated Metric

These ship as containers in R3 and gain substance with the semantic layer in R5.

## Explicitly Rejected

- **Event variants** — a tracking that behaves differently across contexts is expressed through structured property conditions, not through a second inheritance axis.
- **Prose conditional valorisations** — rejected rather than shipped as an R1 stopgap. The structured form (R2) is the only mechanism, which means no conversion exercise across ~30 migrated products.
- **Parallel branches and merge workflows** for versioning — single draft stream only.
- **Approval workflow** — editors publish autonomously.
- **Scheduled deprecation** — properties are deprecated manually.
- **Cross-project property identity** — properties are fully isolated per project (see spec §6.13).
- **Canonical catalogue** with synchronised updates across projects.
- **Live link between company catalogue and project entities** — catalogue is copy-at-creation only.
- **Promotion of custom properties into the company catalogue** — not supported.
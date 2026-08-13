# Product Scope

Defines what is in scope, out of scope, and deferred. References: [`functional-specification.md`](functional-specification.md), [`vision.md`](vision.md), [`user-stories.md`](user-stories.md).

**If you are looking for what R1 must do**, read the [R1 minimum requirements](minimum-requirements.md) rather than this page's feature lists. That checklist is the enumerated definition; everything else here is scope boundary.

## What R1 must do

R1 is the MVP: a complete, usable platform for authoring, versioning, and publishing tracking documentation. The enumerated definition of what R1 must deliver — the minimum set of capabilities the platform must provide — lives in the [R1 minimum requirements](minimum-requirements.md). R1 is complete when every row of that checklist is satisfied, and not before.

On top of that minimum, R1 adds the capabilities that make it a genuinely modern replacement: draft → published versioning with an automatically generated diff and changelog, search over specific values, audience-specific views, a complete API and MCP surface, read access without a licensed account, and an append-only audit log.

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

- Rich text (Markdown) editor with the full block set. Mermaid blocks are authorable and stored from R1; rendering them as diagrams is R2.
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
- Idempotent upsert keyed on `custom_id`, so an import can be corrected and re-run.
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
- No certified WCAG or public-sector accessibility conformance. The interface is built to WCAG AA as a design principle; nothing verifies it and no conformance is claimed.
- No dedicated Design view — designers use the Analyst/Business view.
- No field-level permissions — views are presentation filters, not security boundaries.
- No cross-project search.
- No cross-project references — entities may only reference entities in their own project.
- No flow or graph reconstruction from a source system — flows are catalogued manually after import.
- No history import — each imported project starts at version 1.
- No importer UI and no import endpoint accepting an export archive — the Platform holds no knowledge of any source format.

## Deferred (with target release)

| Module                                    | Release | Notes                                                                                                         |
| ----------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| Data quality and pre-release verification | R4      | Analytics platform integrations; data-quality signals; conformance reports (reports only, no persisted state) |
| Semantic layer                            | R5      | OWL/RDF/SKOS exports; business metrics, dimensions, certified segments; business glossary (pending O1, O2)    |
| Tracking implementation status            | R6      | Lifecycle state on each tracking                                                                              |
| Figma frame import                        | R4      | Design-refresh of screenshots                                                                                 |
| Insights repository                       | R6+     | Separate product on the same foundation                                                                       |

## Deferred Entities (containers only until semantic layer)

- Extension (tag manager transformation)
- Segment (certified analytics segment)
- Calculated Metric

These ship as containers in R3 and gain substance with the semantic layer in R5.

## Explicitly Rejected

- **Event variants** — a tracking that behaves differently across contexts is expressed through structured property conditions, not through a second inheritance axis.
- **Prose conditional valorisations** — rejected rather than shipped as an R1 stopgap. The structured form (R2) is the only mechanism, which means no conversion exercise across ~30 imported products.
- **Parallel branches and merge workflows** for versioning — single draft stream only.
- **Approval workflow** — editors publish autonomously.
- **Scheduled deprecation** — properties are deprecated manually.
- **Cross-project property identity** — properties are fully isolated per project (see spec §6.13).
- **Canonical catalogue** with synchronised updates across projects.
- **Live link between company catalogue and project entities** — catalogue is copy-at-creation only.
- **Promotion of custom properties into the company catalogue** — not supported.

# Functional Specification

This is the canonical functional specification for the dx-doc Platform. It is derived from the consolidated discovery-phase specification (v1.2) and is the authoritative reference for all product requirements.

> **Note:** The full specification is maintained in a separate document due to its length. This file serves as the index and entry point. When the specification changes, this file is updated to reflect the current version.

## Deviations from specification v1.2

Two decisions taken after v1.2 override the specification. Where they conflict, the ADR is authoritative and the specification is stale.

| Spec says                                                                                   | Now                                                                                                                                                                                                                                   | Recorded in                                                                                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §16.1 — MariaDB only, single database target                                                | Persistence behind repository ports. SQLite is the default and the only adapter through R1; MariaDB and PostgreSQL adapters in R2. Schema constrained to a portable SQL subset.                                                       | [ADR-0020](../adr/0020-database-portability.md), supersedes [ADR-0003](../adr/0003-mariadb-single-database.md) |
| §13 — bespoke importer for the legacy wiki's Markdown & CSV export, built into the Platform | The Platform ships **no source-format-specific code**. Content is imported by an AI agent driving the public API, producing a committed re-runnable script. Pulls the documented public API and MCP read/write tools from R3 into R1. | [ADR-0021](../adr/0021-agent-driven-migration.md)                                                              |

§13's _scope_ decisions are unchanged: no flow reconstruction, no history import, no internal-link import.

## Current Version

**Version 1.2** — Preliminary analysis consolidated; benchmark findings adopted.

The full specification is attached as a project artefact. Key sections:

1. Purpose and scope
2. Background and problem statement
3. Goals, non-goals and success criteria
4. Personas and organisational roles
5. Scale and volumes
6. Domain model (entities, relationships, rules)
7. Functional requirements — authoring
8. Functional requirements — structure and navigation
9. Functional requirements — versioning and publication
10. Functional requirements — audience views and distribution channels
11. Functional requirements — developer handoff
12. Functional requirements — API and MCP
13. Functional requirements — import
14. Deferred modules
15. Non-functional requirements
16. Architecture and technology decisions
17. Security, authentication and authorisation
18. Configuration reference
19. MoSCoW prioritisation
20. Delivery roadmap
21. Open decisions log
22. Risk register
23. Glossary
24. Appendix A — Entity-relationship diagram
25. Appendix B — Permission matrix
26. Appendix C — Environment variable reference

## Key Domain Entities

The domain model defines ~25 entities. See `docs/product/glossary.md` for definitions and the ER diagram in the full specification for relationships.

### Core Entities (R1)

- Company, Project
- Page/Screen, Flow, FlowEdge, Trigger
- Tracking, TrackingTemplate
- DataLayerProperty, Module
- TrackingProperty — one property as used by one tracking; carries `presence`
- SpecificValue, PropertyCondition
- Destination
- CdpAudience, Survey
- FreePage
- Version, ChangeEntry
- User, Role, ProjectGrant, AuditEntry

### Deferred Entities

- Extension, Segment, CalculatedMetric (containers in R3, substance in the backlog)

## Critical Business Rules

1. **Property composition:** Properties may be added individually or via a Module. Any property may be removed individually. If all properties of a module are removed, the module association is removed automatically.
2. **Module propagation:** Module changes do NOT propagate automatically to existing trackings. The editor is asked and the default is no propagation.
3. **Catalogue inheritance:** Company catalogue is copied at project creation. No live link. Changes do not propagate.
4. **Draft model:** Single draft stream per project. No branches, no merges, no approval workflow.
5. **Property isolation:** Properties are fully isolated per project. No cross-project references.
6. **Immutable IDs:** Every entity has an immutable internal ID separate from name and slug.
7. **No cross-project references:** An entity may only reference entities in its own project.

## Delivery Roadmap Summary

| Release | Content                                                                      | Timeline              |
| ------- | ---------------------------------------------------------------------------- | --------------------- |
| R0      | Foundations: stack, schema, auth, API, CI, public repo                       | Weeks 1–2             |
| R1      | MVP: full data model, editor, versioning, import API + MCP, SSO              | Weeks 3–8             |
| R2      | Navigation: flows, bulk ops, exports, email, SAML, MariaDB/Postgres adapters | Months 3–4            |
| R3      | Developer handoff: snippets, Confluence, interactive agent access            | Months 5–6            |
| R4      | Data quality: analytics integrations, conformance reports, Figma import      | Months 7–8            |
| Backlog | Semantic layer (OWL/RDF/SKOS, business glossary), lifecycle, insights        | No committed timeline |

## Open Decisions

See §21 of the full specification. Critically open items:

- **O1:** Semantic layer ontology classes, IRI scheme, export formats — blocks the backlog
- **O2:** Business glossary details — blocks the backlog
- **O3:** "How to read this in the analytics platform" — structured field design — blocks R2 Analyst view
- **O4:** Data quality interaction with unstructured placeholders — blocks R4
- **O5:** Verification/QA module scope — blocks R4
- **O6:** Complete environment variable matrix — **closed**, see [ADR-0014](../adr/0014-configuration-split.md); matrix reproduced in [README.md](../../README.md#environment-variables)
- **O7:** Schema migration strategy for third-party installs — **closed**, see [ADR-0015](../adr/0015-schema-migration-strategy.md); forward-only versioned migrations at start-up, production guard, backup as the operator's responsibility. It gated M0.1, not R1.
- **O8:** Design patterns from reference products — partly closed; developer-handoff ref remains
- **O9:** Extension/Segment/CalculatedMetric attributes before the semantic layer — blocks the backlog
- **O10:** Config key split (environment vs database) — **closed**, see [ADR-0014](../adr/0014-configuration-split.md); SSO details, supported login methods and supported locales are company-level, not environment variables
- **O11:** "Manage company catalogue" permission model — **closed**, see [REQ-SEC-010](requirements/REQ-SEC.md); it is a power of the Admin role, not a discrete flag and not a fifth role
- **O14:** Draft-index rebuild trigger and acceptable lag under Pagefind — opened by [ADR-0009](../adr/0009-search-abstraction.md)'s amendment when O12 closed, and **closed** by the same ADR on 2026-08-12: two indices per project, published rebuilt on publication, draft rebuilt asynchronously after each save
- **O12:** Self-hostable search adapter before public release — **closed**, see [ADR-0009](../adr/0009-search-abstraction.md); resolved by making the default self-contained ([REQ-FDN-007](requirements/REQ-FDN.md)), which retired REQ-FDN-016 and opened O14
- **O13:** Bulk operations list completeness — **closed** on 2026-08-13: the six bulk operations were confirmed and recorded in [REQ-AUTH-010](requirements/REQ-AUTH.md) (add/remove module, add/remove property, change page attachment, archive)

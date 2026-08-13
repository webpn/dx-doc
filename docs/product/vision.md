# Product Vision

## What We Are Building

**dx-doc** (the Platform) is the single source of truth for digital analytics tracking documentation within an organisation. It is a purpose-built tool for a specific domain: documenting which trackings fire on which pages, which data layer properties they carry, and how those properties map onto analytics platforms.

## Why It Matters

dx-doc exists to give an organisation a **solid, purpose-built application for documenting everything related to trackings** — tailor-made for this use case, rather than a pile of Word/Excel documents (like an Adobe SDR) or a generic wiki.

A generic tool can hold the content, but it doesn't understand it. dx-doc is built around the tracking domain, so it can do what a document or a wiki cannot:

1. **Structured, not free-form** — pages, trackings, data-layer properties, and destinations are first-class entities with defined relationships, not paragraphs.
2. **Versioned** — a draft → published model with an automatically generated diff and changelog.
3. **Navigable** — the page hierarchy and journeys are exposed in the sidebar, not buried in a document.
4. **Machine-readable** — a complete API and MCP surface, so anything doable in the UI is doable by a machine.
5. **Cost-effective to read** — read access without a licensed account, via project shared passwords.

The Platform addresses all five.

## What Success Looks Like

**R1:** A first product's documentation is fully in the Platform. An editor works on the Platform for a full week without returning to the old workflow. A first version is published with an automatically generated changelog.

**Longer term:** The documentation becomes the single source of truth consumed by developers (through generated code snippets), by analysts (through the analyst view enriched with data-quality signals), and by machines (through the API, MCP, and semantic-layer exports).

## Who It's For

The full persona and role definitions live in [personas.md](personas.md). In short, the Platform serves:

| Persona                                      | Need                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Tracking specialist / analytics engineer** | Owns the documentation. Needs efficient authoring, templates, bulk operations, and a publication workflow.             |
| **Digital analyst**                          | Needs to understand what data to expect in the analytics platform and how to interpret it.                             |
| **Business user / Product manager**          | Needs to review flows and trackings at a high level. Needs to know what's in each release.                             |
| **Web / app developer**                      | Needs to know exactly which trackings to implement — which properties, which values, and only what's relevant to code. |
| **Designer**                                 | Needs to understand which interactions are tracked, anchored to actual screenshots.                                    |

## Distribution Model

The Platform is developed as a **white-label, open-source product** under the MIT licence. It is intended to be usable and improvable by a wider community, and deployable by any organisation. This constrains several design decisions:

- Multi-tenancy is native (a single instance hosts multiple companies).
- All environment-specific integration is configuration-driven.
- No organisation-specific naming or branding is hard-coded.
- A reference deployment stack is provided; deployment itself is not prescribed.

## Strategic Context

The Platform is the first step toward a broader corporate data ecosystem. The documentation will eventually export into a semantic layer (OWL, RDF, ISO 25964) that describes digital tracking metadata for the whole organisation. That semantic layer — not the Platform — will be the corporate data catalogue. The Platform's job is to be the authoritative editor of tracking metadata and a clean, complete source for that catalogue.

### Open Point: Insights & Analysis Layer

Beyond documenting trackings, the Platform could grow into the place where the resulting knowledge about the data is captured and shared. Interesting features to explore:

- **Insights repository** — a place to record findings and observations that come out of working with the tracked data (e.g. known quirks, notable patterns, past investigations), so they aren't lost in tickets or chat threads and can be reused by whoever touches the same tracking next.
- **Guide on how to do the analysis** — documentation that helps a digital analyst go from a tracking definition to a correct analysis: what the properties mean in practice, common pitfalls, and recommended approaches for typical questions.
- **Data quality** — signals and checks (e.g. completeness, consistency, freshness) surfaced against the documented trackings, so analysts and specialists can trust — or flag — what they're seeing in the analytics platform.

This is not yet scoped or committed; it's a candidate direction to evaluate against the [What Success Looks Like](#what-success-looks-like) analyst-view goal.

**None of it carries a requirement, deliberately.** Of the three, only data quality is specified (REQ-DQ-001 … REQ-DQ-003, R4) and only the insights repository has a placeholder ID (REQ-DQ-008, R6+, treated as a separate product). **Analysis guidance has no requirement and will not get one until there is a clear idea of what it is** — writing requirements for it now would produce detail that gets discarded. It is a product-development path, recorded here so it is not lost, and explicitly not a commitment the requirement set is expected to honour.

Read against this, the analyst view in R1–R3 means property documentation, destination mappings and the version an item was introduced in — not interpretation guidance.

## What the Platform Is Not

- **Not an analytics tool.** It documents; it does not report.
- **Not a project-management tool.** No ticketing, no assignment, no deadlines.
- **Not the implementation.** It describes what must be implemented; the code lives elsewhere.
- **Not a data catalogue for the whole enterprise** — only for digital tracking metadata.

# Glossary

Domain terminology for the dx-doc Platform. This glossary is authoritative — if a term appears in code, documentation, or conversation, it means what this glossary says it means.

| Term | Definition |
|---|---|
| **Company** | Tenant of the Platform. Owns users, catalogue, branding, and SMTP configuration. A single instance hosts multiple companies. |
| **Project** | Documentation of one product on one platform (e.g., "MyApp Web" or "MyApp iOS"). Unit of access control, versioning, and publication. |
| **Data Layer** | The structured set of variables a product exposes for analytics collection (the `digitalData` or equivalent object). |
| **Data Layer Property** | A single documented variable in the data layer. Carries name, type, description, allowed values, examples, PII flag, hashing policy, AEP field group, and destination mappings. It does **not** carry presence — see Presence. |
| **Object Property** | A property of type `object` with child properties, forming a parent-child hierarchy addressed by path (e.g., `product.characteristics.colour`). |
| **Presence** | Whether a property is `always`, `sometimes`, or `never` sent in a given tracking. It is an attribute of the **tracking↔property relationship and of nothing else** — a property has no presence of its own, and the same property may be `always` in one tracking and `sometimes` in another. The `never` state is what allows a condition to state that a property must not be present. |
| **Module** | A named, project-scoped, reusable bundle of Data Layer Properties. Applied to a tracking to add properties in bulk. Not nestable. |
| **Tracking** | A single documented tracked event. Attached to a Page or page template, carrying a navigation event type, a set of properties (from modules and individually added), and specific values. |
| **Tracking Template** | A blueprint for creating new Trackings. Defines preselected modules, preconfigured properties, default specific values, and prefilled description sections. Templates are project-scoped. |
| **Specific Value** | The concrete value a Data Layer Property must take within a given tracking. May contain placeholders written in square brackets (e.g., `article_detail_[slug]`). |
| **Placeholder** | A variable portion of a specific value, written in square brackets. Its meaning is explained in prose in the tracking or property description. |
| **Property Condition** | A structured constraint on a property within a scenario: `property` + `operator` (`is`, `is not`, `is set`, `is not set`) + `value` + optional `note`. Conditions may target nested properties by path. |
| **Destination** | An analytics-platform target that a property maps to — an Adobe eVar/prop/event, a CJA XDM schema path, a GA4 custom dimension, or a PostHog property. Many-to-many with Data Layer Properties. |
| **Destination Name Override** | A per-mapping override allowing the same data layer property to have different names as different destination variables. |
| **CDP Audience** | A named audience built on documented properties, fed to downstream systems. Attributes: name, downstream systems, identifier, entry/exit conditions (free text), constituent properties. |
| **Survey** | A feedback survey triggered on documented conditions. Attributes: name, tool, trigger conditions, properties used, pages involved, status, campaign, delivery type, go-live date, deactivation date. |
| **Page / Screen** | A page, screen, modal, popup, or page template of a product. Organised in a hierarchy. |
| **Flow** | A named user journey: a directed graph over Pages and Triggers. Representational only — flows do not own the entities they reference. |
| **Flow Edge** | A transition between nodes in a flow. Two types: visual transitions (Page → Page, purely visual, binds nothing) and Trigger connections (Trigger → source Pages, Trigger → destination Pages, Trigger → Trackings). |
| **Trigger** | A navigation, system, or user action that causes a tracking to fire. Has source Pages (0..N), destination Pages (0..N), descriptive conditions, associated Trackings (0..N), and optional image annotations. |
| **Annotation** | A structural mark on a page screenshot: a Point (for small elements) or a Region (for larger areas). Regions may nest. Annotations may link to Triggers or Trackings, anchoring the documentation to the visual interface. |
| **Custom Field** | A company-defined additional typed field attachable to Properties, Trackings, and Pages. The mechanism for semantic-layer attributes before the ontology is defined. |
| **Draft** | The unpublished, mutable working state of a project's documentation. All edits — human or agent — write into the draft. |
| **Version** | A published, immutable snapshot of the documentation at a point in time. Carries a progressive number, publication date, optional title, optional release notes, and an automatically generated changelog. |
| **Change Entry** | A single recorded change within a Version, forming the automatic changelog. Records what entity was added, modified, or removed, with per-property and per-specific-value granularity. |
| **Publication** | The act of creating a new Version from the current draft. Editors may selectively exclude individual Trackings and Pages/Flows from a publication. |
| **View** | An audience-specific presentation filter: Analyst/Business (full detail including destinations and analysis notes) or Development (only what is needed to implement tracking in code — no destinations, no tag-manager-derived properties, no analysis notes). In-app, views are presentation filters. In published artefacts, excluded content is physically omitted. |
| **Free Page** | Unstructured wiki content within a project. Free pages carry a publishable flag — non-publishable pages are visible only to users with editing access and are excluded from all published artefacts and external search indexes. |
| **Company Catalogue** | The set of standard Data Layer Properties, Modules, Tracking Templates, and Free Page templates defined at company level. Copied into new projects at creation. Subsequent catalogue changes do not propagate automatically to existing projects. |
| **Bulk Operation** | An edit applied to a multi-selection of Trackings, previewed before it is applied. Supported operations: add/remove/swap modules, add/remove properties, set presence, change page attachment, archive. |
| **Impact Analysis** | Within a single project: for a given Data Layer Property, lists all Trackings, Destinations, Audiences, Surveys, and Dashboard links that reference it. Used before deprecating a property. |
| **Platform Alignment** | An occasional, read-only report comparing properties between paired projects (e.g., web and app versions of the same product). Lists name-matched differences in type, format, allowed values, or destination mappings. Advisory only — never proposes or applies changes. |
| **Semantic Layer** | The corporate description layer for digital data, which the Platform will eventually feed. Exports in OWL, RDF, and ISO 25964 formats. Includes business metrics, dimensions, certified segments, and a business glossary. Deferred to R5. |
| **Agent** | An MCP client (AI assistant) connected to the Platform through the MCP server. Agents act with the permissions of the consenting user and always write into the draft. |
| **MCP Server** | A layer above the REST API that exposes the Platform's capabilities to AI agents through the Model Context Protocol. MCP tools call the same REST API endpoints as the web client.
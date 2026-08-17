# ADR-0010: Project-Scoped Entity Isolation

## Status

Accepted

## Date

2026-08-11

## Context

The functional specification explicitly states: "Cross-project references are not permitted: an entity may only reference entities belonging to its own project." This is a conscious design decision, not an oversight. The spec further rejects cross-project property identity, canonical catalogues, and synchronized updates between projects.

## Decision

**Entities are fully isolated per project.** There is no cross-project referencing at the database level, the API level, or the domain level.

**What this means concretely:**

- A Tracking references a Page within the same project. It cannot reference a Page from another project.
- A Data Layer Property belongs to exactly one project. The `page_name` of the web project and the `page_name` of the app project are unrelated objects.
- The company catalogue is copied into a project at creation. After that, there is no live link.
- Impact analysis is project-scoped only: "which trackings in this project reference this property?"
- Search is project-scoped: no cross-project search.

**The one exception:** an optional project pairing (R4, Could) that enables a read-only alignment report between paired projects. This pairing is metadata (two projects declare each other as counterparts), not a reference that entities can traverse. The report compares by name, not by identity.

## Alternatives Considered

### Cross-project references with a canonical property catalogue

Rejected by the spec: "Platform alignment is a convenience, not a design driver." The spec is explicit that cross-project identity "must not be allowed to shape the data model."

### Shared property identity between web and app projects

Rejected by the spec: "Properties are fully isolated per project." The web `page_name` and app `page_name` are unrelated objects. Alignment checking is an occasional report, not a data-model feature.

### Cross-project search

Rejected by the spec as "Won't."

## Consequences

- Simpler data model: no polymorphic foreign keys, no shared entity tables.
- Simpler authorization: a user's project grant determines what they can see. No need to resolve "this property is shared between project A (which the user can access) and project B (which they cannot)."
- Copying a tracking into another project (R2) requires mapping properties and modules onto the target project's equivalents. This is a guided mapping, not an automatic copy.
- The alignment report (R4) is purely name-matched and advisory. It requires no model changes.
- The `page_name` in every project is independently defined. This is accepted as the trade-off for project autonomy.

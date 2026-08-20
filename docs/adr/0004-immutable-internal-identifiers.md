# ADR-0004: Immutable Internal Identifiers

## Status

Accepted

## Date

2026-08-11

## Context

Every entity in the domain model needs an identifier. The identifiers are used in URLs, API responses, git export paths, and (eventually) as the basis for stable IRIs in the semantic layer (backlog). If identifiers can change, every system that references them breaks.

## Decision

Every entity carries an **immutable internal ID** that is separate from its user-visible **name** and **slug**. The internal ID:

- Is generated at entity creation and never changes.
- Is a UUID (v4 or v7) or a similar opaque, globally unique string.
- Is the primary key in the database and the canonical reference in API responses.
- Is never exposed as a user-editable field.

The **slug** is a human-readable, URL-safe string derived from the name. It may change when the name changes. The **name** is the user-visible label and may also change.

API endpoints use the internal ID for entity references. The slug may be used for human-friendly URLs but is resolved to the internal ID server-side.

## Alternatives Considered

### Auto-increment integer IDs

Rejected: not globally unique, leak entity count, and complicate idempotent import (IDs would shift between runs). They are also unsuitable for stable IRIs.

### Slug as primary identifier

Rejected: slugs change when names change. Renaming a property would break every reference to it. The previous documentation's pain points include the inability to rename things without breaking links.

### Natural keys (e.g., property name within a project)

Rejected: even within a project, names can change. The property name is a user-controlled value and not a stable identifier.

## Consequences

- Every entity table has an `id` (UUID, immutable). A `slug` exists only on the entities addressed by a human-friendly URL (a minority of the ~30 tables), and is derived from the name, mutable.
- API responses include both `id` and `slug`. Clients use `id` for reliable references.
- Idempotent import ([ADR-0021](0021-agent-driven-migration.md)) needs a second, orthogonal key: entities also carry an optional `custom_id` recording the source system and source identifier, unique per project. The internal `id` is what dx-doc references; the `custom_id` is what lets a re-run recognise an entity it created on a previous pass. Neither substitutes for the other.
- When the semantic layer is built (backlog), stable IRIs are minted from the immutable IDs — no data migration needed.
- UUIDs are larger than integers (16 bytes vs 4-8 bytes). At the projected scale (thousands of entities per project), this is negligible.

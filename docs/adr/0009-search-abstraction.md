# ADR-0009: Search Index Abstraction

## Status
Accepted

## Date
2026-08-11

## Context
The Platform requires full-text and fuzzy search within a project. The spec mandates Algolia as the initial implementation but requires that search sits behind an interface so that a self-hostable adapter can be added later without touching application code.

Additionally, two search-specific constraints exist:
1. Non-publishable free pages (containing test credentials) must never appear in any external index.
2. Search results must never expose content from projects the user cannot access.

## Decision
Search is accessed through a `SearchIndex` port interface defined in `src/application/ports/`. The Algolia implementation lives in `src/infrastructure/search/algolia/`.

**The `SearchIndex` interface defines operations like:**
- `indexEntity(entity)` — add or update an entity in the index
- `removeEntity(id)` — remove an entity from the index
- `search(query, filters)` — full-text search with project-scoping
- `reindexProject(projectId)` — rebuild the index for a project

**Index design:**
- A single index with a `project_id` facet.
- Project-scope filtering is applied server-side by the adapter, based on the user's project grants.
- Search keys are generated server-side, never shared with the client.
- Non-publishable free pages are excluded from the index entirely.

## Alternatives Considered

### Direct Algolia client usage throughout the codebase
Rejected: ties the application to Algolia. Adding a self-hostable adapter would require touching every search call site.

### Database full-text search (MariaDB FULLTEXT)
Rejected: MariaDB full-text search is less capable (no fuzzy matching, limited relevance tuning) and the spec already chose Algolia for R0.

### Self-hosted search engine from day one (Meilisearch, Typesense)
Rejected: adds operational burden (running another service) for a team of one. Algolia's hosted model removes search infrastructure from the critical path. The abstraction keeps the option open.

## Consequences
- Application code depends only on the `SearchIndex` interface, not on Algolia.
- The Algolia adapter handles key scoping, project filtering, and non-publishable-page exclusion.
- A self-hostable adapter (Meilisearch, Typesense, or Elasticsearch) can be added to `src/infrastructure/search/` without changing any application or domain code.
- The index design (single index with `project_id` facet) is shared across adapters. A different adapter may choose a different physical layout as long as the `SearchIndex` interface is satisfied.
- Open decision O12 tracks whether the self-hostable adapter is needed before the public release.
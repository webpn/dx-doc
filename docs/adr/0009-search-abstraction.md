# ADR-0009: Search Index Abstraction

## Status
Accepted — **amended 2026-08-12**: the default adapter is Pagefind, not Algolia. The port and its guarantees are unchanged; the shipped implementation and the risk profile behind it are not.

## Date
2026-08-11 (amended 2026-08-12)

## Context
The Platform requires full-text search within a project, sitting behind an interface so the implementation can be changed without touching application code.

Two search-specific constraints exist:
1. Non-publishable free pages (containing test credentials) must never appear in any index.
2. Search results must never expose content from projects the user cannot access.

The original decision named Algolia as the shipped implementation, with a self-hostable adapter deferred to R3 as a `Could` and open decision O12 tracking whether it was needed before the public release.

**That ordering did not work.** O12 was scheduled to close at M1.10, at the end of R1. The repository is public under the MIT licence from R0 (REQ-FDN-011), delivered at M0.6 in week 2 — so the question "is a self-hostable adapter needed before the public release?" was scheduled to be answered roughly six weeks after the public release happened.

Reconsidering it exposed a second inconsistency. [ADR-0020](0020-database-portability.md) had already re-weighed exactly this trade for the database, on the grounds that the hardest dependency for a third-party deployer to satisfy should not be hard-wired. After that ADR, search was the only remaining hard external dependency in a stock instance — and unlike a database, it is one that requires a commercial account and, in a regulated organisation, procurement approval and a data-transfer review.

## Decision

Search is accessed through a `SearchIndex` port interface defined in `src/application/ports/`. Adapters live in `src/infrastructure/search/`, selected by `SEARCH_DRIVER`.

**Pagefind is the default and the only adapter through R2.** It runs entirely within the instance: no account, no hosted service, and no documentation content leaving the deployment.

**The `SearchIndex` interface defines operations like:**
- `indexEntity(entity)` — add or update an entity in the index
- `removeEntity(id)` — remove an entity from the index
- `search(query, filters)` — full-text search with project-scoping
- `reindexProject(projectId)` — rebuild the index for a project

**Index design:**
- One index per project.
- Index artefacts are served only through an authorised route that applies the same grant check as project content. A client requesting another project's index receives a 403.
- Non-publishable free pages are excluded from the index entirely.
- Where an adapter uses API keys, they are generated server-side and scoped per request; no key reaches the client unscoped.

## Alternatives Considered

### Algolia as the default (the original decision)
Superseded. Capable and operationally free, but it makes a stock instance depend on a commercial account and transmits every tracking name, property name, description and specific value to a third party. For a product whose distribution model promises deployability by any organisation, the default should be the configuration that needs nobody's approval. Algolia remains available as an opt-in adapter (REQ-FDN-022).

### Direct Algolia client usage throughout the codebase
Rejected, and the amendment vindicates the rejection: the default implementation changed before a line of it was written, and the port is why that cost nothing.

### Database full-text search
Rejected. Weaker than Pagefind for this content, and it would put search back inside the schema that [ADR-0020](0020-database-portability.md) constrains to a portable SQL subset.

### Self-hosted search service (Meilisearch, Typesense)
Rejected as the default, though it is the closest alternative. Both are more capable than Pagefind — real typo tolerance, incremental updates — but each is another service to run, which is the operational burden the reference stack is trying not to have. Either is the natural home for REQ-FDN-022 when typo tolerance is wanted back, and either would keep the no-egress property that the hosted option gives up. Reconsider as the default if O14 resolves badly: the port makes them drop-in.

## Consequences

- Application code depends only on the `SearchIndex` interface. Neither adapter's types appear outside `src/infrastructure/search/`.
- **A stock instance transmits no documentation content anywhere.** This is what makes REQ-FDN-021's data-flow statement short enough to be worth writing, and it is the property an operator cannot add after the fact.
- **Open decision O12 is closed** — not answered, removed. REQ-FDN-016 (self-hostable adapter) is retired with it, because the default now has the property that requirement was asking for.
- **Risk R7 is replaced rather than mitigated.** The old risk was cross-tenant leakage through a hosted index; the new exposure is bounded by the instance, and the failure mode is an unauthorised route rather than an unscoped key.
- **Typo tolerance is given up for the first phase.** Pagefind does prefix matching and stemming, not typo correction. REQ-AUTH-007's fuzzy criterion is **withdrawn** rather than deferred to a decision: the capability returns when an adapter that supports it is adopted (REQ-FDN-022), and nothing in R1–R2 is written against it. This is the deliberate cost of a stack with no external dependency — the property gained cannot be added later, the one given up can be bought at any time.
  - **One capability gap remains open, as decision O14**, gating M1.7: the index is built, not updated per record. Editors search the draft, so the rebuild trigger and its acceptable lag must be decided — per save, debounced, or on demand.
- Testing gets simpler: infrastructure search tests need no external credentials and no sandbox index, so the coverage carve-out in [ADR-0017](0017-testing-strategy.md) ("skipped if Algolia credentials are not configured") no longer applies to the default path.

# ADR-0012: Data-Fetching and Server-State Strategy

## Status

Accepted (2026-08-12)

## Date

2026-08-11 (decided 2026-08-12)

## Context

The React web application fetches data from the REST API. Server state (entities, lists, search results) must be cached, kept fresh, and shared across components without manual management. The choice of data-fetching library affects component design, loading/error state patterns, and cache invalidation strategy.

## Decision

**TanStack Query (React Query)** owns all server state in the web application.

Every read of API data goes through a query; every write goes through a mutation that invalidates the queries it affects. No component fetches from the API directly, and no server-derived data is copied into client state to be kept in sync by hand.

## Rationale against the criteria

1. **Cache invalidation** — the criterion marked critical, because a draft edit must be visible immediately. Query keys scoped by project and entity make invalidation after a mutation explicit and local to the mutation.
2. **Optimistic updates** — supported with rollback, which the concurrency model needs (see below).
3. **Background refetching** — stale-while-revalidate is the default behaviour, not something to build.
4. **AI agent familiarity** — the strongest of the candidates by a wide margin, which matters under [ADR-0019](0019-ai-coding-agent-model.md) for the same reason it decided [ADR-0011](0011-ui-library-selection.md).
5. **Devtools** — cache state is inspectable, which is most of the debugging cost of a cache.
6. **Bundle size** — acceptable; larger than SWR, and the features are the reason.

## Consequences

- **Optimistic updates must reconcile with optimistic concurrency, not paper over it.** [ADR-0016](0016-concurrency-model.md) rejects stale writes server-side, and [M1.5](../product/milestones.md) delivers that rejection as a visible conflict. A mutation that optimistically applies a change and then silently refetches on rejection would hide exactly the event the user needs to see: rollback restores the previous value **and** surfaces the conflict. This is the one place where the library's default ergonomics and the product requirement pull in different directions, and the requirement wins.
- **Query keys are a shared convention, not a per-component invention.** Project-scoped keys are what make [ADR-0010](0010-project-scoped-isolation.md) isolation legible in the cache and prevent one project's data being served from another's cache entry. The convention belongs in `AGENTS.md` before the first query is written, because agents will otherwise each invent their own.
- **The client-state question shrinks but does not disappear.** With server state owned here, what remains for [ADR-0013](0013-state-management.md) is UI state — selections, panel and dialog state, editor draft buffers. That is a much smaller problem than the one ADR-0013 was originally framed against, and the answer may well be `useState`/`useReducer` with no global store at all. D3 stays open, with its scope reduced.
- **Server-state testing follows the library's patterns:** component tests wrap in a `QueryClientProvider` with retries disabled and a fresh client per test, so cache state never leaks between tests. This belongs in [ADR-0017](0017-testing-strategy.md) when D6 closes.

## Alternatives Considered

**SWR** — lighter and simpler, and adequate for the common case. Rejected on criterion 1: cache invalidation after mutation is the operation this application performs constantly, and it is where SWR is weakest.

**RTK Query** — good caching, but it arrives with Redux. Adopting Redux to get a data-fetching library is the wrong way round, particularly now that the client-state problem has shrunk.

**Manual fetch + context** — rejected as stated: it reinvents caching, deduplication, invalidation and loading states, all solved problems, in an application complex enough to need all four.

## Relationship to State Management

Server state (TanStack Query) and client state ([ADR-0013](0013-state-management.md)) are separate concerns. This decision covers server state only and is not a client-state strategy.

## Related Decisions

- [ADR-0007](0007-api-as-single-entry-point.md): REST API as Single Entry Point — the API being consumed.
- [ADR-0013](0013-state-management.md): State Management — still open, and narrowed by this decision.
- [ADR-0016](0016-concurrency-model.md): Concurrency Model — constrains how optimistic updates may behave.
- [ADR-0011](0011-ui-library-selection.md): TanStack Table is the companion for the table work.
- D2 in [decisions](../decisions/README.md).

## Last Responsible Moment

Start of R1 (before UI components are built) — met.

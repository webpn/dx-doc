# ADR-0012: Data-Fetching and Server-State Strategy

## Status
Proposed

## Date
2026-08-11

## Context
The React web application fetches data from the REST API. Server state (entities, lists, search results) must be cached, kept fresh, and shared across components without manual management. The choice of data-fetching library affects component design, loading/error state patterns, and cache invalidation strategy.

## Decision (to be made)

The following candidates are under consideration:

### TanStack Query (React Query)
- **Pros:** Industry standard for server state in React; excellent caching, invalidation, background refetching; devtools; mature; large community; well-represented in AI training data.
- **Cons:** Adds a dependency; requires understanding its mental model (stale-while-revalidate).

### SWR
- **Pros:** Lightweight; simple API; good for the common case.
- **Cons:** Fewer features than TanStack Query; less flexible cache invalidation.

### RTK Query (Redux Toolkit Query)
- **Pros:** Integrated with Redux if the project already uses it; good caching.
- **Cons:** Requires Redux; heavier than alternatives if Redux is not otherwise needed.

### Manual fetch + context
- **Pros:** No dependency.
- **Cons:** Reinvents caching, invalidation, loading states, deduplication — all solved problems. Not acceptable for a complex application.

## Criteria for Decision

1. **Cache invalidation:** how easily can we invalidate the cache after a mutation? (Critical: draft edits must reflect immediately.)
2. **Optimistic updates:** support for optimistic mutations with rollback.
3. **Background refetching:** stale-while-revalidate pattern for keeping data fresh.
4. **AI agent familiarity:** how well do AI coding agents generate correct code?
5. **Devtools:** debugging cache behavior.
6. **Bundle size.**

## Relationship to State Management

Server state (TanStack Query / SWR) and client state (useState, useReducer, lightweight global store if needed) are separate concerns. The data-fetching library manages server state. It is not a replacement for client-side state management.

## Related Decisions
- ADR-0007: REST API as Single Entry Point — the API being consumed.
- ADR-0013: State Management — the client-state strategy.

## Last Responsible Moment
Start of R1 (before UI components are built).
# ADR-0013: Client-Side State Management

## Status
Proposed — **narrowed 2026-08-12** by [ADR-0012](0012-data-fetching-strategy.md)

## Date
2026-08-11

## Context
The React application has several categories of state beyond server-fetched data: local UI state (form values, open/closed toggles), URL state (current page, filters), and potentially cross-feature state (current project context, view mode selection). The choice of state-management approach affects component architecture and complexity.

> **This decision got smaller on 2026-08-12.** With [ADR-0012](0012-data-fetching-strategy.md) accepted, TanStack Query owns all server state — entities, lists, search results, and their caching and invalidation. What is left for this ADR is UI state alone: current project context, view mode, panel and dialog state, editor draft buffers. Criterion 1 below (*does the actual need justify a library?*) is therefore the one that decides it, and the honest answer may well be no. The candidates are kept for the case where it turns out to be yes.

## Decision (to be made)

**Principles (agreed):**
- Server state is managed by a data-fetching library (ADR-0012), not manually copied into global state.
- Local UI state stays in components (`useState`, `useReducer`).
- URL state is the source of truth for navigation (route params, query strings).
- Global state is only introduced with a documented reason.

**For cross-feature state that genuinely needs sharing (e.g., current project, current view mode):**

### Zustand
- **Pros:** Minimal API; no boilerplate; no provider wrapping; good TypeScript support; small bundle.
- **Cons:** Another dependency; less structured than Redux (can become messy if undisciplined).

### React Context + useReducer
- **Pros:** Built-in; no dependency; explicit provider tree.
- **Cons:** Performance issues with frequent updates (re-renders all consumers); verbose boilerplate for multiple slices.

### Jotai / Recoil
- **Pros:** Atomic model; fine-grained re-renders; composable.
- **Cons:** Less mainstream; less AI training data; smaller community.

### Redux Toolkit
- **Pros:** Mature; excellent devtools; structured patterns; large community.
- **Cons:** Heavy for the limited global state this application needs; significant boilerplate.

### No global state library — just context
- **Pros:** No dependency.
- **Cons:** May be sufficient. The application's global state needs are limited: current project, current view mode (Analyst/Development), user session. Context may be enough.

## Criteria for Decision

1. **Actual need:** do we have cross-feature state that justifies a library?
2. **Simplicity:** prefer the simplest solution that works.
3. **AI agent predictability:** how consistently do agents generate correct code?
4. **Performance:** avoid unnecessary re-renders.

## Related Decisions
- ADR-0012: Data-Fetching Strategy — server state is handled separately.
- ADR-0006: Layered Architecture — UI state is a UI concern.

## Last Responsible Moment
Start of R1 (before UI components with shared state are built). The decision can start minimal (context only) and escalate to a library when a demonstrated need arises.
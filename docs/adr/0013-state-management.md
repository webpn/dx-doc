# ADR-0013: Client-Side State Management

## Status

Accepted (2026-08-17) — **Zustand**. Previously Proposed; decided on 2026-08-17 after [ADR-0012](0012-data-fetching-strategy.md) narrowed the scope to UI state alone.

## Date

2026-08-11 (proposed), decided 2026-08-17

## Context

The React application has several categories of state beyond server-fetched data: local UI state (form values, open/closed toggles), URL state (current page, filters), and potentially cross-feature state (current project context, view mode selection, user session). The choice of state-management approach affects component architecture and complexity.

> This decision got smaller on 2026-08-12. With [ADR-0012](0012-data-fetching-strategy.md) accepted, TanStack Query owns all server state — entities, lists, search results, and their caching and invalidation. What is left for this ADR is UI state alone: current project context, view mode, panel and dialog state, editor draft buffers. Criterion 1 below (_does the actual need justify a library?_) is therefore the one that decides it.

## Decision

**Use Zustand** for the small amount of genuinely shared, cross-feature UI state (current project, current view mode, user session).

**Principles (agreed):**

- Server state is managed by a data-fetching library (ADR-0012), not manually copied into global state.
- Local UI state stays in components (`useState`, `useReducer`).
- URL state is the source of truth for navigation (route params, query strings) — React Router.
- Global state is only introduced with a documented reason, and when it is, it is a Zustand store.

### Why Zustand over the alternatives

- **vs. Redux Toolkit:** Redux is purpose-built for large, structured, frequently-updating state needing middleware, devtools and disciplined selectors. The remaining global state here is a handful of values (current project, view mode, session); Redux's slices/reducers/selectors boilerplate is overhead against that, and TanStack Query already supplies the devtools and structured patterns for the state that actually changes often.
- **vs. React Context + useReducer:** works, but re-renders all consumers on any change and is verbose for multiple independent slices; Zustand provides fine-grained subscription with ~zero boilerplate.
- **vs. Jotai/Recoil:** atomic and composable, but less standard; Zustand is smaller in concept and more predictable for AI agents to generate correct code against (criterion 3).
- **Vite note:** Zustand needs no provider wrapping and no special Vite config — a store is a plain module (`create()`) importable anywhere, which fits the SPA build trivially.

**State splitting rule:** the decision does not permit one global store for everything. Per-slice stores (`projectStore`, `sessionStore`, `uiStore`) with small, purpose-scoped state; server data is never placed in a Zustand store — it stays in TanStack Query.

## Alternatives Considered

- **Redux Toolkit** — rejected as heavy for the limited global state; the state that changes most is already owned by TanStack Query.
- **MobX** — rejected; reactive/observable model adds concepts and less agent predictability for no benefit at this scale.
- **Context + useReducer** — rejected as the primary mechanism (re-render granularity, boilerplate), though Context is still used for dependency injection where appropriate.
- **No global state library** — the honest fallback if the shared state were even smaller; with a session and a project context that several features read, a single small library is justified over hand-rolled context plumbing.

## Criteria for Decision

1. **Actual need:** yes — current project, current view mode and session are genuinely shared across features.
2. **Simplicity:** prefer the simplest solution that works — Zustand is the smallest that does.
3. **AI agent predictability:** how consistently do agents generate correct code? Zustand's imperative store is as close to plain JS as a state solution gets.
4. **Performance:** fine-grained subscriptions avoid the re-render-all problem of Context.

## Consequences

- New global state is introduced as a new small Zustand store only when a demonstrated cross-feature need exists; until then components use local state.
- Server data never lives in a Zustand store.
- Agent-generated code should prefer local component state, then URL state, then a Zustand store, in that order.

## Related Decisions

- ADR-0012: Data-Fetching Strategy — server state is handled separately (TanStack Query).
- ADR-0006: Layered Architecture — UI state is a UI concern.
- ADR-0022: Application Framework — Vite SPA + React Router.

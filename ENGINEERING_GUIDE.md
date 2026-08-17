# Engineering Guide

The technical constitution of the dx-doc project. Every contributor — human or AI — is expected to follow these rules. Where a rule can be mechanically enforced, it is. Where it can't, it is reviewed in PRs.

## Coding Principles

1. **Prefer simple, explicit, composable solutions** over clever abstractions.
2. **Composition over inheritance.** Use functions and module composition. Classes are acceptable for domain infrastructure (repositories, adapters) and React components; avoid them for plain data or behavior.
3. **Functional programming techniques** where they improve clarity: pure functions, immutability, discriminated unions, `Result` types for error handling.
4. **Dependency injection is explicit.** Use constructor injection, function parameters, or module composition. Avoid service locators, hidden globals, and ambient DI containers.
5. **Domain logic is independent of React, the browser, and the network.** Pure TypeScript in `src/domain/` and `src/application/`.
6. **Avoid premature abstraction.** Extract when there is a demonstrated, stable reason — not when you anticipate one. The rule of three: extract when you have three or more concrete examples.
7. **No circular dependencies.** Enforce with tooling (e.g., `eslint-plugin-import`).
8. **No global mutable state.** Module-level mutable state is global mutable state.
9. **Make dependencies and data flow explicit.** If a function needs something, it receives it as a parameter.

## TypeScript Conventions

### Configuration

The project uses strict TypeScript:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### Type rules

- **Prefer type inference** for obvious local values (return types of simple functions, variable initializers). Explicitly type public APIs, exported functions, and important boundaries.
- **Prefer discriminated unions** for state machines, variant data, and error types:
  ```typescript
  type PublicationState =
    | { kind: 'draft'; projectId: string }
    | { kind: 'published'; versionId: string; versionNumber: number };
  ```
- **Avoid enums** unless interop with a database or external system requires them. Prefer literal unions:
  ```typescript
  // Prefer
  type Presence = 'always' | 'sometimes' | 'never';
  // Over
  enum Presence {
    Always = 'always',
    Sometimes = 'sometimes',
    Never = 'never',
  }
  ```
- **Never use `any`** except where explicitly justified and documented with a comment explaining why `unknown` + narrowing is not practical.
- **Use `unknown` at unsafe boundaries** (API responses, localStorage, URL parameters) and validate/narrow it before use.
- **Validate external data at runtime.** Do not trust API responses merely because TypeScript types exist. Use a validation library (e.g., Zod) at the API boundary.
- **Keep domain types independent from API DTOs** when the models have different semantics. A domain `DataLayerProperty` may have different shape than the JSON body that creates one.
- **Use branded types** for primitive identifiers to prevent accidental mixing:
  ```typescript
  type ProjectId = string & { readonly __brand: 'ProjectId' };
  type PropertyId = string & { readonly __brand: 'PropertyId' };
  ```

## React Conventions

- **Function components only.** No class components.
- **Composition over inheritance.** Pass children, use slots, use render props sparingly.
- **Keep components focused.** A component should do one thing. If it does several, extract sub-components.
- **Keep business logic out of presentational components.** A component that renders a tracking detail should receive the tracking data as props, not fetch it or compute business rules.
- **Use custom hooks for reusable React-specific behavior.** A hook that encapsulates form state or data fetching is appropriate. A hook that merely wraps a pure function call is not.
- **Avoid unnecessary effects.** Effects are for synchronizing with external systems (DOM APIs, timers, subscriptions). They are not for derived data or reacting to user events.
- **Prefer derived values over duplicated state.** If a value can be computed from existing state or props, compute it — don't store it.
- **Avoid prop drilling** only when it represents a real architectural problem (deeply nested, many intermediate components that don't use the value). Passing a few props is normal and fine. Do not introduce global state merely to avoid passing props.
- **Use stable keys.** Never use array indexes as keys when item identity can change.
- **Controlled/uncontrolled components:** establish explicit conventions. A component that manages its own internal state (uncontrolled) should document that it does so. A component that receives value + onChange is controlled.
- **Treat accessibility as a functional requirement** — see the Accessibility section below.

## Component Conventions

- One component per file, except for small, tightly coupled sub-components that are not exported.
- Component files are named after the component: `TrackingDetail.tsx`, `PropertyForm.tsx`.
- Co-locate component-specific types, styles, and tests when they are only used by that component.
- Use CSS Modules or a co-located `.styles.ts` file. No global CSS except for design tokens and resets.
- Avoid inline styles except for genuinely dynamic values (e.g., computed dimensions).

## Hooks Conventions

- Custom hooks are named `use*`.
- A hook encapsulates stateful React logic. It is not a container for any reusable function.
- Hooks should have a single responsibility. `useTrackingForm` is better than `useTrackingPage`.
- Hooks that fetch data should expose `{ data, isLoading, error }` consistently.

## State Conventions

- **Local UI state:** `useState`/`useReducer` within a component or a small subtree.
- **Server/remote state:** fetched through a data-fetching library with caching (e.g., TanStack Query, SWR). Server state is not manually copied into global state.
- **URL state:** route parameters and query strings. The URL is the source of truth for navigation state.
- **Cross-feature/application state:** only introduced with a documented reason. When needed, use a lightweight solution (e.g., Zustand, context + reducer) rather than a heavy state-management framework.
- **Form state:** managed through a form library (e.g., React Hook Form) or explicit reducer. Form state is local to the form.

## Async / Data-Fetching Conventions

- All data fetching goes through the API client layer (`src/infrastructure/api-client/`). React components never call `fetch` or `axios` directly.
- The API client handles: base URL, authentication headers, serialization, error normalization, retries.
- API errors are normalized into a consistent shape before reaching application code.
- Loading, empty, and error states are handled explicitly in every component that fetches data. There is no "it just won't happen" assumption.
- Mutations (POST, PUT, PATCH, DELETE) are optimistic where appropriate, with rollback on failure.
- The draft-vs-published distinction is reflected in API calls: draft endpoints are separate from published-version endpoints.

## Error Handling

- **Domain errors:** use a `Result<T, E>` pattern for operations that can fail for expected reasons (validation, business rule violations). Do not throw for expected domain errors.
- **Unexpected errors:** throw. Let an error boundary or a global handler catch them.
- **API errors:** map to HTTP status codes with a consistent error body shape: `{ error: { code: string; message: string; details?: unknown } }`.
- **User-facing errors:** derive from API error responses. Never expose stack traces, SQL, or internal paths to users.
- **Error boundaries:** wrap major UI sections to prevent one component's failure from crashing the whole page.
- **Every async operation that can fail must handle the failure.** Unhandled promise rejections are bugs.

## Logging / Observability

- Structured logging on the server side. JSON log lines with correlation IDs.
- Client-side errors reported to the error-tracking service (Sentry, R1).
- No console.log in production code. Use a logger abstraction.
- Audit log entries for all consequential write events (see spec §17.4). Audit logging is a cross-cutting concern implemented at the API layer.

## Accessibility

- **Semantic HTML first.** Use `<button>` for buttons, `<nav>` for navigation, `<table>` for tabular data.
- **Keyboard navigation:** every interactive element is reachable and operable via keyboard.
- **Focus management:** focus is moved to new content when it appears (modals, navigation transitions).
- **Accessible names:** every interactive element has an accessible name (visible label, `aria-label`, or `aria-labelledby`).
- **Color contrast:** meets WCAG AA minimum. Enforced through design tokens.
- **Reduced motion:** respect `prefers-reduced-motion`.
- **Screen-reader announcements** for dynamic content changes (live regions for status updates, toast messages).
- The Design System centralizes accessibility behavior so individual features don't need to re-implement it. Radix, via shadcn/ui (ADR-0011), supplies most of it; hand-editing a copied component is the usual way it gets lost.

These rules are checked in review, not in CI. There is no automated accessibility gate and no conformance claim — see REQ-NFR-013 for the accepted position and what it would take to change it.

## Security

- **No secrets in the repository.** Use environment variables (instance-level) or database-stored configuration (company-level).
- **Input validation at the API boundary.** Every user-supplied value is validated before it reaches domain logic.
- **Output encoding:** rendered content (especially rich text) is sanitized before rendering.
- **Authentication:** all API endpoints except health checks and shared-password project views require authentication.
- **Authorization:** project-scoped access grants enforced at the API middleware layer. Never check authorization only in the UI.
- **SQL injection prevention:** use parameterized queries through the database adapter.
- **XSS prevention:** sanitize user-generated Markdown before rendering. Image uploads validated for type and size.
- **Dependency scanning:** automated in CI.

## Performance

- **Code splitting:** lazy-load page-level components.
- **Memoization:** use `React.memo`, `useMemo`, and `useCallback` only when profiling shows a benefit. Premature memoization adds complexity without value.
- **Bundle size:** monitor. Avoid large dependencies for trivial functionality.
- **Large data tables/lists:** use virtualization when rendering more than a few hundred rows.
- **Image optimization:** automatic resize to 2000 px max dimension (spec §7.2). Serve through the CDN or S3 public URL.
- **Measure before optimizing.** Do not optimize code that is not measurably slow.

## Dependency Policy

Before adding a dependency, answer:

1. **Is it necessary?** Can the platform or standard library solve it?
2. **Is it actively maintained?** Recent commits, responsive issues.
3. **Is it license-compatible?** MIT-compatible.
4. **Does it increase bundle/runtime complexity proportionally to its value?**
5. **Does it introduce security or supply-chain risk?**
6. **Is the API stable?** Avoid 0.x libraries for foundational functionality.
7. **Does it duplicate an existing capability already in the project?**

Do not add a library solely because a framework or an AI agent prefers it. Document the rationale for each new dependency in the PR description.

## Rules for Abstractions and Design Patterns

- **Extract when there are three or more concrete examples** of the same pattern. Not before.
- **Interfaces are introduced when there is a demonstrated need for polymorphism** — typically at architectural boundaries (persistence, search, storage). Not for every class.
- **Design patterns are not goals.** A pattern is a tool, not a requirement. Do not introduce a repository pattern for an entity with a single simple query. Do not introduce a strategy pattern when an `if` statement suffices.
- **When in doubt, inline.** It is easier to extract later than to un-extract.

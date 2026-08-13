# ADR-0008: Internal Design System Boundary

## Status

Accepted — **amended 2026-08-12**: the library it insulates against is now chosen ([ADR-0011](0011-ui-library-selection.md), shadcn/ui). The boundary and its purpose are unchanged; what the boundary contains is not.

## Date

2026-08-11

## Context

The web UI will use a React UI library for components (buttons, inputs, dialogs, tables, etc.). Importing the external library directly throughout the codebase creates several problems:

1. **Inconsistent UX:** different developers use different library components for the same purpose.
2. **Difficult library swaps:** replacing the UI library requires touching every component.
3. **AI-generated code unpredictability:** agents may import different library components for the same need.
4. **Accessibility fragmentation:** ARIA attributes and keyboard behavior are scattered.

## Decision

An **internal design-system boundary** (`src/design-system/`) wraps the chosen external UI library. Application code imports from `@project/design-system`, never directly from the external library.

**The design system exposes:**

- **Primitives:** Button, Input, Dialog, Select, DataTable, FormField, Notification, Layout components.
- **Design tokens:** colors, typography, spacing, radii, shadows, breakpoints, z-index, motion.
- **Accessibility behavior:** keyboard navigation, focus management, ARIA attributes.

**Wrapping policy:** A component is wrapped when the wrapper establishes project-level API, styling, accessibility, behavior, or replacement value. Components that are used exactly as-is from the library, in one place, with no added semantics, do not need wrappers.

**The external UI library choice is a separate decision.** It was made on 2026-08-12: [ADR-0011](0011-ui-library-selection.md) selects shadcn/ui, kept close to upstream. This boundary is what made the choice deferrable, and it survives the choice — but its character changes. shadcn/ui is copy-paste source rather than a runtime dependency, so the copied components _are_ this layer's internals rather than something it wraps. Application code still imports from `@project/design-system` and never from a component path; the wrapping policy above now reads as "the copied component plus whatever project-level API it needs", and for a good number of components that addition is nothing at all. Tailwind CSS arrives with the choice, and the design tokens listed above live in its theme.

## Alternatives Considered

### Direct imports from the UI library everywhere

Rejected: creates tight coupling, inconsistent usage, and AI agents that each pick their own favorite component.

### No design system — build all components from scratch

Rejected: impractical. Reinventing buttons, dialogs, tables, and form controls is not a good use of time for a small team.

### Fully generic component library with no project-specific opinions

Rejected: too abstract. The design system should expose the components the application actually needs, not a general-purpose component catalogue.

## Consequences

- The external UI library is an implementation detail of `src/design-system/`.
- Changing the UI library requires updating only `src/design-system/`, not the entire application.
- AI agents are instructed (in `AGENTS.md`) to use `@project/design-system` imports.
- The design system starts small (Button, Input, Dialog, Layout) and grows as needed. It does not try to wrap everything upfront.
- This is an ADR about the **boundary**, not about which library to use. The library choice is a separate decision.

# ADR-0008: Internal Design System Boundary

## Status
Accepted

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

**The external UI library choice is a separate, open decision** — it is not yet made. Candidates include shadcn/ui (code ownership + AI-friendly), MUI (comprehensive), Radix UI (headless primitives), Mantine, and Ant Design. The design-system boundary makes the choice deferrable and reversible.

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
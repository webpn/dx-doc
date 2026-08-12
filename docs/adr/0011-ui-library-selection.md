# ADR-0011: UI / Design-System Library Selection

## Status
Accepted (2026-08-12)

## Date
2026-08-11 (decided 2026-08-12)

## Context
The Platform needs a React UI component library to build the web application. The ADR-0008 design-system boundary insulates the application from the specific choice, but the choice itself must be made before R1 UI development begins.

The Platform is built by AI coding agents working against a documented public API ([ADR-0019](0019-ai-coding-agent-model.md)). That makes criterion 1 below — how predictably an agent generates correct code against the library — not one criterion among seven but the deciding one. A library that a human can use correctly and an agent cannot is, for this project, a library that does not work.

## Decision

**shadcn/ui**, built on Radix primitives and Tailwind CSS, used **close to upstream**.

Two parts, and the second matters as much as the first:

**1. shadcn/ui is the component source.** Its copy-paste model puts the component source in the repository, under `src/design-system/`. There is no vendored component library to fight, no theme engine to override, and no version of a component that exists only in the library author's head.

**2. Components stay close to upstream, and divergence is justified per component.** The default is to take a component as published and change nothing. Customisation is allowed where the application genuinely needs it, but each divergence is a deliberate, reviewable act — not a drive-by edit. This is what makes the AI-interoperability property survive contact with the codebase: an agent that knows shadcn/ui knows *this* codebase, and upstream documentation stays applicable to the code in front of it. Components rewritten to taste destroy exactly the property the library was chosen for.

**Accessibility.** Radix supplies the keyboard and ARIA behaviour, and the design tokens are defined to meet **WCAG AA contrast**. This is a design principle and a review expectation, not a certified conformance commitment — see [REQ-NFR-013](../product/requirements/REQ-NFR.md). Staying close to upstream is also the cheapest way to keep it: Radix's accessibility is in the components as published, and hand-editing them is the usual way it gets lost.

## Rationale against the criteria

| Criterion | How shadcn/ui scores |
|---|---|
| 1. AI agent compatibility | **Decisive.** Explicit component source in the repository, heavily represented in training data, documented patterns. An agent reads the component it is about to use. |
| 2. Code ownership | Total. The components are project source files. |
| 3. Component coverage | Good for tables, forms and dialogs. **Does not cover the Markdown editor or Mermaid** — see the gap below. |
| 4. Accessibility | Radix primitives; AA contrast through tokens. |
| 5. Bundle size | Only the components actually copied ship. |
| 6. Long-term maintenance | No runtime version to upgrade; the cost moves to manually pulling upstream fixes into copied components. |
| 7. Design flexibility | Full, through Tailwind tokens rather than theme overrides. |

## Consequences

- **Tailwind CSS becomes a dependency**, and the design tokens required by [ADR-0008](0008-design-system-boundary.md) (colours, typography, spacing, radii, shadows, breakpoints, z-index, motion) are defined in the Tailwind theme. Application code still consumes them through the design system, not by reaching for arbitrary Tailwind classes.
- **The design-system boundary changes character but not purpose.** With MUI, `src/design-system/` would wrap an external dependency. With shadcn/ui the copied components *are* the design system's internals. Application code still imports from `@project/design-system` and never from a component path directly; the wrapping policy in [ADR-0008](0008-design-system-boundary.md) now means "the copied component plus whatever project-level API it needs", and for many components that addition is nothing.
- **Upstream fixes are a manual pull, not an `npm update`.** This is the price of code ownership. Staying close to upstream is what keeps that pull cheap; every divergence makes it more expensive, which is the practical reason for the "close to upstream" rule, independent of the AI argument.
- **Complex tables are a separate concern.** shadcn/ui's table is presentational; sorting, filtering and virtualisation for tracking and property lists come from TanStack Table, which pairs with the [ADR-0012](0012-data-fetching-strategy.md) choice.
- **Open gap: the Markdown editor and Mermaid are not covered by this decision.** [REQ-AUTH-001](../product/requirements/REQ-AUTH.md) (full block set) and [REQ-AUTH-004](../product/requirements/REQ-AUTH.md) (Mermaid live preview) are Must requirements delivered by [M1.5](../product/milestones.md), and no shadcn/ui component addresses them. The editor engine is a distinct choice, still to be made before M1.5. It was folded into D1's criteria and should not have been — a component library and an editor engine are different decisions.

## Alternatives Considered

**MUI (Material UI)** — the strongest alternative on coverage, and it has a real Data Grid. Rejected on criterion 1: agents generate inconsistent MUI patterns across its versions and styling systems, and customisation means fighting a theme engine. The recognisable Material look is a secondary objection for a white-label product.

**Radix UI headless + custom styling** — the same accessibility foundation with no visual layer. Rejected as strictly more work than shadcn/ui for the same primitives: shadcn/ui *is* Radix with a starting visual layer, and nothing prevents dropping to Radix directly where a component needs it.

**Mantine** — rich and modern, but thinner representation in training data, which is the criterion that decided this.

**Ant Design** — comprehensive tables and forms, but heavy and strongly opinionated in a direction a white-label product does not want.

## Related Decisions
- [ADR-0008](0008-design-system-boundary.md): Design System Boundary — the wrapper that insulated the application from this choice, and whose character this decision changes.
- [ADR-0019](0019-ai-coding-agent-model.md): AI Coding Agent Model — why criterion 1 outweighs the rest.
- [ADR-0012](0012-data-fetching-strategy.md): TanStack Query for server state; TanStack Table is its companion for the table work.
- [REQ-NFR-013](../product/requirements/REQ-NFR.md): accessibility as a design principle, not a conformance gate.
- D1 in [decisions](../decisions/README.md).

## Last Responsible Moment
End of R0 (before R1 UI development begins) — met.

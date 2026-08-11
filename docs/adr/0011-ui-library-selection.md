# ADR-0011: UI / Design-System Library Selection

## Status
Proposed

## Date
2026-08-11

## Context
The Platform needs a React UI component library to build the web application. The ADR-0008 design-system boundary insulates the application from the specific choice, but the choice itself must be made before R1 UI development begins.

## Decision (to be made)

The following candidates are under consideration:

### shadcn/ui
- **Model:** Copy-paste source code; you own the components. Built on Radix primitives and Tailwind CSS.
- **Pros:** Full code ownership; AI-friendly (documented patterns, explicit code); customizable without fighting a theme engine; growing ecosystem.
- **Cons:** Requires Tailwind CSS; less "batteries included" than MUI; newer ecosystem.

### MUI (Material UI)
- **Pros:** Comprehensive component library; mature; large community; excellent documentation; data-table components (Data Grid).
- **Cons:** Material Design look is opinionated and recognizable; customization can be complex; heavy bundle; AI agents may generate inconsistent MUI patterns.

### Radix UI (headless) + custom styling
- **Pros:** Headless primitives — full styling control; excellent accessibility; composable.
- **Cons:** No built-in visual design — requires building the visual layer; more work upfront.

### Mantine
- **Pros:** Rich component set; good hooks library; modern; customizable.
- **Cons:** Smaller community than MUI; less AI training data.

### Ant Design
- **Pros:** Very comprehensive; excellent table/form components; mature.
- **Cons:** Heavy; opinionated design; primarily Chinese ecosystem.

## Criteria for Decision

1. **AI agent compatibility:** how predictably do AI coding agents generate correct code with this library?
2. **Code ownership:** can we customize behavior without fighting the library?
3. **Component coverage:** does it have everything we need (tables, forms, dialogs, rich text, Mermaid rendering)?
4. **Accessibility:** built-in ARIA support and keyboard navigation.
5. **Bundle size:** acceptable for a desktop-only application.
6. **Long-term maintenance:** active development, stable API, community health.
7. **Design flexibility:** can we achieve a custom look, or will it look like the library's default?

## Alternatives Considered

See above. The decision is genuinely open.

## Related Decisions
- ADR-0008: Design System Boundary — the wrapper that insulates the application from this choice.

## Last Responsible Moment
End of R0 (before R1 UI development begins).
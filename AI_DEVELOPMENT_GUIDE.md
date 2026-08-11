# AI Development Guide

Instructions for AI coding agents working on the dx-doc repository. This document is referenced from [`AGENTS.md`](AGENTS.md) and provides detailed workflow rules and constraints.

## Mandatory Pre-Work Checklist

Before making any code change, an agent must:

1. Read [`AGENTS.md`](AGENTS.md) — the mandatory repository-level rules.
2. Read the relevant layer documentation:
   - Domain changes: [`ARCHITECTURE.md` §Domain](ARCHITECTURE.md)
   - Application changes: [`ARCHITECTURE.md` §Application](ARCHITECTURE.md)
   - UI changes: [`ARCHITECTURE.md` §UI/Presentation](ARCHITECTURE.md)
   - API changes: [`ARCHITECTURE.md` §API](ARCHITECTURE.md)
3. Read the relevant coding rules: [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md) and [`STYLE_GUIDE.md`](STYLE_GUIDE.md).
4. Inspect existing code in the target layer. Understand the established patterns before introducing new ones.
5. Check `docs/adr/` for decisions relevant to the change.
6. Read `docs/product/functional-specification.md` if the change involves domain entities, business rules, or user-facing behavior.

## Inspecting Existing Patterns

Before creating a new component, hook, utility, or service, inspect the existing codebase:

- How are similar components structured? Follow that structure.
- How are similar hooks named and exported? Follow that convention.
- How are similar API calls made? Use the same client layer.
- How are similar domain types defined? Use the same patterns.

**Do not invent alternative patterns when an approved project pattern already exists.** Consistency is more important than personal preference.

## Change Scope

- **Make the smallest coherent change** that solves the problem. A PR that fixes a bug and also refactors an unrelated module is harder to review and riskier to merge.
- **One concern per PR.** If a change touches domain types, application use cases, API endpoints, and UI components, consider whether it can be split.
- **Avoid speculative refactors.** Do not refactor code that works unless the refactoring is directly necessary for the task at hand, or the code demonstrably violates an architectural rule.

## Generated Code Quality

AI-generated code is treated identically to human-written code. It must:

- Be idiomatic TypeScript/React. If you generate code that looks like it came from a different ecosystem, rewrite it.
- Be explicitly typed at boundaries. Public functions must have explicit return types.
- Not contain `any` unless justified and documented.
- Not duplicate existing functionality. Search the codebase before adding a new utility.
- Not introduce silent errors. Every async operation handles its failure case.
- Be reviewable. Prefer explicit, step-by-step logic over clever one-liners when the clever version is harder to understand.

## Dependencies and Libraries

- **Do not introduce a new library without explicit justification.** The justification must cite the dependency policy in [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- **Do not add a library solely because you (the agent) prefer it.** If the project already uses a solution, use it. If no solution exists yet, propose the choice with alternatives — do not just add it.
- **Do not upgrade existing dependencies** outside the scope of the task unless the upgrade is required for the change. Dependency upgrades are separate PRs.

## Architectural Boundaries

- **Do not import `react`, `react-dom`, or any UI library into `src/domain/` or `src/application/`.**
- **Do not import infrastructure implementations into domain or application code.** Use the port interfaces defined in `src/application/ports/`.
- **Do not import the external UI library directly outside `src/design-system/`.** Use `@project/design-system` imports.
- **Do not scatter raw HTTP calls in React components.** Use the API client layer.
- **Do not bypass these boundaries because it is "easier."** The boundaries exist for long-term maintainability across dozens of contributors and agents.

## Validation

After every code change, run:

```bash
npm run typecheck   # Must pass with zero errors
npm run lint        # Must pass with zero errors (warnings are acceptable only if pre-existing)
npm run format:check  # Must pass
npm test            # Must pass
```

- **Run these commands.** Do not claim they passed based on code inspection.
- **If a command fails, fix the failure.** Do not weaken configuration to make it pass.
- **Do not commit code that fails validation.**

## When You Don't Know

- **When uncertain about architecture:** stop and present the alternatives with trade-offs. Do not make an arbitrary choice. Create a proposed ADR if the decision is significant.
- **When the specification is unclear:** consult `docs/product/functional-specification.md` first. If the answer is genuinely not there, ask — do not invent requirements.
- **When a requirement conflicts with architecture:** document the conflict and propose a resolution. Do not silently pick one over the other.

## Documentation Updates

When behavior or architecture changes:

- Update the relevant documentation in the same PR.
- If a domain entity changes, update the glossary in `docs/product/glossary.md`.
- If an architectural rule changes, update [`ARCHITECTURE.md`](ARCHITECTURE.md).
- If a decision is made that affects future work, create or update an ADR in `docs/adr/`.
- Link related ADRs, issues, and PRs in commit messages and PR descriptions.

## Prohibited AI Behaviors

The following are prohibited even if not explicitly stated in every task:

- **Inventing business requirements** not present in the functional specification.
- **Converting an open decision into a decided one** without explicit authorization. Open decisions are tracked in the spec §21 and in proposed ADRs.
- **Deleting or rewriting working code** merely to make it stylistically different.
- **Silently weakening tests, types, or lint rules** to make code pass.
- **Introducing a second mechanism** for something that already has an approved mechanism (e.g., a second state-management library, a second HTTP client, a second date library).
- **Generating massive, difficult-to-review PRs.** If a task requires changes across many files, break it into logical steps.
- **Claiming validation passed without running the commands.**

## Interaction with the MCP Server

The MCP server is a layer above the REST API. When implementing MCP tools:

- MCP tools call the same REST API endpoints as the web client — they do not bypass the API.
- MCP write tools always write into the draft. They may not publish versions, delete users, or change permissions.
- MCP resources expose naming and documentation guidelines as static context.
- MCP authentication uses OAuth with user consent — the agent acts with the permissions of the consenting user.

## Interaction with Existing Project State

- **Respect the draft.** All modifications write to the draft. If a feature needs to display published content alongside draft content, it must clearly distinguish them.
- **Respect project isolation.** A query or command is always scoped to a project. Never write code that implicitly accesses entities across project boundaries.
- **Respect company tenancy.** A query or command is always scoped to a company. The company context comes from the authenticated user's session, not from request parameters.
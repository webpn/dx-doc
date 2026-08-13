# AGENTS.md

> **Read this first.** This file contains mandatory rules for every AI coding agent working on this repository. Detailed instructions live in [`AI_DEVELOPMENT_GUIDE.md`](AI_DEVELOPMENT_GUIDE.md).

## Project

**dx-doc** — an open-source, white-label platform for documenting digital analytics tracking plans. It replaces legacy wiki-based documentation with a versioned, publishable, API-first system. The web client is a **TypeScript/React** application backed by a **REST API**. A separate **MCP server** layer sits above the API for AI-agent consumption.

## Architecture: non-negotiable rules

- **Domain logic is independent of React, the browser, and the network.** It lives in `src/domain/` and `src/application/`.
- **The internal REST API is the single entry point for all writes.** The web UI, the MCP server, and all exporters consume it. Validation lives in the backend and is shared by every entry point.
- **Persistence and search sit behind interfaces.** `src/infrastructure/` contains the implementations. Domain and application code never import infrastructure implementations directly.
- **Multi-tenancy is native.** Every query and command is scoped to a company and project. Never write code that assumes a single tenant.
- **Draft vs. published is a core state distinction.** All edits accumulate in a single draft stream per project. Publication creates a snapshot. There are no parallel branches or merge workflows.
- **Immutability:** internal identifiers (separate from name and slug) never change. Stable IRIs are a deferred requirement, but the ID scheme must support them from R0.
- **No cross-project references.** An entity may only reference entities belonging to its own project.

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full architectural model.

## Before writing any code

1. Read [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md) for coding rules.
2. Read [`STYLE_GUIDE.md`](STYLE_GUIDE.md) for naming and formatting.
3. Read [`AI_DEVELOPMENT_GUIDE.md`](AI_DEVELOPMENT_GUIDE.md) for agent-specific workflows.
4. Inspect the existing code in the layer you are modifying. Match the established patterns.
5. Check `docs/adr/` for relevant architecture decisions. Do not contradict an existing ADR without updating it.
6. If the change involves a new technology, dependency, or architectural pattern, find the relevant ADR or create one.

## Changes: required validation

After every code change, run these commands and verify they pass:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

Never claim a command passed without running it.

## Prohibited practices

- **Do not import `react` or any UI-library into `src/domain/` or `src/application/`.**
- **Do not import infrastructure implementations into domain or application code.** Use the interfaces defined in the layer.
- **Do not put a business rule in a Fastify route or a route schema.** Routes are transport: HTTP in, application-service call, HTTP out. Validation is defined once in the domain and application layers and invoked by every entry point (REQ-FDN-010, ADR-0007) — a rule enforced only by a route schema is a rule the MCP server does not have.
- **Do not import design-system primitives from a component path outside `src/design-system/`.** Use `@project/design-system` imports. The design system is built on shadcn/ui (ADR-0011), so its components are source files in this repository — that makes reaching into them easy, and it is still forbidden.
- **Do not rewrite a shadcn/ui component to taste.** Components are kept close to upstream and each divergence is deliberate and justified in review. The library was chosen precisely so that what you know about it is true of this codebase; casual edits destroy that.
- **Do not scatter raw `fetch` or `axios` calls in React components.** Data access goes through the API client layer, and server state belongs to TanStack Query (ADR-0012): every read is a query, every write a mutation that invalidates what it affects. Never copy server data into client state to keep it in sync by hand.
- **Do not introduce dependencies without explicit justification.** See [`ENGINEERING_GUIDE.md` §Dependency Policy](ENGINEERING_GUIDE.md).
- **Do not use `any`** except where explicitly justified and documented with a comment explaining why `unknown` + narrowing is not practical.
- **Do not create a second solution when an approved pattern already exists.** Reuse.
- **Do not silently weaken tests or type checks** to make code pass.
- **Do not bypass architectural boundaries** to make a change easier.
- **Do not invent business requirements.** The functional specification is in `docs/product/functional-specification.md`. Do not add features, entities, or behavior not described there.
- **Do not convert an open decision into a decided one.** Open decisions are tracked in `docs/product/functional-specification.md` §21 and in `docs/adr/` ADRs marked `status: proposed`. When a decision is needed that the spec leaves open, document the alternatives and create a proposed ADR — do not choose.
- **Do not delete or rewrite working code merely to change its style.**

## When uncertain about architecture

Stop and present the alternatives with their trade-offs. Do not make an arbitrary architectural choice. Create a proposed ADR if the decision is significant.

## Documentation

When behavior or architecture changes:

- Update the relevant documentation in the same PR.
- If the change affects architectural rules, update [`ARCHITECTURE.md`](ARCHITECTURE.md).
- If the change introduces a new pattern, update [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- Link the PR to the relevant ADR or create one.

## Nested instructions

Before editing files in a subdirectory that contains its own `AGENTS.md`, read that file first. Currently, no subdirectories define additional rules; if one is added, it takes precedence for files within its scope.

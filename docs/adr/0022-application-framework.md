# ADR-0022: Application Framework and Build Tool

## Status

Accepted (2026-08-12)

## Date

2026-08-12

## Context

No decision record stated which React framework and build tool the Platform uses. [ADR-0017](0017-testing-strategy.md) assumed Vite in a parenthesis, [milestones](../product/milestones.md) recorded plainly that no framework was chosen, and [M0.1](../product/milestones.md#m01--close-the-stack-decisions)'s exit criterion — every technology choice needed to write the first line of production code is recorded and accepted — could not be met while the most consequential one was unrecorded.

The constraint that decides it is not React's. It is [ADR-0007](0007-api-as-single-entry-point.md): the REST API is the single entry point for every consumer, and _"the web UI is just another client."_ That sentence describes a single-page application talking to an HTTP API, and it was accepted long before this ADR existed.

## Decision

**Vite** builds the single-page application. **React Router** routes it. **Fastify** serves the REST API and, in production, the built client assets from the same process.

```
Vite (build)  →  static client bundle  ─┐
                                        ├─→ one Fastify process, one container
src/api/ (Fastify routes)  ─────────────┘
```

- **Development:** the Vite dev server proxies `/api` to Fastify. Two processes locally, one command.
- **Production:** Fastify serves the built assets and the API. One container plus object storage, which is what [M0.6](../product/milestones.md#m06--public-repository-readiness)'s one-command reference stack promises.
- **Fastify is transport only.** Routes translate HTTP to application-service calls and back. In particular, **validation does not move into Fastify's JSON-schema layer**: [REQ-FDN-010](../product/requirements/REQ-FDN.md#req-fdn-010--server-side-validation-shared-by-ui-api-and-mcp) requires validation defined once in the domain and application layers and invoked by every entry point, and a schema attached to a route is a second definition that only the HTTP path enforces. Schemas may describe the wire format; they may not own a business rule.

## Why this rather than Next.js

Next.js was accepted earlier the same day and reversed after working through what the rest of the record already required. The reasoning is worth keeping, because it is the reasoning that would justify revisiting.

Next.js earns its keep through Server Components fetching data directly and Server Actions handling mutations. **[ADR-0007](0007-api-as-single-entry-point.md) forbids both** — each would be a second entry point with its own validation and permission surface, which is the objection that ADR-0007 raises by name against letting the MCP server reach the backend directly. Adopting Next.js therefore meant adopting it under a standing restriction on its two defining features, leaving file-system routing, bundling and a production server: real, but no more than Vite plus a router provides.

Three things settled it:

1. **A restriction nobody can see is a restriction that erodes.** Every Next.js tutorial, every example, and every model's prior about Next.js says _fetch in the Server Component_. Under [ADR-0019](0019-ai-coding-agent-model.md) this codebase is written largely by agents, and a rule contradicted by the entire published corpus of the framework is one that gets violated in a PR that looks idiomatic and reviews clean. With Vite the rule does not need to exist: there is no server-rendering path to reach for, so the architecture is enforced by the absence of the temptation rather than by vigilance.
2. **Nothing in the product needs what was being restrained.** The application is desktop-only ([REQ-NFR-007](../product/requirements/REQ-NFR.md#req-nfr-007--desktop-only-no-responsive-layout)), behind authentication, with no SEO surface and no public landing pages. The published documentation site is a **generated artefact** (R2 distribution channels), not a server-rendered route. First-paint on an internal tool used all day by the same people is not where the performance budget lives — [REQ-NFR-001](../product/requirements/REQ-NFR.md#req-nfr-001--req-nfr-004--performance-targets)'s two seconds is about opening a tracking page, which is an API call either way.
3. **It restores [ADR-0017](0017-testing-strategy.md)'s reasoning instead of patching it.** Vitest was chosen for Vite integration, that rationale died with Next.js and had to be replaced with weaker ones, and it is now true again. Vitest shares the Vite config and transform pipeline, and no async Server Components exist to be untestable.

**When Next.js would have been right:** deploying to Vercel, needing SSR or SEO for a public surface, or wanting RSC reads badly enough to weaken ADR-0007 from _single entry point_ to _single validation pipeline_. That last one is a coherent position — it is just not the one already accepted.

## Consequences

- **Three choices instead of one**, which is the honest cost: build tool, router, HTTP server. They are independent and individually replaceable, where a framework is one coupled choice that is not.
- **React Router over TanStack Router.** TanStack Router has better type inference and would pair neatly with TanStack Query ([ADR-0012](0012-data-fetching-strategy.md)). React Router wins on the criterion this project has repeatedly called decisive ([ADR-0011](0011-ui-library-selection.md), [ADR-0019](0019-ai-coding-agent-model.md)): agents generate correct React Router code far more reliably. Revisit if type-safe routing becomes a felt need rather than a preference.
- **Fastify over Hono or Express.** Mature, strongly typed, well represented in training data, and its plugin model maps cleanly onto middleware for authentication and project-grant enforcement. Hono is lighter and would also work; Express is the weakest of the three on TypeScript ergonomics.
- **Migrations run via `npm run db:migrate` (Kysely Migrator)** — not inside the Fastify process ([ADR-0024](0024-kysely-as-persistence-query-builder.md)). Schema is applied by the operator/CI step before the process starts.
- **Pagefind index artefacts are served through an authorised Fastify route**, never from the static asset directory. [REQ-FDN-008](../product/requirements/REQ-FDN.md#req-fdn-008--search-scoping-enforced-server-side) requires project grants applied to the fetch, and anything served as a static asset is unauthenticated by construction. This trap exists under any framework; it is written down because it is easy to fall into and silent when it happens.
- **`"type": "module"` stays**, and the toolchain is ESM throughout.
- **Routing is client-side**, so the server returns `index.html` for unmatched non-API paths. A deep link into a project must work on a cold load.

## Alternatives Considered

**Next.js with RSC and Server Actions restricted** — the decision taken and reversed, above.

**Next.js used idiomatically** — rejected on [ADR-0007](0007-api-as-single-entry-point.md). It produces two write paths and two permission surfaces before R1 ends, and the import-grade API ([M1.2](../product/milestones.md#m12--import-grade-api)) stops being the path the product itself uses, which is exactly the property that makes it trustworthy for an agent to drive at [M1.4](../product/milestones.md#m14--agent-driven-pilot-import).

**Remix / React Router 7 framework mode** — same architectural tension as Next.js, no compensating advantage.

**Vite with a separate API service in its own process and container** — a defensible split, rejected for R1 as premature: it doubles the deployment surface that [M0.6](../product/milestones.md#m06--public-repository-readiness) promises to keep to one command. The layering already makes the separation possible later; nothing in the code assumes co-location beyond the process boundary.

## Related Decisions

- [ADR-0007](0007-api-as-single-entry-point.md): REST API as Single Entry Point — the constraint that decided this.
- [ADR-0006](0006-layered-architecture.md): Layered Architecture — Fastify routes live in `src/api/`.
- [ADR-0012](0012-data-fetching-strategy.md): TanStack Query owns server state in the browser.
- [ADR-0017](0017-testing-strategy.md): Vitest, whose original rationale this decision restores.
- [ADR-0019](0019-ai-coding-agent-model.md): why "a rule the published corpus contradicts" is a real cost.
- D13 in [decisions](../decisions/README.md).

## Last Responsible Moment

M0.1 — met, and it was the milestone's missing piece.

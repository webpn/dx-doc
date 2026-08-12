# Architecture

## Architectural style

The Platform follows a **modular, layered architecture** inspired by Clean Architecture and Ports & Adapters, adapted pragmatically for a TypeScript/React web application. The guiding principle: **business logic is independent of UI and infrastructure.**

The architecture is **not** a mechanical implementation of textbook Clean Architecture. It borrows the dependency rule and the concept of ports/adapters, but avoids unnecessary indirection. Interfaces are introduced when there is a demonstrated reason — not to satisfy an abstract pattern.

## Layer diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        UI / PRESENTATION                     │
│  React components, pages/routes, view hooks, UI state        │
│  Depends on: Application, Design System, Shared              │
├─────────────────────────────────────────────────────────────┤
│                        APPLICATION                           │
│  Use cases, orchestration, commands/queries, policies        │
│  Depends on: Domain, Shared                                  │
├─────────────────────────────────────────────────────────────┤
│                          DOMAIN                              │
│  Entities, value objects, business rules, domain services    │
│  Depends on: Shared (only)                                   │
├──────────────────┬──────────────────┬───────────────────────┤
│  INFRASTRUCTURE  │   API / MCP      │   DESIGN SYSTEM       │
│  Persistence     │   REST endpoints │   Component library   │
│  Search          │   MCP server     │   Tokens / theming    │
│  Object storage  │   Export gens    │   Accessibility       │
│  Auth adapters   │                  │                       │
│  Ext. services   │                  │                       │
│  Implements ports│   Depends on:    │   Depends on:         │
│  from App/Domain │   App, Infra     │   Shared              │
├──────────────────┴──────────────────┴───────────────────────┤
│                          SHARED                              │
│  Generic utilities, type helpers, constants                  │
│  No domain, UI, or infrastructure dependency                 │
└─────────────────────────────────────────────────────────────┘
```

**Dependency direction:** UI → Application → Domain. Infrastructure implements interfaces required by Application and Domain. Domain must not depend on UI or Infrastructure. The REST API layer depends on Application (to execute use cases) and Infrastructure (to wire dependencies). MCP server depends on the API layer — it is a consumer, not a parallel entry point.

## Layer responsibilities

### Domain (`src/domain/`)

Contains pure business logic with no external dependencies (no React, no browser APIs, no network, no persistence).

- **Entities:** Company, Project, Page, Flow, FlowEdge, Trigger, Tracking, DataLayerProperty, Module, TrackingTemplate, SpecificValue, Destination, CdpAudience, Survey, FreePage, Version, ChangeEntry, User, AuditEntry. Defined as plain TypeScript types/interfaces.
- **Value objects:** SpecificValue, PropertyCondition, Presence (`always` | `sometimes` | `never`), PropertyType, NavigationEvent, ProjectPlatform.
- **Domain invariants:** property composition rules (module detachment when all properties removed), specific-value placeholder validation (non-blocking warning), property identity isolation per project.
- **Domain services (only where justified):** for rules that span multiple entities without a natural home on any single one — e.g., impact analysis (which entities reference a given property).

No persistence, no network, no React. Domain types are independent of API DTOs — the mapping happens at the application/infrastructure boundary.

### Application (`src/application/`)

Orchestrates domain entities to implement use cases. Depends on Domain and on port interfaces (defined here) that Infrastructure implements.

- **Use cases / application services:** createProject, publishVersion, addTrackingProperty, removeTrackingProperty, applyModuleToTracking, bulkAddModule, duplicateTracking, generateDiff, generateChangelog, exportStaticSite, generateReconciliationReport.
- **Commands and queries:** CQRS-lite — separate command and query paths where they have different requirements, but without the overhead of separate buses unless the complexity warrants it.
- **Ports (interfaces):** `ProjectRepository`, `PropertyRepository`, `TrackingRepository`, `VersionRepository`, `SearchIndex`, `ObjectStorage`, `AuditLogger`, `EmailSender`, etc. Defined in `src/application/ports/`.
- **Policies:** module-propagation policy (opt-in, default no propagation), catalogue-inheritance policy (copy at project creation, no live link).

### Infrastructure (`src/infrastructure/`)

Implements the ports defined by Application. Contains all framework, network, persistence, and third-party-library code.

- **Persistence:** database adapters implementing repository interfaces — SQLite through R1, MariaDB and PostgreSQL from R2, selected by `DB_DRIVER` ([ADR-0020](docs/adr/0020-database-portability.md)). Query builders, dialect-portable migrations, connection pooling.
- **Search:** Pagefind adapter implementing `SearchIndex`, selected by `SEARCH_DRIVER` ([ADR-0009](docs/adr/0009-search-abstraction.md)). One index per project, served only through an authorised route. A hosted adapter is optional and additive (R3).
- **Storage:** S3-compatible adapter implementing `ObjectStorage`. Image upload, resize, serve.
- **Authentication:** OIDC, SAML, email+password, project shared-password adapters. Session management.
- **External services:** email (SMTP), error tracking (Sentry), analytics-platform APIs (R4).
- **Export generators:** static-site builder, git exporter, Confluence exporter, PDF generator, Excel exporter — all consuming the REST API.

### API (`src/api/`)

The REST API is the single entry point for all operations. The web client, MCP server, export generators, and static-site builder all consume it.

- **REST endpoints** organized by resource: `/companies`, `/projects/:id/pages`, `/projects/:id/trackings`, `/projects/:id/properties`, `/projects/:id/versions`, etc.
- **Validation:** all validation rules live here and are shared by every consumer. No validation logic duplicates between UI and API.
- **Authentication/authorization middleware:** project-scoped grants enforced at the API layer.
- **MCP server:** a layer above the REST API — not a parallel entry point. MCP tools call the same use cases through the same validation path.
- **Documented public API delivered in R3.** Until then the API is internal but structured as if it will be public.
- **Served by Fastify** (ADR-0022), which in production also serves the built client assets from the same process. A route is transport only: it translates HTTP to an application-service call and back. No business rule lives in a route file, and **validation does not move into Fastify's JSON-schema layer** — a route schema may describe the wire format, never own a rule (REQ-FDN-010).

### Design System (`src/design-system/`)

An internal component library built on **shadcn/ui** (Radix primitives + Tailwind CSS), chosen in ADR-0011. The rest of the application imports from `@project/design-system`, never from a component path directly.

Because shadcn/ui is copy-paste source rather than a runtime dependency, its components live here as project source files. They are kept **close to upstream**: taking a component as published is the default, and each divergence is deliberate and reviewable. This is what keeps agent-generated code and upstream documentation applicable to the code actually in the repository, and it is the reason the library was chosen.

- **Primitives:** Button, Input, Dialog, Select, DataTable, FormField, Notification, Layout components.
- **Design tokens:** colors, typography, spacing, radii, shadows, breakpoints, z-index, motion. Single source of truth for all visual values.
- **Accessibility behavior:** centralized keyboard navigation, focus management, ARIA attributes, screen-reader support.
- **Rationale:** consistency, centralized theming, easier future library swaps, and predictability for AI-generated code.

The design system wraps only components that need project-level API, styling, accessibility, or replacement value. Trivial components or one-off utilities do not get pointless wrappers.

### Shared (`src/shared/`)

Truly generic utilities and type helpers with no domain, UI, or infrastructure knowledge. Examples: `Result<T, E>` type, `Brand<T, B>` type, date formatting, string utilities, invariant assertions. This is intentionally small — shared must not become a dumping ground.

## Key architectural constraints

### API-first

Every piece of functionality is exposed through the REST API before any UI is built. The web client is one consumer among several. This is non-negotiable because:
- The MCP server must have the same capabilities as the UI.
- Export generators (static site, Confluence, PDF, Excel, git) consume the same API.
- The public API (R3) is not a separate implementation.

### Draft vs. published state

Every project has exactly one draft. All modifications — human or agent — write into the draft. Publication creates an immutable Version snapshot. There is no branching, no merging, no approval workflow.

This constrains the data model: version snapshots are computed at publication time and stored as read-only records. The draft is the live, mutable state. Change entries are computed by comparing the new version against the previous one.

### Multi-company tenancy

A single instance hosts multiple companies. Company is the tenant boundary. Every query and command is scoped to a company. There is no cross-company data access. Company-level configuration (branding, SMTP, catalogue) is stored in the database and editable by Admins. Instance-level configuration (database, storage, search credentials) uses environment variables.

### Immutable internal identifiers

Every entity carries an immutable internal ID, separate from its name and slug. This ID never changes, is the basis for stable IRIs, and is used for idempotent import. The slug may change; the internal ID may not.

### Validation location

All validation rules live in the backend and are enforced identically through the REST API, the MCP server, and (indirectly) the web UI. The UI may duplicate some validation for responsiveness, but the backend is the authority. A rule enforced through the UI must be equally enforced through the API.

### Concurrency

Optimistic concurrency: every mutable entity carries a version token. A save is rejected if the record was modified after the moment the user opened it. No pessimistic locking.

### Search index constraints

- Non-publishable free pages (containing test credentials and internal references) are excluded from the external search index.
- Search keys are generated server-side and scoped to the user's project grants.
- Search results must never expose content from projects the user cannot access.
- The search adapter interface supports swapping implementations without touching application code.

## State management strategy

Three categories of state:

1. **Server/remote state:** fetched from the REST API through **TanStack Query** (ADR-0012), never manually copied into global state. Every read is a query; every write is a mutation that invalidates the queries it affects. Query keys are project-scoped by convention, so cache entries cannot cross a project boundary.
2. **Local UI state:** component-local `useState`/`useReducer`. Not shared across components unless genuinely needed.
3. **URL state:** route parameters, query strings. The URL is the source of truth for navigation state.

Global state is only introduced with a documented reason. Avoid prop drilling only when it represents a real architectural problem; passing a few props is normal and fine.

## Testing strategy

| Layer | Test type | Focus |
|---|---|---|
| Domain | Unit | Pure business logic, invariants, value objects |
| Application | Unit / Integration | Use cases with mocked ports |
| Infrastructure | Integration | Repository implementations against a test database |
| API | Integration | Endpoint behavior, validation, auth |
| UI | Component | Meaningful behavior, not implementation details |
| E2E | End-to-end | Critical user journeys |

Tests assert behavior, not internal structure. Avoid tests that merely confirm React rendered a div — test what matters.

## Error handling strategy

- **Domain errors:** typed, discriminated errors returned as `Result<T, DomainError>` from domain operations.
- **Application errors:** translate domain errors into application-level responses. Add infrastructure errors (database unavailable, search down).
- **API errors:** map application errors to HTTP status codes. Consistent error response shape: `{ error: { code, message, details? } }`.
- **UI errors:** user-facing error messages derived from API error responses. Unexpected errors logged to the error-tracking service.
- Never expose internal error details to users.

## External integrations

| Integration | Release | Status |
|---|---|---|
| SQLite | R0 | Default database adapter |
| MariaDB | R2 | Database adapter |
| PostgreSQL | R2 | Database adapter |
| S3-compatible storage | R0 | Asset storage |
| Pagefind (in-process) | R0 | Search — default, no external service |
| Hosted search adapter | R3 | Search — optional, opt-in |
| OIDC SSO | R1 | Authentication |
| Project shared password | R1 | Unauthenticated read access |
| SMTP | R1 | Email notifications |
| SAML SSO | R2 | Authentication |
| Confluence Cloud API | R3 | Publication target |
| Git export | R2 | Publication target |
| Static site hosting | R2 | Publication target |
| Adobe Analytics/CJA API | R4 | Data quality signals |
| GA4 API | R4 | Data quality signals |
| PostHog API | R4 | Data quality signals |
| Figma API | R4 | Frame import |
| Sentry | R1 | Error tracking |

All integrations live in `src/infrastructure/` behind interfaces defined in `src/application/ports/`.

## Versioning and publication flow

```
Editor makes changes → Draft (mutable)
                         │
                    Publication action
                         │
                    Compute diff against previous version
                         │
                    Editor may exclude individual Trackings/Pages
                         │
                    Create Version snapshot (immutable)
                         │
                    Generate changelog (automatic)
                         │
                    Trigger distribution channels:
                    - Static site regeneration
                    - Git export (one commit)
                    - Confluence update (R3)
                    - Email notification
```

There is no branching, no merging, no approval workflow. Excluded items are not remembered for the next publication — the decision is made afresh each time.

## Rules for introducing new architectural concepts

- New layers must have a demonstrated reason. Do not add a layer because a pattern book suggests it.
- New abstractions must be extracted from working code, not designed in advance. Extract when there are three or more concrete examples.
- New dependencies must satisfy the dependency policy in [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- Architectural changes must be recorded in an ADR.
- If a pattern appears only in one place, it is probably not a pattern yet.
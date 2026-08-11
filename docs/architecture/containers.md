# Container Architecture

Describes the deployable containers/services that compose the dx-doc Platform.

## Container Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Browser (Desktop)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Single-Page Application (React)               │  │
│  │  Pages │ Components │ Design System │ State Management    │  │
│  └───────────────────────────┬───────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Server (Node.js)                   │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   REST API      │  │   MCP Server     │  │  Static File  │  │
│  │   (Express/     │  │   (HTTP/SSE)     │  │  Serving      │  │
│  │    Fastify)     │  │                  │  │  (SPA assets)  │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────────────┘  │
│           │                    │                                  │
│           └────────────────────┘                                  │
│                    │   Shared Application Layer                   │
│                    │   Domain Logic                               │
│                    │                                              │
│  ┌─────────────────┼──────────────────────────────────────────┐  │
│  │         Infrastructure Adapters                              │  │
│  │                                                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │  │
│  │  │ MariaDB  │ │ Algolia  │ │   S3     │ │ OIDC / SAML  │   │  │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │   Adapter    │   │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │  │
│  └───────┼────────────┼────────────┼──────────────┼───────────┘  │
└──────────┼────────────┼────────────┼──────────────┼──────────────┘
           │            │            │              │
           ▼            ▼            ▼              ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │ MariaDB  │ │  Algolia  │ │   S3     │ │   Identity   │
    │          │ │           │ │ Storage  │ │   Provider   │
    └──────────┘ └──────────┘ └──────────┘ └──────────────┘
```

## Containers

### Web Application (React SPA)

- **Runtime:** Browser (desktop only, `browserslist >5%`)
- **Responsibilities:** UI rendering, client-side routing, view-specific state, optimistic updates
- **Communicates with:** Application Server via REST API (HTTPS)
- **Packaging:** Static assets served by the application server or a CDN

### Application Server (Node.js)

- **Runtime:** Node.js 20 LTS
- **Responsibilities:**
  - REST API: validation, authentication, authorization, request routing
  - MCP Server: Model Context Protocol over HTTP/SSE, a layer above the REST API
  - Application layer: use case orchestration, command/query execution
  - Domain logic: business rules and invariants
  - Infrastructure: persistence, search, storage, authentication, email, exports
- **Communicates with:** MariaDB (SQL over TCP), Algolia (REST), S3 (REST), OIDC/SAML providers, SMTP server
- **Packaging:** Node.js process, configured via environment variables

### Database (MariaDB)

- **Purpose:** Primary data store for all entities, versions, audit logs, and company-level configuration
- **Multi-tenancy:** company-scoped data through `company_id` foreign keys on all tenant entities
- **Migrations:** forward-only versioned migrations executed at application start-up (O7)
- **Backup:** responsibility of the operator; git export provides partial off-site copy (R2)

### Search Index (Algolia)

- **Purpose:** Full-text and fuzzy search within a project
- **Index design:** single index with `project_id` facet; project-scope filtering enforced server-side
- **Exclusions:** non-publishable free pages are excluded from the index
- **Key management:** admin API key server-side only; search keys generated scoped to user's project grants
- **Abstraction:** behind an interface (`SearchIndex`) in the application layer; a self-hostable adapter may be added later (O12)

### Object Storage (S3-compatible)

- **Purpose:** Asset storage — uploaded images, exported files
- **Operations:** upload (with resize to 2000px max), serve (through signed URL or public CDN)
- **Abstraction:** behind an interface (`ObjectStorage`) in the application layer

## Cross-cutting Concerns

### Authentication and Authorization

- Authentication middleware at the API layer, before any request reaches application logic.
- Session-based for browser clients; token-based for MCP/API clients (R3).
- Authorization: project-scoped access grants enforced at the API middleware. Every query/command is filtered by the user's project grants.
- Shared password access: a separate middleware that validates the project-level password and grants read-only Viewer access to that project only.

### Audit Logging

- Append-only audit entries for all write events (create, update, delete, publish, export, permission changes).
- 24-month retention, configurable.
- Implemented as a cross-cutting concern — audit entries are recorded at the API layer, not scattered through domain logic.

### Error Tracking

- Unexpected errors reported to Sentry (R1).
- Domain errors are not reported as exceptions — they are expected outcomes.
- Correlation ID attached to each request, propagated through logs.

### Configuration

- **Instance-level:** environment variables for infrastructure credentials (database, S3, Algolia, identity providers, SMTP fallback, analytics service accounts). Set by the operator.
- **Company-level:** branding, SMTP overrides, catalogue defaults. Stored in the database, editable by Admins. (O10 — split to be confirmed.)
- See `docs/product/functional-specification.md` Appendix C for the full variable reference.

## Deployment

The Platform is a white-label product deployed by each organisation. A reference deployment stack is provided but deployment is not prescribed. The reference stack uses:

- Node.js application server
- MariaDB (managed or self-hosted)
- S3-compatible storage (any provider)
- Algolia (hosted)

The application is a single Node.js process serving the REST API, the MCP server, and the SPA's static assets. It can be deployed on a single server, a container orchestrator (Docker Compose, Kubernetes), or a PaaS — the only requirements are a Node.js runtime, a MariaDB connection, S3 credentials, and environment variables.
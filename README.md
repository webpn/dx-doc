<p align="center">
  <img src="docs/assets/dx-doc-logo.jpg" alt="dx-doc logo" width="240" />
</p>

# dx-doc — Tracking Documentation Platform

**Status:** R1 (MVP) in its completion phase — backend and client foundation complete, authoring and consultation UI in progress

## What we are building

**dx-doc is the single source of truth for digital analytics tracking documentation within an organisation.**

It is a self-hosted, open-source, white-label platform that documents _tracking plans_ for websites and mobile applications. A tracking plan answers three questions about a digital product:

1. **What fires where?** — which pages/screens exist, and which tracking events (page views, clicks, form submissions, user errors) are attached to them.
2. **What data does it carry?** — the data-layer properties each event sends, their meaning, format, origin, allowed values, and examples.
3. **Where does it go?** — how those properties map onto analytics platforms (Adobe Analytics, CJA, GA4, PostHog).

dx-doc turns that documentation into a **structured, versioned, publishable, API-first system** — instead of a set of hand-maintained wiki pages.

## Why it exists

dx-doc exists to give you a **solid, purpose-built application for documenting everything related to trackings** — tailor-made for this use case, rather than a pile of Word/Excel documents (like an Adobe SDR) or a generic wiki.

A generic tool can hold the content, but it doesn't understand it. dx-doc is built around the tracking domain, so it can do what a document or a wiki cannot:

- **Structured, not free-form** — pages, trackings, data-layer properties, and destinations are first-class entities with defined relationships, not paragraphs.
- **Versioned** — a draft → published model with an automatically generated diff and changelog.
- **Navigable** — the page hierarchy and journeys are exposed in the sidebar, not buried in a document.
- **Machine-readable** — a complete API and MCP surface, so anything doable in the UI is doable by a machine.
- **Cost-effective to read** — read access without a licensed account, via project shared passwords.

dx-doc is **not** an analytics tool (it documents, it doesn't report), **not** a project-management tool, and **not** the tracking implementation itself — it describes what must be implemented.

## Who it's for

| Persona                 | What they need                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **Tracking specialist** | Owns the docs — efficient authoring, templates, bulk operations, publication workflow |
| **Digital analyst**     | Understands what data to expect in the analytics platform and how to interpret it     |
| **Business user / PM**  | Reviews flows and trackings at a high level; knows what's in each release             |
| **Developer**           | Knows exactly which trackings to implement — which properties, which values           |
| **Designer**            | Understands which interactions are tracked, anchored to screenshots                   |

## The goal of the first release (R1)

R1 is the MVP: a complete, usable platform for authoring, versioning, and publishing tracking documentation. Concretely, R1 delivers:

- The full structured data model (pages, trackings, data-layer properties, modules, destinations, and more).
- A rich authoring editor with Markdown and image upload. Mermaid blocks are stored from R1 and rendered as diagrams from R2.
- **Draft → published versioning** with an automatically generated diff and changelog.
- Search over specific values — _"which tracking sets this value?"_ is answerable.
- A complete REST API and MCP surface — anything doable in the UI is doable by a machine.
- Read access without a licensed account, via project shared passwords.
- An append-only audit log.

The detailed, enumerated definition of R1 scope lives in the [R1 minimum requirements](docs/product/minimum-requirements.md).

## Current Status

**R0 is complete. R1 is in its completion phase** ([M1.11–M1.18](docs/product/milestones.md)).

What exists:

- The full R1 data model — pages, trackings, properties, modules, destinations, specific values, templates, free pages, flows and triggers — persisted through repository ports over SQLite, with the composition rules enforced in a dependency-free domain layer.
- Application services carrying validation and permissions, and an **assembled server**: ~93 REST route handlers plus `GET /api/health` and `GET /api/ready`, an MCP JSON-RPC surface with 40 tools, the publication and changelog pipeline, project-scoped search indexing, shared-password access and the audit-log store.
- Access administration — project grants have permission-gated, audited write paths — and company-scoped catalogue reads.
- The client foundation: a design system built on shadcn/ui, the authentication flow, and the authenticated application shell.

What does not yet exist:

- **The authoring editor** — Markdown authoring with image upload (M1.16).
- **The consultation, search and publication UI** (M1.17).

> **Not production-hardened.** The application assembles and runs, but do not expose an instance holding real documentation to an untrusted network yet. There is no request rate limiting, no CSRF protection and no security response headers; batch writes are not transactional; and the optimistic-concurrency check is read-compare-write rather than an atomic guarded update. See [SECURITY.md](SECURITY.md) for the full implemented-versus-planned split.

The source of truth for what is scheduled is [docs/product/milestones.md](docs/product/milestones.md).

## Prerequisites

- Node.js 22 LTS or later
- npm 10 or later
- S3-compatible object storage (e.g., MinIO for local development); Docker for the reference stack

No database server is required: the default adapter is SQLite. MariaDB and PostgreSQL adapters arrive in R2, selected with `DB_DRIVER`.

> **Backup is the operator's responsibility.** The Platform provides no backup mechanism. With the SQLite adapter, that means the database file — take a file-level snapshot on a schedule you are comfortable with, and always before upgrading.

## Local Setup

```bash
# Clone the repository
git clone <repo-url>
cd dx-doc

# Install dependencies
npm ci

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your local settings

# Run database migrations
npm run db:migrate

# Start development server (Vite on :5173, API on :3001)
npm run dev
```

## Reference deployment (Docker)

The reference stack is an example, not a supported production packaging. It
runs the app in one container (serving the API and the built client) next to
S3-compatible object storage; SQLite and Pagefind are self-contained, so no
database or search container is needed.

```bash
docker compose up -d --build
```

- App: <http://localhost:3001> (health check `GET /api/health`)
- Object storage (MinIO console): <http://localhost:9001>

Backup is the operator's job: the reference stack mounts the SQLite database on
a named volume — take a file-level snapshot of that file on a schedule you are
comfortable with, and always before upgrading.

For host-side local development only (SMTP catcher + object storage, run the
app yourself with `npm run dev`):

```bash
docker compose up -d mailpit minio minio-init
```

## Data flow (third-party data-flow statement)

This statement enumerates every external service a running instance may
contact, what is sent, and what is never sent (REQ-FDN-021). It changes in the
same pull request as any change to an outbound integration.

For a **stock instance** (SQLite, Pagefind, no SMTP/Sentry/SSO configured),
**no documentation content leaves the instance** except to the object storage
the operator configured (`STORAGE_S3_*`). Assets are uploaded to that storage
and read back from it; nothing else is contacted.

| Integration                                    | When it is contacted                | What is sent                                                | Default                           |
| ---------------------------------------------- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| Object storage (S3-compatible, `STORAGE_S3_*`) | asset upload/read                   | documentation assets the operator configured to store there | Required                          |
| SMTP (`SMTP_*`)                                | password reset                      | the recipient address and the email body                    | Off — no email is sent without it |
| Error tracking (Sentry, `SENTRY_DSN`)          | unhandled errors                    | error context (no documentation content, no personal data)  | Off                               |
| Identity providers (OIDC/SAML, R2+)            | SSO login                           | an authorization code / assertion                           | Off                               |
| Search (hosted adapter, R3+)                   | search                              | query terms and indexed content                             | Off — Pagefind is local           |

Documentation content is **never** sent to: search (default is local), email
(the content itself is not emailed), or any analytics/telemetry service. Test
credentials and other non-publishable content never leave the instance under
any configuration (REQ-SEC-012).

## Environment Variables

Instance-level configuration only — infrastructure and operator secrets. Per-company configuration (SSO connection details, supported login methods, supported locales, branding, catalogue defaults, SMTP override) is set by each company's Admin through the web UI and stored in the database, not here — see [ADR-0014](docs/adr/0014-configuration-split.md). The full set, with defaults, lives in [`.env.example`](.env.example); this table is kept in sync with it (REQ-FDN-013).

| Variable                                                                                                          | Required                               | Default                 | Purpose                                                                                         |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `APP_URL`                                                                                                         | Yes                                    | —                       | Public base URL; also derives the OIDC redirect URI                                             |
| `APP_SECRET`                                                                                                      | Yes                                    | —                       | Reserved for session signing and company-secret encryption; required at boot but not yet consumed |
| `APP_ENV`                                                                                                         | No                                     | `development`           | Runtime environment                                                                             |
| `APP_DEFAULT_LOCALE`                                                                                              | No                                     | `en`                    | Interface language fallback before any company context exists                                   |
| `DB_DRIVER`                                                                                                       | No                                     | `sqlite`                | Persistence adapter: `sqlite` (default), `mariadb` or `postgres` (R2)                           |
| `DB_FILE`                                                                                                         | If `DB_DRIVER=sqlite`                  | `./var/db/dxdoc.sqlite` | SQLite database file path                                                                       |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`                                                         | If `DB_DRIVER` is `mariadb`/`postgres` | —                       | Server database connection (R2)                                                                 |
| `DB_POOL_SIZE`, `DB_SSL_MODE`                                                                                     | No                                     | `10`, `preferred`       | Server database tuning (R2)                                                                     |
| `PORT`                                                                                                            | No                                     | `3001`                  | Port the API server listens on                                                                  |
| `HOST`                                                                                                            | No                                     | `127.0.0.1`             | Interface the API server binds to; set to `0.0.0.0` in containers                                |
| `STORAGE_S3_ENDPOINT`, `STORAGE_S3_REGION`, `STORAGE_S3_BUCKET`, `STORAGE_S3_ACCESS_KEY`, `STORAGE_S3_SECRET_KEY` | Yes                                    | —                       | S3-compatible object storage (AWS S3, MinIO, Backblaze B2; not Cloudinary — see `.env.example`) |
| `STORAGE_S3_FORCE_PATH_STYLE`                                                                                     | No                                     | `true`                  | Required by providers using path-style addressing (MinIO, B2)                                   |
| `STORAGE_PUBLIC_BASE_URL`                                                                                         | No                                     | —                       | Public URL prefix for stored assets, if different from the endpoint                             |
| `UPLOAD_MAX_BYTES`                                                                                                | No                                     | `10485760`              | Maximum asset upload size                                                                       |
| `IMAGE_MAX_DIMENSION`                                                                                             | No                                     | `2000`                  | Automatic image resize threshold, px per side                                                   |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`                                                               | Yes (first run)                        | —                       | Read once, against an empty database, to create the first `instance_admin`                      |
| `SEARCH_DRIVER`                                                                                                   | No                                     | `pagefind`              | Search adapter; a hosted adapter (e.g. Algolia) arrives R3                                      |
| `SEARCH_INDEX_PATH`                                                                                               | No                                     | `./var/search`          | Pagefind index location on local disk                                                           |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`                                                                         | No                                     | —                       | Instance-wide email fallback; a company may override in the database                            |
| `SMTP_PORT`                                                                                                       | No                                     | `587`                   | SMTP transport port                                                                              |
| `SMTP_FROM`                                                                                                       | No                                     | `noreply@localhost`     | SMTP "from" address                                                                              |
| `SMTP_TLS`                                                                                                        | No                                     | `true`                  | SMTP transport security                                                                         |
| `SENTRY_DSN`                                                                                                      | No                                     | —                       | Error tracking (R1); the application runs normally with none configured                         |
| `AUDIT_RETENTION_MONTHS`                                                                                          | No                                     | `24`                    | Audit log retention                                                                             |
| `AUTH_SESSION_TTL`                                                                                                | No                                     | `8h`                    | Session expiry                                                                                  |
| `INSTANCE_ADMIN_STEPUP_TTL_MINUTES`                                                                               | No                                     | `15`                    | Lifetime of an instance-admin step-up window (ADR-0027)                                         |
| `LOG_LEVEL`                                                                                                       | No                                     | `info`                  | Structured log verbosity                                                                        |

## Development Commands

| Command                | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `npm run dev`          | Start development server (Vite + API)                               |
| `npm run start`        | Start the API/production server (Fastify, serves the built client)  |
| `npm run build`        | Production build (typecheck + Vite)                                 |
| `npm run typecheck`    | TypeScript type checking                                            |
| `npm run lint`         | ESLint static analysis                                              |
| `npm run format`       | Prettier formatting                                                 |
| `npm run format:check` | Check formatting without writing                                    |
| `npm test`             | Unit and component tests                                            |
| `npm run test:coverage` | **Not yet configured** — placeholder                               |
| `npm run test:e2e`     | End-to-end tests                                                    |
| `npm run db:migrate`   | Apply pending schema migrations (Kysely Migrator; run before `dev`) |
| `npm run db:seed:demo` | **Not yet configured** — placeholder                                |
| `npm run docs:check-links`    | Verify documentation cross-references (CI gate)               |
| `npm run docs:sync-links`     | Rewrite ID-based documentation links to current paths          |
| `npm run docs:check-index`    | Verify `docs/INDEX.md` is current (CI gate)                    |
| `npm run docs:generate-index` | Regenerate `docs/INDEX.md`                                      |

## Architecture Overview

The Platform follows a modular architecture with clear separation between:

- **Domain** — business logic independent of UI and infrastructure
- **Application** — use cases, orchestration, commands/queries
- **Infrastructure** — persistence, search, storage, authentication, third-party services
- **API** — REST API consumed by the web client, MCP server, and export generators; served by Fastify
- **Design System** — internal component library built on shadcn/ui, kept close to upstream
- **App / UI** — React single-page application built with Vite, routed by React Router, with TanStack Query owning server state

**Key architectural constraints:**

- Persistence behind repository ports; SQLite by default, MariaDB and PostgreSQL adapters in R2. The schema stays within a portable SQL subset.
- S3-compatible object storage behind an interface
- Search behind an interface; Pagefind by default, so a stock instance sends no documentation content anywhere
- Internal REST API consumed by all clients; MCP server is a layer above it. In production one process serves both the API and the client assets — one container plus object storage.
- Content can be imported from other platforms through the public API — no source-format-specific import code ships in the product. Bulk ingestion is idempotent, keyed on a custom id.
- Multi-company tenancy on a single instance
- Single draft stream per project; no branches or merge workflows
- All validation in the backend, shared by UI, API and MCP

## Documentation Map

| Document                                                                               | Purpose                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`AGENTS.md`](AGENTS.md)                                                               | Mandatory rules for AI coding agents                          |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                                   | Architectural style, layers, and rationale                    |
| [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md)                                         | Technical constitution and coding rules                       |
| [`STYLE_GUIDE.md`](STYLE_GUIDE.md)                                                     | Naming, formatting, and code style                            |
| [`AI_DEVELOPMENT_GUIDE.md`](AI_DEVELOPMENT_GUIDE.md)                                   | AI agent workflows and constraints                            |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                                                   | Contribution workflow and review expectations                 |
| [`SECURITY.md`](SECURITY.md)                                                           | Security policy and vulnerability reporting                   |
| [`docs/product/functional-specification.md`](docs/product/functional-specification.md) | Complete functional specification                             |
| [`docs/product/vision.md`](docs/product/vision.md)                                     | Product vision and strategic context                          |
| [`docs/product/scope.md`](docs/product/scope.md)                                       | In-scope, out-of-scope, deferred                              |
| [`docs/product/minimum-requirements.md`](docs/product/minimum-requirements.md)         | The enumerated R1 minimum requirements — what R1 must deliver |
| [`docs/product/glossary.md`](docs/product/glossary.md)                                 | Domain terminology                                            |
| [`docs/product/personas.md`](docs/product/personas.md)                                 | Personas and system roles                                     |
| [`docs/product/user-stories.md`](docs/product/user-stories.md)                         | What each persona needs to get done, traced to requirements   |
| [`docs/product/milestones.md`](docs/product/milestones.md)                             | Delivery milestones, critical path, and release gates         |
| [`docs/product/requirements/`](docs/product/requirements/)                             | Traceable requirements, by area, with acceptance criteria     |
| [`docs/architecture/system-context.md`](docs/architecture/system-context.md)           | System context and external integrations                      |
| [`docs/architecture/containers.md`](docs/architecture/containers.md)                   | Container/service-level architecture                          |
| [`docs/architecture/deployment.md`](docs/architecture/deployment.md)                   | Deployment model and reference stack                          |
| [`docs/adr/`](docs/adr/)                                                               | Architecture Decision Records                                 |
| [`docs/testing/`](docs/testing/)                                                       | Testing strategy and conventions                              |

## License

MIT — see [LICENSE](LICENSE).

This is an open-source, white-label product. It is intended to be usable, improvable and deployable by any organisation. All environment-specific integration is configuration-driven, and no organisation-specific naming or branding is hard-coded.

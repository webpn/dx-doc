# dx-doc — Tracking Documentation Platform

**Status:** Pre-R0 — repository scaffolding and documentation foundation

## Purpose

An open-source, white-label platform that replaces legacy wiki-based tracking documentation for digital analytics. The Platform documents tracking plans for websites and mobile applications — the pages/screens that compose a product, the tracking events attached to them, the data layer properties those events carry, how those properties map onto analytics platforms, and the publication of that documentation to different audiences in a versioned, auditable way.

## Current Status

- Functional specification complete (see `docs/product/functional-specification.md`)
- Architecture and engineering foundation documents in progress
- No application code yet; the repository is being scaffolded for R0

## Prerequisites

- Node.js 20 LTS or later
- npm 10 or later
- S3-compatible object storage (e.g., MinIO for local development)

No database server is required: the default adapter is SQLite. MariaDB and PostgreSQL adapters arrive in R2, selected with `DB_DRIVER`.

> **Backup is the operator's responsibility.** The Platform provides no backup mechanism. With the SQLite adapter, that means the database file — take a file-level snapshot on a schedule you are comfortable with, and always before upgrading.

## Local Setup

```bash
# Clone the repository
git clone <repo-url>
cd dx-doc

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your local settings

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint static analysis |
| `npm run format` | Prettier formatting |
| `npm run format:check` | Check formatting without writing |
| `npm test` | Unit and component tests |
| `npm run test:e2e` | End-to-end tests |

## Architecture Overview

The Platform follows a modular architecture with clear separation between:

- **Domain** — business logic independent of UI and infrastructure
- **Application** — use cases, orchestration, commands/queries
- **Infrastructure** — persistence, search, storage, authentication, third-party services
- **API** — REST API consumed by the web client, MCP server, and export generators
- **Design System** — internal component library for consistent UX
- **App / UI** — React-based web application

**Key architectural constraints:**
- Persistence behind repository ports; SQLite by default, MariaDB and PostgreSQL adapters in R2. The schema stays within a portable SQL subset.
- S3-compatible object storage behind an interface
- Search behind an interface; Pagefind by default, so a stock instance sends no documentation content anywhere
- Internal REST API consumed by all clients; MCP server is a layer above it
- No source-format-specific import code. Legacy content is migrated by an agent driving the public API, producing a committed re-runnable script.
- Multi-company tenancy on a single instance
- Single draft stream per project; no branches or merge workflows
- All validation in the backend, shared by UI, API and MCP

## Documentation Map

| Document | Purpose |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Mandatory rules for AI coding agents |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Architectural style, layers, and rationale |
| [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md) | Technical constitution and coding rules |
| [`STYLE_GUIDE.md`](STYLE_GUIDE.md) | Naming, formatting, and code style |
| [`AI_DEVELOPMENT_GUIDE.md`](AI_DEVELOPMENT_GUIDE.md) | AI agent workflows and constraints |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution workflow and review expectations |
| [`SECURITY.md`](SECURITY.md) | Security policy and vulnerability reporting |
| [`docs/product/functional-specification.md`](docs/product/functional-specification.md) | Complete functional specification |
| [`docs/product/vision.md`](docs/product/vision.md) | Product vision and strategic context |
| [`docs/product/scope.md`](docs/product/scope.md) | In-scope, out-of-scope, and deferred |
| [`docs/product/glossary.md`](docs/product/glossary.md) | Domain terminology |
| [`docs/product/personas.md`](docs/product/personas.md) | Personas and system roles |
| [`docs/product/user-stories.md`](docs/product/user-stories.md) | What each persona needs to get done, traced to requirements |
| [`docs/product/milestones.md`](docs/product/milestones.md) | Delivery milestones, critical path, and release gates |
| [`docs/product/requirements/`](docs/product/requirements/) | Traceable requirements, by area, with acceptance criteria |
| [`docs/architecture/system-context.md`](docs/architecture/system-context.md) | System context and external integrations |
| [`docs/architecture/containers.md`](docs/architecture/containers.md) | Container/service-level architecture |
| [`docs/architecture/deployment.md`](docs/architecture/deployment.md) | Deployment model and reference stack |
| [`docs/adr/`](docs/adr/) | Architecture Decision Records |
| [`docs/testing/`](docs/testing/) | Testing strategy and conventions |

## License

MIT — see [LICENSE](LICENSE).

This is an open-source, white-label product. It is intended to be usable, improvable and deployable by any organisation. All environment-specific integration is configuration-driven, and no organisation-specific naming or branding is hard-coded.
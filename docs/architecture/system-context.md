# System Context

Describes the dx-doc Platform in its environment: who uses it, what external systems it interacts with, and the boundaries of the system.

## System Boundary

```
┌──────────────────────────────────────────────────────────────────────┐
│                        dx-doc PLATFORM                               │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Web UI   │  │ MCP      │  │ Export       │  │ API            │  │
│  │ (React)  │  │ Server   │  │ Generators   │  │ (REST)         │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └───────┬────────┘  │
│       │              │              │                   │           │
│       └──────────────┴──────────────┴───────────────────┘           │
│                          │   Internal REST API                       │
│                          ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Application Layer                          │   │
│  │  Use cases, commands, queries, policies                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Domain Layer                              │   │
│  │  Entities, value objects, business rules                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Infrastructure Layer                         │   │
│  │  Persistence │ Search │ Storage │ Auth │ Email │ Export       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Users

| User type | Access mode | Authentication |
|---|---|---|
| Tracking specialist / Analytics engineer | Write (Editor) | SSO (OIDC), email+password |
| Digital analyst | Read (Viewer) | SSO (OIDC), email+password |
| Business user | Read (Viewer) | SSO (OIDC), email+password |
| Web/App developer | Read (Viewer) | SSO (OIDC), email+password, project shared password |
| Designer | Read (Viewer) | SSO (OIDC), email+password, project shared password |
| Product manager / Owner | Read + user management on own projects (Project Manager) | SSO (OIDC), email+password |
| Company admin | Full within one company (Admin) | SSO (OIDC), email+password |
| System administrator | Instance-wide, no content access (`instance_admin`) | email+password, always available |
| AI Agent (MCP) | Per consenting user's permissions | OAuth (user consent) |
| Unauthenticated viewer | Read (Viewer) on projects with shared password | Project-level shared password |

## External Systems — Current (R0–R1)

| System | Purpose | Interface | Direction |
|---|---|---|---|
| Database (SQLite default; MariaDB/PostgreSQL R2) | Primary data store | Local file or SQL over TCP | Internal (write/read) |
| S3-compatible object storage | Asset storage (images) | S3 API (HTTP) | Internal (write/read) |
| Search index (Pagefind) | Full-text search index | In-process; index artefacts on local disk | **Not external** — no network egress |
| OIDC Identity Provider | SSO authentication | OpenID Connect | Inbound (auth) |
| SMTP Server | Email notifications | SMTP | Outbound |
| Sentry | Error tracking | SDK / HTTP | Outbound |

## External Systems — Future

| System | Release | Purpose | Interface |
|---|---|---|---|
| SAML Identity Provider | R2 | SSO authentication | SAML 2.0 |
| Git Repository | R2 | Git export target | Git over HTTPS/SSH |
| Static Site Host | R2 | Published documentation hosting | File upload / git push |
| Confluence Cloud | R3 | Published documentation target | Confluence REST API |
| Adobe Analytics / CJA API | R4 | Data quality signals | Adobe I/O API |
| GA4 API | R4 | Data quality signals | Google Analytics Data API |
| PostHog API | R4 | Data quality signals | PostHog REST API |
| Figma API | R4 | Frame import | Figma REST API |
| Corporate Data Warehouse | R5 | Semantic layer export | File export (OWL/RDF) |

## Integration Boundaries

### Data Flow: Publication

```
Editor publishes → REST API → Application Layer
                               ├── Create Version snapshot (database)
                               ├── Generate changelog
                               ├── Update search index → Pagefind
                               ├── Send email notification → SMTP
                               ├── Regenerate static site → Static Host (R2)
                               ├── Git export → Git Repository (R2)
                               └── Confluence update → Confluence Cloud (R3)
```

### Data Flow: MCP Agent Interaction

```
AI Agent → MCP Protocol → MCP Server → REST API (same as web client)
                                          ├── Draft writes (database)
                                          └── Read queries (database/search)
```

### Data Flow: Import

```
Source system export (e.g. Markdown & CSV ZIP) → AI agent → committed import script → REST API
                                                       └── Create entities (database)
                                                       └── Upload assets (S3)
                                                       └── Index (Pagefind)
```

## Constraints from External Systems

- **Database:** repository ports with a SQLite adapter by default; MariaDB and PostgreSQL from R2. Schema must support multi-tenancy natively and stay within a portable SQL subset.
- **Search:** Pagefind by default — in-process, no account, no egress ([ADR-0009](../adr/0009-search-abstraction.md)). Indices must exclude non-publishable free pages, and index artefacts must be served only through a route applying the caller's project grants. Two capability gaps are open decision O14: no typo tolerance, and the index is built rather than updated per record. An optional hosted adapter (R3) reintroduces the scoped-key obligation and changes the data-flow statement (REQ-FDN-021).
- **S3:** any S3-compatible provider. Path-style access must be supported. Public base URL for CDN is optional.
- **OIDC:** each company connects its own identity provider; connection details are company-level, stored encrypted in the database, not an instance-wide credential ([ADR-0014](../adr/0014-configuration-split.md)). SAML is added in R2 for generality, same model.
- **SMTP:** instance-level fallback; per-company SMTP settings in the database override it ([ADR-0014](../adr/0014-configuration-split.md)).

## Security Boundaries

- **Public internet ↔ Platform:** HTTPS only. Authentication required for all endpoints except health checks and shared-password project views.
- **Platform ↔ Database:** internal network. TLS where available.
- **Platform ↔ search:** none by default — the index is in-process and never leaves the instance. Index artefacts are served through an authorised route, so a client requesting another project's index receives a 403. With an optional hosted adapter (R3), the admin key stays server-side and per-request search keys are scoped.
- **Platform ↔ S3:** access key + secret key. IAM role in production.
- **Non-publishable content boundary:** free pages marked non-publishable are never included in any artefact or index (static site, Confluence, git export, PDF, search index). Standing requirement, re-verified per channel — REQ-SEC-012.
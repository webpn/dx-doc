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
| Admin | Full (Admin) | SSO (OIDC), email+password |
| AI Agent (MCP) | Per consenting user's permissions | OAuth (user consent) |
| Unauthenticated viewer | Read (Viewer) on projects with shared password | Project-level shared password |

## External Systems — Current (R0–R1)

| System | Purpose | Interface | Direction |
|---|---|---|---|
| MariaDB | Primary data store | SQL over TCP | Internal (write/read) |
| S3-compatible object storage | Asset storage (images) | S3 API (HTTP) | Internal (write/read) |
| Algolia | Full-text search index | REST API | Internal (write/read) |
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
                               ├── Create Version snapshot (MariaDB)
                               ├── Generate changelog
                               ├── Update search index → Algolia
                               ├── Send email notification → SMTP
                               ├── Regenerate static site → Static Host (R2)
                               ├── Git export → Git Repository (R2)
                               └── Confluence update → Confluence Cloud (R3)
```

### Data Flow: MCP Agent Interaction

```
AI Agent → MCP Protocol → MCP Server → REST API (same as web client)
                                          ├── Draft writes (MariaDB)
                                          └── Read queries (MariaDB/Algolia)
```

### Data Flow: Migration

```
Legacy Wiki Export (Markdown & CSV ZIP) → Importer → REST API
                                                       └── Create entities (MariaDB)
                                                       └── Upload assets (S3)
                                                       └── Index (Algolia)
```

## Constraints from External Systems

- **MariaDB:** single database target. Schema must support multi-tenancy natively.
- **Algolia:** indices must exclude non-publishable free pages. Search keys must be server-side scoped to user's project grants. A self-hostable adapter may be required before public release (O12).
- **S3:** any S3-compatible provider. Path-style access must be supported. Public base URL for CDN is optional.
- **OIDC:** must work with the corporate identity provider. SAML is added in R2 for generality.
- **SMTP:** instance-level fallback; per-company SMTP settings in the database override it (O10).

## Security Boundaries

- **Public internet ↔ Platform:** HTTPS only. Authentication required for all endpoints except health checks and shared-password project views.
- **Platform ↔ Database:** internal network. TLS where available.
- **Platform ↔ Algolia:** server-side admin API key. Client never receives this key. Search keys are scoped and generated server-side.
- **Platform ↔ S3:** access key + secret key. IAM role in production.
- **Non-publishable content boundary:** free pages marked non-publishable are never included in any external artefact (static site, Confluence, git export, PDF, Algolia index).
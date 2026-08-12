# Deployment

Describes how the dx-doc Platform is deployed, configured, and operated.

## Deployment Model

The Platform is a **white-label, open-source product**. Each organisation deploys its own instance. The application does not prescribe a specific deployment target — it provides a reference stack and configuration surface.

### Principles

- **Single process, multiple responsibilities:** the application server serves the REST API, the MCP server, and static assets from a single Node.js process. No microservices.
- **Stateless application:** the process holds no persistent state. All state is in the database and S3. The process can be restarted or scaled horizontally without data loss.
- **Configuration through environment variables:** instance-level configuration uses environment variables. Company-level configuration is in the database.
- **Forward-only migrations:** schema changes are applied at start-up by a migration runner. No automated rollback.

## Reference Deployment Stack

```
┌────────────────────────────────────────────────────────┐
│                   Load Balancer / Reverse Proxy         │
│                   (nginx, Traefik, cloud LB)            │
└────────────────────────┬───────────────────────────────┘
                         │ HTTPS
                         ▼
┌────────────────────────────────────────────────────────┐
│              Application Server (Node.js)               │
│              Single process or replicated               │
│              Env vars: DB, S3, SEARCH, OIDC, SMTP      │
└──────┬──────────────────────┬────────────────┬─────────┘
       │                      │                │
       ▼                      ▼                ▼
┌────────────┐    ┌──────────────┐    ┌──────────────┐
│  Database  │    │  S3 Storage  │    │   Pagefind   │
│  (primary) │    │  (assets)    │    │ (local disk) │
└────────────┘    └──────────────┘    └──────────────┘
```

### Minimum Viable Deployment (R0)

A single server running:
- Node.js application process
- A database: SQLite file by default (no separate service); MariaDB or PostgreSQL from R2
- S3-compatible storage (MinIO for self-hosted, or any cloud provider)
- No search service — Pagefind runs in-process, indexes on local disk

### Availability

The Platform targets roughly **99% availability, achievable on a single instance with no redundancy** ([REQ-NFR-005](../product/requirements/REQ-NFR.md)). That ceiling is a constraint on the architecture, not a promise the software makes: availability is a property of a deployment, so **the SLA of any given instance is its operator's commitment**. The corporate pilot instance targets 99%.

### Production Deployment (R1+)

- Application server: a single process is the supported shape. Replication behind a load balancer is possible but not free — see the caveat below
- Database: a SQLite file with a scheduled file-level snapshot, or from R2 a managed MariaDB/PostgreSQL service with backup
- S3: cloud provider object storage (AWS S3, Cloudflare R2, Backblaze B2, etc.)
- Search: Pagefind indexes on the application's own disk; an optional hosted adapter (R3) is the only configuration that changes this
- HTTPS termination at the load balancer

## Configuration

### Environment Variables

All instance-level configuration is through environment variables. See the full specification Appendix C for the complete reference.

Critical variables for R0:

| Variable | Purpose |
|---|---|
| `DB_DRIVER` | Database adapter: `sqlite` (default), `mariadb` or `postgres` (R2) |
| `DB_FILE` | SQLite database file path |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Server database connection (R2 adapters) |
| `STORAGE_S3_*` | S3-compatible object storage |
| `SEARCH_DRIVER`, `SEARCH_INDEX_PATH` | Search adapter (`pagefind` default) and index location |
| `APP_URL`, `APP_SECRET` | Application base URL and signing key |
| `AUTH_PASSWORD_ENABLED` | Email+password authentication |
| `AUTH_OIDC_*` | OIDC SSO (R1) |

### Database Configuration

Company-level configuration (branding, SMTP, catalogue defaults) is stored in the database and managed through the Admin interface. See O10 for the split between environment variables and database settings.

## Schema Migrations

- **Format:** forward-only, versioned SQL files.
- **Execution:** at application start-up, before the HTTP server starts accepting requests.
- **Idempotency:** each migration is recorded in a `schema_migrations` table. Already-applied migrations are skipped.
- **Safety:** a documented mandatory backup step before running migrations. No supported downgrade path (O7).

## Startup Sequence

1. Load environment variables and validate required ones.
2. Connect to database.
3. Run pending schema migrations.
4. Initialize search index (create if not exists, update schema if needed).
5. Verify S3 connectivity.
6. Start HTTP server (REST API + MCP server + static file serving).

## Backup and Recovery

- **Database backup:** responsibility of the operator. The Platform provides no backup mechanism.
- **Asset backup:** S3 bucket replication or provider backup.
- **Git export (R2):** constitutes a partial, human-readable off-site copy — not a full backup, but a useful complement.
- **Recovery:** restore database from backup, verify S3 connectivity, restart application.

## Scaling

- **Horizontal:** the application server is stateless *except for the search index*, which the default adapter writes to local disk. Replicating the process therefore needs either shared storage for the index directory or a per-instance rebuild — which is why a single instance is the supported shape and why [REQ-NFR-005](../product/requirements/REQ-NFR.md) requires the architecture to work without redundancy. Session state is stored in the database or a shared session store.
- **Database:** a single writer. SQLite serialises writes, which at the projected concurrency is not a bottleneck. Read replicas can be added for read-heavy workloads, though the projected concurrency (≤50 viewers, ≤10 editors) suggests this is unnecessary for the foreseeable scale.
- **Search:** Pagefind indexes live on the application's disk, so search does **not** scale independently — see the replication caveat above.
- **Storage:** S3 is a hosted/self-hosted service and scales independently.

## Monitoring

- **Health check endpoint:** `GET /health` — returns database connectivity, search index status, S3 connectivity.
- **Error tracking:** Sentry (R1) for unhandled exceptions.
- **Logs:** structured JSON to stdout. Aggregation is the operator's responsibility.

## Security Considerations

- **HTTPS required** in production. HTTP allowed only in local development.
- **Environment variables** for all secrets. No credentials in the codebase.
- **Database TLS** where supported by the provider.
- **Session cookies:** `HttpOnly`, `Secure` (in production), `SameSite=Lax`.
- **Content Security Policy:** configured to allow the application's own assets and the S3/CDN domain. The default search adapter adds no external origin.
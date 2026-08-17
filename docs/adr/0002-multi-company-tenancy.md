# ADR-0002: Multi-Company Tenancy on a Single Instance

## Status

Accepted

## Date

2026-08-11

## Context

The Platform serves multiple organisations from a single deployment. Each organisation (Company) must be fully isolated: its users, projects, documentation, and configuration must not be visible or accessible to users of other companies.

## Decision

Multi-tenancy is implemented at the **database level** using a `company_id` foreign key on every tenant entity. The company ID is derived from the authenticated user's session, not from request parameters.

**Schema pattern:**

- Every tenant entity table includes a `company_id` column referencing the `companies` table.
- Every query includes `WHERE company_id = ?` scoped to the current user's company.
- Company-level configuration (branding, SMTP, catalogue defaults) is stored in the `companies` table and related tables.

**Middleware enforcement:**

- Authentication middleware extracts the user and their company from the session.
- A request-scoped context carries `{ userId, companyId, projectGrants }`.
- All downstream code reads the company scope from this context.

**Data isolation:**

- No cross-company queries. No shared data between companies.
- The search index uses the same `company_id` scoping — search keys are generated with a filter on the user's company.

## Alternatives Considered

### Separate database per company

Rejected: simplifies isolation but complicates operations (n × databases, n × migration runs, n × connection pools). The projected scale (a handful of companies per instance) does not justify the operational overhead.

### Separate schema per company (PostgreSQL schemas)

Rejected: not portable. Since [ADR-0020](0020-database-portability.md) the Platform must run on SQLite, MariaDB and PostgreSQL alike, and per-tenant schemas have no SQLite equivalent at all. The `company_id` discriminator column works identically on every supported dialect.

### Application-level tenancy (no DB enforcement, rely on code)

Rejected: too fragile. A single missing WHERE clause leaks data across companies. Database-level enforcement through foreign keys and disciplined query building is safer.

## Consequences

- Every query touching tenant data must include `company_id` filtering. This is enforced by convention and code review; a repository base class or query builder helper should reduce the risk of omission.
- The `company_id` is never derived from request parameters — it comes from the authenticated session — preventing horizontal privilege escalation.
- Cross-company features are impossible by design. This matches the requirement: companies are fully isolated.
- Adding a company requires only a row in the `companies` table, not infrastructure changes.

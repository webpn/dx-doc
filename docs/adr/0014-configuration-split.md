# ADR-0014: Configuration Split — Instance vs Company

## Status
Proposed

## Date
2026-08-11

## Context
The Platform has two categories of configuration:
- **Infrastructure-level:** database credentials, object storage keys, search service API keys, identity provider secrets, SMTP fallback.
- **Organisation-level:** company branding (name, logo, colours), company SMTP settings, catalogue defaults.

These need different storage and management:
- Infrastructure configuration is set by the system operator (who deploys the instance). It's typically injected as environment variables.
- Organisation configuration is set by the company Admin (through the web UI). It varies per company on a multi-tenant instance.

The spec's open decision O10 asks: "Split of configuration keys between instance-level environment variables and company-level database settings."

## Proposal

**Infrastructure configuration → environment variables (instance-level):**
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Object storage: `STORAGE_S3_*`
- Search: `SEARCH_DRIVER`, `SEARCH_INDEX_PATH` (and adapter credentials, if a hosted adapter is selected)
- Identity providers: `AUTH_OIDC_*`, `AUTH_SAML_*` (R2)
- SMTP fallback: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Error tracking: `SENTRY_DSN`
- Application: `APP_URL`, `APP_SECRET`, `APP_ENV`

**Organisation configuration → database (company-level):**
- Branding: name, logo URL, primary/secondary colours
- SMTP: per-company host, port, user, password, from address — overrides the instance-level SMTP fallback
- Catalogue defaults: which standard properties/modules/templates are preselected for new projects
- Custom field definitions

**Rationale:**
- Infrastructure credentials are secrets that should never be in a database accessible through the web UI. Environment variables are the standard way to inject secrets into a process.
- Company branding changes through the Admin UI. Storing it in the database is natural — it's tenant data, not infrastructure.
- SMTP is a hybrid: the instance provides a fallback, but each company may override it. The company-level settings in the database override the environment variable fallback. This gives Admins control without exposing infrastructure-level SMTP configuration to tenants by default.

## Alternatives Considered

### Everything in environment variables
Rejected: company branding and SMTP overrides need to be editable through the web UI by Admins. Environment variables require a process restart and operator access.

### Everything in the database
Rejected: database credentials, S3 keys, and identity provider secrets should not be in the same database as user-editable content. A SQL injection or misconfigured API could expose them.

### A separate configuration service (e.g., HashiCorp Vault, etcd)
Rejected: over-engineered for the current scale. Environment variables + database is simple, standard, and sufficient.

## Related Decisions
- ADR-0002: Multi-Company Tenancy — company-level configuration is per-tenant.
- O6 (spec): Complete environment variable matrix — the list itself needs validation.

## Last Responsible Moment
Immediately (R0). The configuration split determines how the first deployment is structured.
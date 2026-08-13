# ADR-0014: Configuration Split — Instance vs Company

## Status

Accepted

## Date

2026-08-11 (accepted 2026-08-12)

## Context

The Platform has two categories of configuration:

- **Infrastructure-level:** database credentials, object storage keys, search service API keys, SMTP fallback.
- **Organisation-level:** company branding (name, logo, colours), company SMTP settings, catalogue defaults, identity-provider connections, supported login methods, supported locales.

These need different storage and management:

- Infrastructure configuration is set by the system operator (who deploys the instance). It's typically injected as environment variables.
- Organisation configuration is set by the company Admin (through the web UI). It varies per company on a multi-tenant instance.

The spec's open decision O10 asks: "Split of configuration keys between instance-level environment variables and company-level database settings."

## Proposal

**Infrastructure configuration → environment variables (instance-level):**

- Database: `DB_DRIVER` (`sqlite` default; `mariadb`/`postgres` R2), `DB_FILE` (sqlite) or `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` (R2 adapters)
- Object storage: `STORAGE_S3_*`
- Search: `SEARCH_DRIVER`, `SEARCH_INDEX_PATH` (and adapter credentials, if a hosted adapter is selected, R3)
- Bootstrap administrator: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (read once, REQ-SEC-013)
- SMTP fallback: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- Error tracking: `SENTRY_DSN`
- Application: `APP_URL`, `APP_SECRET`, `APP_ENV`, `APP_DEFAULT_LOCALE`

**Organisation configuration → database (company-level):**

- Branding: name, logo URL, primary/secondary colours
- SMTP: per-company host, port, user, password, from address — overrides the instance-level SMTP fallback
- Catalogue defaults: which standard properties/modules/templates are preselected for new projects
- Custom field definitions
- **SSO connection details:** OIDC issuer, client ID, client secret, scopes (REQ-SEC-004); SAML entity ID, SSO URL, certificate (REQ-SEC-007, R2). Each company connects its own identity provider.
- **Supported login methods:** which of local password / OIDC / SAML a company accepts. Replaces the single instance-wide `AUTH_PASSWORD_ENABLED` toggle drafted in the first version of this ADR.
- **Supported and default locales:** which interface languages a company offers its users, narrowing the choice available in the per-user profile setting (REQ-NFR-010). `APP_DEFAULT_LOCALE` remains only as the instance-wide fallback used before any company context exists (e.g. the instance-administration portal).

**Rationale:**

- Infrastructure credentials are secrets that should never be in a database accessible through the web UI. Environment variables are the standard way to inject secrets into a process.
- Company branding changes through the Admin UI. Storing it in the database is natural — it's tenant data, not infrastructure.
- SMTP is a hybrid: the instance provides a fallback, but each company may override it. The company-level settings in the database override the environment variable fallback. This gives Admins control without exposing infrastructure-level SMTP configuration to tenants by default.
- Authentication is tenant policy, not instance infrastructure. On a white-label, multi-company instance, one company may run its own Okta tenant and require SSO-only while another has no identity provider and needs local password. A single instance-wide `AUTH_OIDC_*`/`AUTH_PASSWORD_ENABLED` set of environment variables cannot express that — it forces every company on the instance into the same policy. REQ-SEC-014's recovery-path rule already implies per-company scoping ("even where **the company** has SSO enforced and `AUTH_PASSWORD_ENABLED` is off for everyone else"); this ADR makes that scoping the actual design rather than leaving it as an env var with company-shaped language.
- Locale follows the same logic: nothing about a supported-languages list is infrastructure, and different companies on the same instance plausibly want different offerings.

## Disputed keys — resolved

The first version of this ADR listed `AUTH_OIDC_*`, `AUTH_SAML_*` and `AUTH_PASSWORD_ENABLED` as environment variables (O6's draft matrix) without settling whether they were instance- or company-scoped (O10). Resolution:

| Key(s)                  | First draft           | Resolved                                                                                            |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `AUTH_OIDC_*`           | Instance env var      | Company-level DB, encrypted at rest (see Security below)                                            |
| `AUTH_SAML_*`           | Instance env var      | Company-level DB, encrypted at rest (R2)                                                            |
| `AUTH_PASSWORD_ENABLED` | Instance env var      | Replaced by a company-level "supported login methods" set                                           |
| `APP_DEFAULT_LOCALE`    | Instance env var only | Kept as instance fallback; each company additionally sets supported/default locales in the database |

The `instance_admin` recovery-path guarantee (REQ-SEC-014) — a flag holder always retains local-password login — is unaffected: it is an override on top of whatever login methods the flag holder's own company has configured, not a separate instance-wide switch.

## Security: company-level secrets

Company-level configuration now includes credentials (OIDC/SAML client secrets, per-company SMTP password), not only preferences. These are stored encrypted at rest, derived from `APP_SECRET`, and are write-only through the API/UI — a read ever returns the field masked, never the plaintext value. This was implicit for the SMTP password in the first draft of this ADR and is stated explicitly now that OIDC/SAML secrets make the gap load-bearing.

## Alternatives Considered

### Everything in environment variables

Rejected: company branding and SMTP overrides need to be editable through the web UI by Admins. Environment variables require a process restart and operator access.

### Everything in the database

Rejected: database credentials, S3 keys, and identity provider secrets should not be in the same database as user-editable content. A SQL injection or misconfigured API could expose them.

### A separate configuration service (e.g., HashiCorp Vault, etcd)

Rejected: over-engineered for the current scale. Environment variables + database is simple, standard, and sufficient.

## Related Decisions

- ADR-0002: Multi-Company Tenancy — company-level configuration is per-tenant.
- ADR-0020: Database Portability — `DB_DRIVER` and the per-adapter variable sets this ADR references.
- **O6 and O10 are closed by this ADR.** O6 (complete environment variable matrix) is closed by the full matrix in [README.md](../../README.md#environment-variables) and [.env.example](../../.env.example), kept in sync by REQ-FDN-013's acceptance criteria. O10 (allocation of the disputed keys) is closed by the "Disputed keys — resolved" table above.

## Last Responsible Moment

Immediately (R0). The configuration split determines how the first deployment is structured.

# Security Policy

## Supported Versions

The project is in pre-release (R1). No versions are supported for production use yet.

Once R1 is released, security patches will be provided for the latest stable release and the immediately preceding release.

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Send vulnerability reports to the project maintainers through a private channel (to be confirmed before R1). Include:

- Description of the vulnerability
- Steps to reproduce
- Affected versions/components
- Potential impact
- Any suggested fixes

You will receive a response within 5 business days. The vulnerability will be addressed in a private fix, released as a patch, and publicly disclosed after the fix is deployed.

## Security Principles

The Platform's security posture is split below into controls that are **implemented today** and
controls that are **planned but not yet present**. Read the second table before exposing an
instance to an untrusted network.

### Implemented today

### Secrets Management

- No secrets are committed to the repository. All operator secrets are supplied as instance-level environment variables. Per-company configuration stored in the database is planned but not yet implemented — see ADR-0014.
- The `.env.example` file contains only placeholder values and documentation.
- `.env` is in `.gitignore`.

### Authentication and Authorization

- All API endpoints except health checks and shared-password project views require authentication.
- Authorization (project-scoped access grants) is enforced at the API middleware layer — never in the UI alone.
- Shared passwords for project access are hashed before storage.
- Session tokens are opaque random values, stored only as SHA-256 hashes; the raw token is never persisted.

### Input Validation

- Every user-supplied value is validated at the API boundary before reaching domain logic.
- Validation rules are shared across UI, API, and MCP entry points.
- External data (API responses from analytics platforms, Figma, Confluence) is validated at the infrastructure boundary.

### Output Security

- Image uploads are validated for type (not extension) and size.
- Error responses never expose stack traces, SQL, or internal paths.
- Non-publishable free pages (containing test credentials and internal references) are excluded from all published artefacts and external search indexes.

### Data Protection

- The Platform stores the minimum personal data required to operate accounts: a user's email address and a bcrypt hash of their password. Audit-log entries reference user IDs. No documentation content is treated as personal data.
- Non-publishable free pages are flagged and excluded from external exposure.
- Audit logs record write events only — not read events.
- Project deletion is an archive operation, not a hard delete.

### Dependency Security

- Automated vulnerability scanning in CI (e.g., `npm audit`, Dependabot).
- Dependencies are reviewed before addition following the policy in [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- Dependencies are kept up to date through dedicated update PRs.

### HTTP Security

- HTTPS required in production.

### Least Privilege

- Database connections use the minimum required privileges.
- Search API keys are server-side scoped to the user's project grants.
- Analytics platform integrations (R4) use service accounts with read-only access.

### Planned — not yet implemented

> Do not rely on any control in this list. Each names the milestone that delivers it.

| Control | Status | Target |
| --- | --- | --- |
| Security response headers (CSP, X-Content-Type-Options, X-Frame-Options, HSTS) | Not implemented | R1 hardening |
| CSRF protection for cookie-based authentication | Not implemented | R1 hardening |
| Request rate limiting / throttling | Not implemented | R1 hardening |
| Markdown sanitization before rendering | Not implemented — no renderer exists yet | M1.16 (authoring editor) |
| Signed (time-limited) object-storage URLs | Not implemented — assets are served from a public base URL by design in R1, see ADR-0026 | R2 |
| Audit-log retention enforcement | Not implemented — `AUDIT_RETENTION_MONTHS` is read but no pruning job exists | R2 |

## References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)

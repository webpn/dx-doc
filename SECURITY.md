# Security Policy

## Supported Versions

The project is in pre-release (R0). No versions are supported for production use yet.

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

The Platform applies these principles from day one:

### Secrets Management

- No secrets are committed to the repository. All secrets are injected through environment variables (instance-level) or stored in the database (company-level).
- The `.env.example` file contains only placeholder values and documentation.
- `.env` is in `.gitignore`.

### Authentication and Authorization

- All API endpoints except health checks and shared-password project views require authentication.
- Authorization (project-scoped access grants) is enforced at the API middleware layer — never in the UI alone.
- Shared passwords for project access are hashed before storage.
- Session tokens are signed and have a configurable TTL.

### Input Validation

- Every user-supplied value is validated at the API boundary before reaching domain logic.
- Validation rules are shared across UI, API, and MCP entry points.
- External data (API responses from analytics platforms, Figma, Confluence) is validated at the infrastructure boundary.

### Output Security

- User-generated Markdown content is sanitized before rendering (XSS prevention).
- Image uploads are validated for type (not extension) and size.
- Error responses never expose stack traces, SQL, or internal paths.
- Non-publishable free pages (containing test credentials and internal references) are excluded from all published artefacts and external search indexes.

### Data Protection

- The Platform stores no personal data. Test credentials are the most sensitive data.
- Non-publishable free pages are flagged and excluded from external exposure.
- Audit logs record write events only — not read events.
- Project deletion is an archive operation, not a hard delete.

### Dependency Security

- Automated vulnerability scanning in CI (e.g., `npm audit`, Dependabot).
- Dependencies are reviewed before addition following the policy in [`ENGINEERING_GUIDE.md`](ENGINEERING_GUIDE.md).
- Dependencies are kept up to date through dedicated update PRs.

### HTTP Security

- HTTPS required in production.
- Security headers configured (Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).
- CSRF protection for cookie-based authentication.

### Least Privilege

- Database connections use the minimum required privileges.
- Search API keys are server-side scoped to the user's project grants.
- Object storage access is through signed URLs or a configured IAM role with minimum permissions.
- Analytics platform integrations (R4) use service accounts with read-only access.

## References

- [OWASP Top Ten](https://owasp.org/www-project-top-ten/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)

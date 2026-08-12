# REQ-SEC — Security, Authentication and Authorisation

Identity, roles, grants, audit and data sensitivity. Source: [functional specification](../functional-specification.md) §17, §19.2, Appendix B.

Entry format and status legend: [requirements index](README.md).

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-SEC-001 | Email + password login | Must | R0 | M0.4 | Not Started |
| REQ-SEC-002 | Four global roles | Must | R0 | M0.4 | Not Started |
| REQ-SEC-003 | Per-project access grants | Must | R0 | M0.4 | Not Started |
| REQ-SEC-004 | OIDC SSO | Must | R1 | M1.9 | Not Started |
| REQ-SEC-005 | Project shared-password access with expiry | Must | R1 | M1.9 | Not Started |
| REQ-SEC-006 | Append-only audit log, 24-month retention | Must | R1 | M1.9 | Not Started |
| REQ-SEC-007 | SAML SSO | Should | R2 | M2.8 | Not Started |
| REQ-SEC-008 | Audit log UI, paginated list and CSV export | Should | R2 | M2.8 | Not Started |
| REQ-SEC-009 | Project archive and restore; no hard delete | Should | R2 | M2.8 | Not Started |
| REQ-SEC-010 | "Manage company catalogue" capability | Must | R1 | M1.1 | Not Started |
| REQ-SEC-011 | Permission matrix enforced server-side | Must | R0 | M0.4 | Not Started |
| REQ-SEC-012 | Non-publishable content never leaves the instance | Must | R1 | M1.7 | Not Started |

---

### REQ-SEC-001 — Email + password login

**Must** · R0 · [M0.4](../milestones.md) · spec §17.1 · **Not Started** · Issue: — · PR: —

Local authentication, required so the Platform is not tied to a single identity provider. Controlled by `AUTH_PASSWORD_ENABLED`; sessions expire per `AUTH_SESSION_TTL` (default 8h).

**Acceptance**
- Passwords are stored with a modern adaptive hash; no reversible storage anywhere.
- Local login can be disabled by configuration once SSO is in place, without disabling the Admin's ability to recover access.
- Failed attempts do not disclose whether the address exists.

### REQ-SEC-002 — Four global roles

**Must** · R0 · [M0.4](../milestones.md) · spec §4.2, §17.2 · **Not Started** · Issue: — · PR: —

Admin, Project Manager, Editor, Viewer. The role is global to the user; roles compose (a Project Manager who must also edit additionally holds Editor). Roles are assigned inside the Platform and are never derived from identity-provider groups.

**Acceptance**
- Holding Project Manager alone confers no editing rights.
- No provisioning path copies identity-provider group membership into a role.
- The role set is exactly four; new capabilities are added as discrete flags (see REQ-SEC-010), not as new roles.

### REQ-SEC-003 — Per-project access grants

**Must** · R0 · [M0.4](../milestones.md) · spec §17.2 · [ADR-0010](../../adr/0010-project-scoped-isolation.md) · **Not Started** · Issue: — · PR: —

A user sees only the projects explicitly granted to them. Every permission is additionally scoped by the grant: no role confers access to an ungranted project.

**Acceptance**
- An Admin without a grant still administers the instance but is subject to the same read scoping in project content listings.
- Grant checks live in one place, invoked by API, MCP, search and export paths alike.
- A test asserts the negative case for every entry point, not only the HTTP API.

### REQ-SEC-004 — OIDC SSO

**Must** · R1 · [M1.9](../milestones.md) · spec §17.1 · **Not Started** · Issue: — · PR: —

OIDC is the primary corporate authentication method, configured through `AUTH_OIDC_*`. Role and grant assignment remain manual inside the Platform.

**Acceptance**
- A first-time SSO login creates a user with no role and no grants — access is granted deliberately, never inferred from a successful authentication.
- The redirect URI derives from `APP_URL`, so a misconfigured instance fails loudly rather than redirecting elsewhere.
- Local and SSO login can coexist for the same instance.

### REQ-SEC-005 — Project shared-password access with expiry

**Must** · R1 · [M1.9](../milestones.md) · spec §4.3, §17.1 · **Not Started** · Issue: — · PR: —

A project may be exposed read-only behind a shared password. Multiple passwords per project, each with an optional expiry. Granularity is the whole project. No per-reader audit is required for this mode.

**Acceptance**
- An expired password stops working without an administrative action.
- Shared-password access is read-only through every path, including export endpoints.
- Non-publishable free pages are invisible in this mode (REQ-SEC-012).
- Revoking one password does not affect the others.

### REQ-SEC-006 — Append-only audit log, 24-month retention

**Must** · R1 · [M1.9](../milestones.md) · spec §17.4 · **Not Started** · Issue: — · PR: —

Recorded: login and logout; entity creation, modification and deletion; publication; rollback; export; guest access; MCP calls; permission changes; integration configuration changes. Read events are deliberately not recorded. Retention is `AUDIT_RETENTION_MONTHS`, default 24.

**Acceptance**
- Entries cannot be updated or deleted through any application path.
- Every event class named above has a test proving an entry is written.
- A bulk operation produces one entry recording the operation, the selection size and the actor — not one entry per affected item (see REQ-AUTH-010).
- Entries record the actor, and distinguish a human actor from an agent acting on their behalf.

### REQ-SEC-007 — SAML SSO

**Should** · R2 · [M2.8](../milestones.md) · spec §17.1 · **Not Started** · Issue: — · PR: —

SAML for generality of the white-label product, configured through `AUTH_SAML_*`.

### REQ-SEC-008 — Audit log UI, paginated list and CSV export

**Should** · R2 · [M2.8](../milestones.md) · spec §17.4 · **Not Started** · Issue: — · PR: —

Admin-only consultation interface: a paginated list with CSV export and deliberately no filters.

> Named as a demotion candidate if R1 overruns — see [milestones](../milestones.md#risk-mitigations-owned-by-milestones). The log itself (REQ-SEC-006) is not negotiable; its UI is.

### REQ-SEC-009 — Project archive and restore; no hard delete

**Should** · R2 · [M2.8](../milestones.md) · spec §17.5 · **Not Started** · Issue: — · PR: —

Projects cannot be hard-deleted. An Admin archives a project, which unpublishes it and makes it restorable.

**Acceptance**
- No application path issues a destructive delete of a project or its content.
- An archived project disappears from listings and published artefacts, and restores with its content and version history intact.

### REQ-SEC-010 — "Manage company catalogue" capability

**Must** · R1 · [M1.1](../milestones.md) · spec §4.2, §6.3 · **Not Started** · Issue: — · PR: —

The ability to create and modify the company-level catalogue (standard properties, modules, templates, free-page templates), granted individually to selected users rather than implied by a role.

**Acceptance**
- The capability is a discrete flag on the user, independent of the four roles.
- An Editor without the flag can consume catalogue content at project creation but cannot modify the catalogue.
- Appendix B's ⚠️ row for catalogue management resolves to this flag.

**Blocked by:** open decision O11 — permission flag versus a fifth role. The interim position is a flag; roles stay at four.

### REQ-SEC-011 — Permission matrix enforced server-side

**Must** · R0 · [M0.4](../milestones.md) · spec Appendix B · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

Every action in Appendix B is authorised in the backend. The UI hides what a user cannot do as a convenience; hiding is never the enforcement.

**Acceptance**
- Every row of Appendix B has a passing test, positive and negative, exercised through the API rather than the UI.
- An agent acting through MCP is bound by the consenting user's permissions, and additionally cannot publish, delete users or change permissions (see REQ-API-004).
- Removing a UI control does not change the outcome of the equivalent direct API call.

### REQ-SEC-012 — Non-publishable content never leaves the instance

**Must** · R1 · [M1.7](../milestones.md) · spec §7.7, §16.4, §17.3 · **Not Started** · Issue: — · PR: —

The documentation contains no personal data, but it does contain test credentials and internal references. These live on free pages flagged non-publishable, which must never appear in any published artefact, static site, Confluence export, git export, PDF, or external search index.

**Acceptance**
- A non-publishable page is provably absent from the search index, verified by querying the index directly rather than the application.
- Each export path has a test asserting the page's content does not appear in generated output.
- Flipping a page to non-publishable removes it from the index and from the next generated artefact without a manual reindex.
- Shared-password and Viewer access cannot reach the content by any route.

> This requirement is enforced again structurally by the profile-aware rendering engine (REQ-VIEW-003) in R2. Until that exists, each R1 output path carries its own test — a duplication that is deliberate, because the failure mode is credential disclosure.

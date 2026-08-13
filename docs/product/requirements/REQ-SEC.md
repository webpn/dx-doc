# REQ-SEC — Security, Authentication and Authorisation

Identity, roles, grants, audit and data sensitivity. Source: [functional specification](../functional-specification.md) §17, §19.2, Appendix B.

Entry format and status legend: [requirements index](README.md).

| ID          | Requirement                                       | MoSCoW | Rel. | Milestone       | Status      |
| ----------- | ------------------------------------------------- | ------ | ---- | --------------- | ----------- |
| REQ-SEC-001 | Email + password login                            | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-002 | Four company-scoped roles                         | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-003 | Per-project access grants                         | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-004 | OIDC SSO                                          | Must   | R1   | M1.9            | Not Started |
| REQ-SEC-005 | Project shared-password access with expiry        | Must   | R1   | M1.9            | Not Started |
| REQ-SEC-006 | Append-only audit log, 24-month retention         | Must   | R1   | M1.9            | Not Started |
| REQ-SEC-007 | SAML SSO                                          | Should | R2   | M2.8            | Not Started |
| REQ-SEC-008 | Audit log UI, paginated list and CSV export       | Should | R2   | M2.8            | Not Started |
| REQ-SEC-009 | Project archive and restore; no hard delete       | Should | R2   | M2.8            | Not Started |
| REQ-SEC-010 | Company catalogue managed by the Admin role       | Must   | R1   | M1.1            | Not Started |
| REQ-SEC-011 | Permission matrix enforced server-side            | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-012 | Non-publishable content never leaves the instance | Must   | R1   | M1.7 → standing | Not Started |
| REQ-SEC-013 | Account lifecycle and first-run bootstrap         | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-014 | Instance-administration capability                | Must   | R0   | M0.4            | Not Started |
| REQ-SEC-015 | Instance-administration portal                    | Should | R2   | M2.8            | Not Started |

---

### REQ-SEC-001 — Email + password login

**Must** · R0 · [M0.4](../milestones.md) · spec §17.1 · **Not Started** · Issue: — · PR: —

Local authentication, required so the Platform is not tied to a single identity provider. Whether a company accepts local password login is part of its **supported login methods** setting (company-level, database — [ADR-0014](../../adr/0014-configuration-split.md)); sessions expire per `AUTH_SESSION_TTL` (instance-level, default 8h).

**Acceptance**

- Passwords are stored with a modern adaptive hash; no reversible storage anywhere.
- Local login can be disabled per company once that company's SSO is in place, without disabling the instance administrator's ability to recover access (REQ-SEC-014).
- Failed attempts do not disclose whether the address exists.

### REQ-SEC-002 — Four company-scoped roles

**Must** · R0 · [M0.4](../milestones.md) · spec §4.2, §17.2 · **Not Started** · Issue: — · PR: —

Admin, Project Manager, Editor, Viewer. A user belongs to **one company**, and their role applies across that company, narrowed further by their per-project grants (REQ-SEC-003). Roles compose (a Project Manager who must also edit additionally holds Editor). Roles are assigned inside the Platform and are never derived from identity-provider groups.

**Admin is company-scoped, not instance-wide.** An Admin creates and configures projects within their own company, its integrations, its catalogue, its branding, its audit log, and archives and restores its projects. **Creating a company is not an Admin action** — that belongs to the instance-administration capability (REQ-SEC-014), which is a different job held by a different person.

**Acceptance**

- Holding Project Manager alone confers no editing rights.
- No provisioning path copies identity-provider group membership into a role.
- The role set is exactly four. A capability that genuinely does not belong to a role is added as a discrete flag (REQ-SEC-014), never as a fifth role — and the first test is whether an existing role already owns the job, which is how O11 resolved (REQ-SEC-010).
- An Admin cannot create a company, cannot see that other companies exist, and cannot reach any entity belonging to one — tested as the negative case, since this is the tenancy boundary (REQ-FDN-002) expressed in the permission model.

> "Global" in the original wording meant _not per-project_. It has been reworded to _company-scoped_ because with multi-company tenancy the two readings diverge, and the wrong one hands every tenant's documentation to whoever administers any one of them.

### REQ-SEC-003 — Per-project access grants

**Must** · R0 · [M0.4](../milestones.md) · spec §17.2 · [ADR-0010](../../adr/0010-project-scoped-isolation.md) · **Not Started** · Issue: — · PR: —

A user sees only the projects explicitly granted to them. Every permission is additionally scoped by the grant: no role confers access to an ungranted project.

**Acceptance**

- An Admin without a grant still administers their company but is subject to the same read scoping in project content listings.
- Grant checks live in one place, invoked by API, MCP, search and export paths alike.
- A test asserts the negative case for every entry point, not only the HTTP API.

**Grant administration is deliberately one project at a time.** There is no bulk grant or revoke, no view of everything one user can reach across projects, and no group-derived assignment (REQ-SEC-002). At ~30 projects and hundreds of readers this is real administrative work, and it is accepted rather than overlooked: every access decision being explicit and individually made is the property the model is buying, and a bulk tool is the mechanism by which access quietly widens. Revisit only with that trade stated.

### REQ-SEC-004 — OIDC SSO

**Must** · R1 · [M1.9](../milestones.md) · spec §17.1 · **Not Started** · Issue: — · PR: —

OIDC is the primary corporate authentication method. Each company connects its own identity provider: issuer, client ID, client secret and scopes are company-level configuration, set by the company Admin and stored encrypted at rest ([ADR-0014](../../adr/0014-configuration-split.md)) — not an instance-wide `AUTH_OIDC_*` environment variable, since different companies on the same instance may use different providers. Role and grant assignment remain manual inside the Platform.

**Acceptance**

- A first-time SSO login creates a user with no role and no grants — access is granted deliberately, never inferred from a successful authentication.
- The redirect URI derives from `APP_URL`, so a misconfigured instance fails loudly rather than redirecting elsewhere.
- Local and SSO login can coexist for the same company, per its configured supported login methods.
- A stored client secret is never returned in plaintext by any read path; the Admin UI shows it masked after entry.

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

SAML for generality of the white-label product. Configured per company (entity ID, SSO URL, certificate), stored encrypted at rest — the same company-level model as OIDC (REQ-SEC-004, [ADR-0014](../../adr/0014-configuration-split.md)).

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

### REQ-SEC-010 — Company catalogue is managed by the Admin role

**Must** · R1 · [M1.1](../milestones.md) · spec §4.2, §6.3 · **Not Started** · Issue: — · PR: —

Creating and modifying the company-level catalogue (standard properties, modules, templates, free-page templates) is a power of the **Admin** role within the company. There is no fifth role and no separate flag.

**Acceptance**

- An Admin can modify their own company's catalogue; nobody else can.
- An Editor can consume catalogue content at project creation and cannot modify the catalogue.
- The role set stays at exactly four (REQ-SEC-002).
- An `instance_admin` who is not an Admin of the company cannot modify its catalogue — the flag creates companies, it does not reach inside them (REQ-SEC-014).
- Appendix B's ⚠️ row for catalogue management resolves to the Admin role.

**Resolved 2026-08-12 — O11 is closed.** The question was whether catalogue management should be a discrete flag or a fifth role. It is neither: the company already has an administrator, and administering a company includes its catalogue. The division that matters was drawn by REQ-SEC-014 and is unchanged — **the instance administrator's remit is companies as entities, the Admin's remit is everything inside one.**

> This resolves a contradiction the record already contained rather than introducing a new position. [REQ-SEC-014](#req-sec-014--instance-administration-capability) states that _"everything else an Admin does — projects, integrations, **catalogue**, branding, audit log — stays with the Admin role"_, and [personas.md](../personas.md) describes the Admin as managing the company's catalogue. Only this entry said otherwise. The earlier interim position — a discrete flag — would have meant an Admin who cannot administer part of their own company, which is a distinction without a job behind it.

### REQ-SEC-011 — Permission matrix enforced server-side

**Must** · R0 · [M0.4](../milestones.md) · spec Appendix B · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

Every action in Appendix B is authorised in the backend. The UI hides what a user cannot do as a convenience; hiding is never the enforcement.

**Acceptance**

- Every row of Appendix B has a passing test, positive and negative, exercised through the API rather than the UI.
- An agent acting through MCP is bound by the consenting user's permissions, and additionally cannot publish, delete users or change permissions (see REQ-API-004).
- Removing a UI control does not change the outcome of the equivalent direct API call.

### REQ-SEC-012 — Non-publishable content never leaves the instance

**Must** · R1 · **first enforced [M1.7](../milestones.md), then standing** · spec §7.7, §16.4, §17.3 · **Not Started** · Issue: — · PR: —

The documentation contains no personal data, but it does contain test credentials and internal references. These live on free pages flagged non-publishable, which must never appear in any published artefact, static site, Confluence export, git export, PDF, or search index.

**This is a standing requirement, not a one-milestone deliverable.** Four of the channels it names do not exist at M1.7 and Confluence not until R3, so it cannot be satisfied once and closed. It is first enforced at M1.7 against the search index and the in-app paths, and is **re-verified at every later milestone that adds an output channel** — M2.5, M2.6 and M3.2 each carry it. It reaches `Verified` only when the last channel does.

**Acceptance**

- A non-publishable page is provably absent from the search index, verified by querying the index directly rather than the application.
- Each output channel has a test asserting the page's content does not appear in generated output, **added in the same milestone as the channel**. A channel merged without one fails review.
- Flipping a page to non-publishable removes it from the index and from the next generated artefact without a manual reindex.
- Shared-password and Viewer access cannot reach the content by any route.

> This requirement is enforced again structurally by the profile-aware rendering engine (REQ-VIEW-003) in R2. Until that exists, each R1 output path carries its own test — a duplication that is deliberate, because the failure mode is credential disclosure.
>
> Marking it Implemented at M1.7 would close it before the channels it is about exist, which is the precise mechanism by which this class of requirement fails silently. REQ-NFR uses the same "verified continuously, not delivered once" pattern for the same reason.

### REQ-SEC-013 — Account lifecycle and first-run bootstrap

**Must** · R0 · [M0.4](../milestones.md) · **Not Started** · Issue: — · PR: —

How identities come into being, and how they leave. Four parts:

**First-run bootstrap.** `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are read **once**, when the instance starts against a database with no users, and create a single administrator holding the instance-administration capability (REQ-SEC-014). Thereafter the variables are ignored entirely.

**Invitation.** A user is created by invitation, issued by an **Admin, Project Manager or Editor**. The invitation carries no role and no project grants — those are assigned separately and deliberately, exactly as a first SSO login does (REQ-SEC-004).

**Password reset.** A self-service reset over a single-use, expiring token, for accounts with a local password.

**Deactivation.** A user can be deactivated, which ends their sessions and revokes their access without deleting them — distinct from removing individual grants (REQ-SEC-003), and required because the audit log (REQ-SEC-006) references actors that must remain resolvable.

**Acceptance**

- On a database that already has a user, the bootstrap variables are ignored: setting them cannot create a second administrator, reset an existing one, or change any password. This is tested explicitly, because it is the whole security property of the mechanism.
- The bootstrap password must be changed at first login, and the instance refuses to start if the variables are set but malformed rather than starting without an administrator.
- Start-up against an empty database with the variables **unset** fails with a message naming them — an instance nobody can log into is a configuration error, not a valid state.
- An invitation confers no access by itself; accepting one produces a user with no role and no grants.
- A reset token is single-use, expires, and reveals nothing about whether the address exists (consistent with REQ-SEC-001).
- A deactivated user's sessions and API tokens (REQ-API-009) stop working immediately, and their audit entries remain attributed and readable.
- Invitation, reset and deactivation each produce audit entries (REQ-SEC-006).

> **Chosen for the deployment model rather than for elegance.** A setup wizard or a one-time token in the log would avoid putting a password in the environment, but both need a human at a browser at the right moment. Environment-variable bootstrap fits REQ-FDN-013's configuration model, fits the one-command reference stack (REQ-FDN-012), and provisions unattended — which is what an operator automating a deployment actually needs. The cost is that the initial password exists in the environment and in whatever created it, which is why it must be changed at first login and why the read-once rule is tested rather than assumed.
>
> This requirement did not exist in the first draft of the specification. Nothing described how the first identity came into being, while [M0.4](../milestones.md) required a passing test for every row of the permission matrix and [M0.6](../milestones.md) promised a clean machine reaching a running instance from the README alone. Neither is demonstrable without it.

### REQ-SEC-014 — Instance-administration capability

**Must** · R0 · [M0.4](../milestones.md) · **Not Started** · Issue: — · PR: —

A discrete `instance_admin` flag on a user, independent of the four company-scoped roles (REQ-SEC-002), marking the person who administers the **deployment** rather than a tenant within it. It is what gates the instance-administration portal (REQ-SEC-015) and it is held by the bootstrap administrator (REQ-SEC-013).

**It carries exactly two powers the Admin role does not have:** creating companies, and granting or revoking the `instance_admin` flag itself. Everything else an Admin does — projects, integrations, catalogue, branding, audit log — stays with the Admin role, inside one company.

Three rules make it safe:

- **Step-up re-authentication.** Entering the instance-administration surface requires re-authenticating, so an ordinary session that is hijacked or left open does not reach it.
- **A guaranteed local-password path.** A user holding this flag always retains a working email + password login, even where their own company's supported-login-methods setting has local password disabled for everyone else ([ADR-0014](../../adr/0014-configuration-split.md)). The instance must stay recoverable when an identity provider is down, misconfigured, or has just been pointed at the wrong tenant.
- **No implied content access.** The flag confers no read or write access to any project's documentation. Reaching content still requires a role and a grant (REQ-SEC-002, REQ-SEC-003), and that grant is auditable like anyone else's.

**Acceptance**

- The flag is a discrete capability, not a fifth role — the role set stays at exactly four (REQ-SEC-002). It is the **only** such flag: REQ-SEC-010 resolved the other candidate to an existing role instead.
- A user with the flag and no project grants can administer the instance and read no documentation, verified by test.
- Disabling local password in a company's supported-login-methods setting does not lock out its `instance_admin` flag holders; a test asserts this, since it is the recovery path.
- Granting or revoking the flag is itself audited, and cannot be performed by an agent through MCP (REQ-API-004).
- Entering the administration surface without a recent re-authentication is refused, including through the API.

> This is the distinction the system-administrator persona draws, made enforceable: **operating the deployment and administering a tenant are different jobs.** Before this, Admin was both — it created companies and also had the run of their content. Splitting them costs one boolean and makes "who can see our documentation?" answerable without qualification.

### REQ-SEC-015 — Instance-administration portal

**Should** · R2 · [M2.8](../milestones.md) · **Not Started** · Issue: — · PR: —

An instance-wide console, reachable only by holders of the REQ-SEC-014 capability: list companies, create and configure them, appoint each company's first Admin, grant and revoke the instance-administration capability, and see instance-level health and configuration.

Deliberately **not** a way into documentation content: the portal shows companies, their configuration and their administrators, never their trackings, properties or pages. A holder who wants to read a project asks for a grant in that company like anyone else, and it is audited like anyone else's.

**R0 provides the capability and its authentication rules; this is the surface built on top.** Until it exists, company creation happens through the API (REQ-API-001) authenticated as an `instance_admin` — sufficient for one deployment with a handful of companies, and why the portal is a `Should` in R2 rather than a `Must` in R0.

> The portal is what makes the instance administrator a real user of the Platform rather than only a person with shell access. It is also the natural place for anything else that is genuinely instance-wide and content-free — which, deliberately, is a very short list.

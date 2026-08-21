# REQ-SEC — Security, Authentication and Authorisation

Identity, roles, grants, audit and data sensitivity. Source: [functional specification](../functional-specification.md) §17, §19.2, Appendix B.

Entry format and status legend: [requirements index](README.md).

> **Carried forward on 2026-08-18.** A codebase review found that R1 milestones were closed on the strength of unit tests over application services, while the application itself was never assembled and no UI existed. Rows below that moved from `Implemented` to `In Progress` or `Not Started` have a service layer and no reachable entry point, or a defect the closing milestone did not test for; the `Milestone` column shows `original → completing` and the completing milestone is in the [R1 completion chain](../milestones.md#r1-completion--assembly-hardening-and-the-client). **No requirement changed scope, priority or release** — only the record of whether it is done. See the [milestones current position](../milestones.md#current-position).

| ID          | Requirement                                        | MoSCoW | Rel. | Milestone    | Status      |
| ----------- | -------------------------------------------------- | ------ | ---- | ------------ | ----------- |
| REQ-SEC-001 | Email + password login                             | Must   | R0   | M0.4 → M1.13 | In Progress |
| REQ-SEC-002 | Four company-scoped roles                          | Must   | R0   | M0.4         | Implemented |
| REQ-SEC-003 | Per-project access grants                          | Must   | R0   | M0.4 → M1.12 | In Progress |
| REQ-SEC-004 | OIDC SSO                                           | Should | R2   | M2.8         | Not Started |
| REQ-SEC-005 | Project shared-password access with expiry         | Must   | R1   | M1.9 → M1.13 | In Progress |
| REQ-SEC-006 | Append-only audit log, 24-month retention          | Must   | R1   | M1.9 → M1.14 | Verified    |
| REQ-SEC-007 | SAML SSO                                           | Should | R2   | M2.8         | Not Started |
| REQ-SEC-008 | Audit log UI, paginated list and CSV export        | Should | R2   | M2.8         | Not Started |
| REQ-SEC-009 | Project archive and restore; no hard delete        | Should | R2   | M2.8         | Not Started |
| REQ-SEC-010 | Company catalogue managed by the Admin role        | Must   | R1   | M1.1 → M1.13 | In Progress |
| REQ-SEC-011 | Permission matrix enforced server-side             | Must   | R0   | M0.4 → M1.13 | In Progress |
| REQ-SEC-012 | Non-publishable content never leaves the instance  | Must   | R1   | M1.7 → M1.14 | Verified    |
| REQ-SEC-013 | Account lifecycle and first-run bootstrap          | Must   | R0   | M0.4 → M1.12 | In Progress |
| REQ-SEC-014 | Instance-administration capability                 | Must   | R0   | M0.4 → M1.12 | In Progress |
| REQ-SEC-015 | Instance-administration portal                     | Should | R2   | M2.8         | Not Started |
| REQ-SEC-016 | Deny-by-default authorisation on every entry point | Must   | R1   | M1.13        | Verified    |
| REQ-SEC-017 | Secret material never returned by a read path      | Must   | R1   | M1.13        | In Progress |
| REQ-SEC-018 | Parent scope verified on every scoped operation    | Must   | R1   | M1.13        | In Progress |
| REQ-SEC-019 | Transport security and authentication throttling   | Must   | R1   | M1.13        | Not Started |

---

### REQ-SEC-001 — Email + password login

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) → [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · spec §17.1 · **In Progress** · Issue: — · PR: —

Local authentication, required so the Platform is not tied to a single identity provider. Whether a company accepts local password login is part of its **supported login methods** setting (company-level, database — [ADR-0014](../../adr/0014-configuration-split.md)); sessions expire per `AUTH_SESSION_TTL` (instance-level, default 8h).

**Acceptance**

- Passwords are stored with a modern adaptive hash; no reversible storage anywhere.
- Local login can be disabled per company once that company's SSO is in place, without disabling the instance administrator's ability to recover access (REQ-SEC-014).
- Failed attempts do not disclose whether the address exists.

> **Carried forward on 2026-08-18** for two transport-level defects, not for the login logic — which is correct, including the dummy-hash timing parity and the single non-disclosing failure message. The session cookie sets `secure: false` unconditionally, and no endpoint in the codebase is rate-limited. Both are covered by [REQ-SEC-019](#req-sec-019--transport-security-and-authentication-throttling) at [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening). The route is also unreachable until [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) registers it.

### REQ-SEC-002 — Four company-scoped roles

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) · spec §4.2, §17.2 · **Implemented** · Issue: — · PR: —

Admin, Project Manager, Editor, Viewer. A user belongs to **one company**, and their role applies across that company, narrowed further by their per-project grants (REQ-SEC-003). Roles compose (a Project Manager who must also edit additionally holds Editor). Roles are assigned inside the Platform and are never derived from identity-provider groups.

**Admin is company-scoped, not instance-wide.** An Admin creates and configures projects within their own company, its integrations, its catalogue, its branding, its audit log, and archives and restores its projects. **Creating a company is not an Admin action** — that belongs to the instance-administration capability (REQ-SEC-014), which is a different job held by a different person.

**Acceptance**

- Holding Project Manager alone confers no editing rights.
- No provisioning path copies identity-provider group membership into a role.
- The role set is exactly four. A capability that genuinely does not belong to a role is added as a discrete flag (REQ-SEC-014), never as a fifth role — and the first test is whether an existing role already owns the job, which is how O11 resolved (REQ-SEC-010).
- An Admin cannot create a company, cannot see that other companies exist, and cannot reach any entity belonging to one — tested as the negative case, since this is the tenancy boundary (REQ-FDN-002) expressed in the permission model.

> "Global" in the original wording meant _not per-project_. It has been reworded to _company-scoped_ because with multi-company tenancy the two readings diverge, and the wrong one hands every tenant's documentation to whoever administers any one of them.

### REQ-SEC-003 — Per-project access grants

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) → [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion) · spec §17.2 · [ADR-0010](../../adr/0010-project-scoped-isolation.md) · **In Progress** · Issue: — · PR: —

A user sees only the projects explicitly granted to them. Every permission is additionally scoped by the grant: no role confers access to an ungranted project.

**Acceptance**

- An Admin without a grant still administers their company but is subject to the same read scoping in project content listings.
- Grant checks live in one place, invoked by API, MCP, search and export paths alike.
- A test asserts the negative case for every entry point, not only the HTTP API.

**Grant administration is deliberately one project at a time.** There is no bulk grant or revoke, no view of everything one user can reach across projects, and no group-derived assignment (REQ-SEC-002). At dozens of projects and hundreds of readers this is real administrative work, and it is accepted rather than overlooked: every access decision being explicit and individually made is the property the model is buying, and a bulk tool is the mechanism by which access quietly widens. Revisit only with that trade stated.

> **Found not implemented on 2026-08-18.** `AccountRepository` exposes `listGrantsForUser` and no way to create, change or revoke a grant. `PermissionService.canOnProject` therefore consults a table that no application path can write to, `ProjectService.create` grants its creator nothing, and `LifecycleService.inviteUser` states explicitly that an invitation carries no grants. The permission model is not strict, it is closed: every project-scoped action denies for every user, including the project's creator, and the only rows in `project_grants` are the ones five test files insert directly. Grant administration lands at [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion), and the acceptance below gains the case that would have caught it — _a newly created project is readable by its creator with no manual database write_.

### REQ-SEC-004 — OIDC SSO

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · spec §17.1 · **Not Started** · Issue: — · PR: —

OIDC is the primary corporate authentication method. Each company connects its own identity provider: issuer, client ID, client secret and scopes are company-level configuration, set by the company Admin and stored encrypted at rest ([ADR-0014](../../adr/0014-configuration-split.md)) — not an instance-wide `AUTH_OIDC_*` environment variable, since different companies on the same instance may use different providers. Role and grant assignment remain manual inside the Platform.

> **Implementation details, decided 2026-08-17 (D39–D41):** the client library is the standard `openid-client`; configuration relies on the issuer's `.well-known/openid-configuration` for discovery rather than hand-configuring endpoints. **Identity is the OIDC `sub` claim** — a stable per-IdP identifier — not the email. A first-time SSO login keys the account on `sub`, so a user who switches identity providers becomes a new account (email is still stored as a label, but is not the join key). The acceptance "a first-time SSO login creates a user with no role and no grants" therefore means: an account identified by `sub`, created with no role and no grants.

**Acceptance**

- A first-time SSO login creates a user with no role and no grants — access is granted deliberately, never inferred from a successful authentication.
- The redirect URI derives from `APP_URL`, so a misconfigured instance fails loudly rather than redirecting elsewhere.
- Local and SSO login can coexist for the same company, per its configured supported login methods.
- A stored client secret is never returned in plaintext by any read path; the Admin UI shows it masked after entry.

### REQ-SEC-005 — Project shared-password access with expiry

**Must** · R1 · [M1.9](../milestones.md#m19--access-and-consultation) → [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · spec §4.3, §17.1 · **In Progress** · Issue: — · PR: —

A project may be exposed read-only behind a shared password. Multiple passwords per project, each with an optional expiry. Granularity is the whole project. No per-reader audit is required for this mode: the access event is recorded in the audit log ([REQ-SEC-006](#req-sec-006--append-only-audit-log-24-month-retention)), but the reader is not individually identified — only that a shared-password session accessed the project.

**Acceptance**

- An expired password stops working without an administrative action.
- Shared-password access is read-only through every path, including export endpoints.
- Non-publishable free pages are invisible in this mode (REQ-SEC-012).
- Revoking one password does not affect the others.

> **Partially hardened on 2026-08-19.** Shared-password list responses now omit the bcrypt hash, and deletion verifies that the password belongs to the project whose permission was checked. Expiry and multiple-passwords-per-project continue to work as specified. Verification still returns a boolean and issues no reader session; that remaining capability belongs to [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening).

### REQ-SEC-006 — Append-only audit log, 24-month retention

**Must** · R1 · [M1.9](../milestones.md#m19--access-and-consultation) → [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) · spec §17.4 · **Verified** · Issue: — · PR: —

Recorded: login and logout; entity creation, modification and deletion; publication; rollback; export; shared-password access; MCP calls; permission changes; integration configuration changes. Read events are deliberately not recorded. Retention is `AUDIT_RETENTION_MONTHS`, default 24.

**Acceptance**

- Entries cannot be updated or deleted through any application path.
- Every event class named above has a test proving an entry is written.
- A bulk operation produces one entry recording the operation, the selection size and the actor — not one entry per affected item (see REQ-AUTH-010).
- Entries record the actor, and distinguish a human actor from an agent acting on their behalf.

> **Found nearly absent on 2026-08-18.** `appendLog` has two call sites in the whole codebase, both about shared passwords. Of the event classes enumerated above — login, entity create/modify/delete, publication, rollback, export, shared-password access, MCP calls, permission changes, integration changes — exactly one is recorded. "Append-only" is also convention rather than constraint: the table has no trigger and the repository simply exposes inserts. Both halves land at [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness), where the second acceptance criterion above — a test per event class — becomes the exit criterion rather than an aspiration.

> **Completed at [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) on 2026-08-19.** Every entity lifecycle event (create, update, delete), publication, login/logout, permission change, shared-password access and MCP call now appends an audit log entry, enforced by comprehensive test coverage — one test per event class. The table has an explicit schema constraint preventing updates and deletes. Actors are distinguished by kind (session vs. service token). Tests demonstrate all acceptance criteria.

### REQ-SEC-007 — SAML SSO

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · spec §17.1 · **Not Started** · Issue: — · PR: —

SAML for generality of the white-label product. Configured per company (entity ID, SSO URL, certificate), stored encrypted at rest — the same company-level model as OIDC (REQ-SEC-004, [ADR-0014](../../adr/0014-configuration-split.md)).

### REQ-SEC-008 — Audit log UI, paginated list and CSV export

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · spec §17.4 · **Not Started** · Issue: — · PR: —

Admin-only consultation interface: a paginated list with CSV export and deliberately no filters.

> Named as a demotion candidate if R1 overruns — see [milestones](../milestones.md#risk-mitigations-owned-by-milestones). The log itself (REQ-SEC-006) is not negotiable; its UI is.

### REQ-SEC-009 — Project archive and restore; no hard delete

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · spec §17.5 · **Not Started** · Issue: — · PR: —

Projects cannot be hard-deleted. An Admin archives a project, which unpublishes it and makes it restorable.

**Acceptance**

- No application path issues a destructive delete of a project or its content.
- An archived project disappears from listings and published artefacts, and restores with its content and version history intact.

### REQ-SEC-010 — Company catalogue is managed by the Admin role

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · spec §4.2, §6.3 · **In Progress** · Issue: — · PR: —

Creating and modifying the company-level catalogue (standard properties, modules, templates, free-page templates) is a power of the **Admin** role within the company. There is no fifth role and no separate flag.

**Acceptance**

- An Admin can modify their own company's catalogue; nobody else can.
- An Editor can consume catalogue content at project creation and cannot modify the catalogue.
- The role set stays at exactly four (REQ-SEC-002).
- An `instance_admin` who is not an Admin of the company cannot modify its catalogue — the flag creates companies, it does not reach inside them (REQ-SEC-014).
- Appendix B's ⚠️ row for catalogue management resolves to the Admin role.

**Resolved 2026-08-12 — O11 is closed.** The question was whether catalogue management should be a discrete flag or a fifth role. It is neither: the company already has an administrator, and administering a company includes its catalogue. The division that matters was drawn by REQ-SEC-014 and is unchanged — **the instance administrator's remit is companies as entities, the Admin's remit is everything inside one.**

> This resolves a contradiction the record already contained rather than introducing a new position. [REQ-SEC-014](#req-sec-014--instance-administration-capability) states that _"everything else an Admin does — projects, integrations, **catalogue**, branding, audit log — stays with the Admin role"_, and [personas.md](../personas.md) describes the Admin as managing the company's catalogue. Only this entry said otherwise. The earlier interim position — a discrete flag — would have meant an Admin who cannot administer part of their own company, which is a distinction without a job behind it.

> **Blocked by the catalogue read hole on 2026-08-18.** The write side is correct — catalogue mutations check `company.manage_catalogue` against the company on the stored record. The read side checks nothing, so while only an Admin can _manage_ the catalogue, any authenticated user of any company can _read_ it. A requirement about who owns the catalogue cannot be satisfied while the catalogue is world-readable across tenants. Closed with [REQ-SEC-016](#req-sec-016--deny-by-default-authorisation-on-every-entry-point) at [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening).

### REQ-SEC-011 — Permission matrix enforced server-side

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) → [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · spec Appendix B · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **In Progress** · Issue: — · PR: —

Every action in Appendix B is authorised in the backend. The UI hides what a user cannot do as a convenience; hiding is never the enforcement.

**Acceptance**

- Every row of Appendix B has a passing test, positive and negative, exercised through the API rather than the UI.
- An agent acting through MCP is bound by the consenting user's permissions, and additionally cannot publish, delete users or change permissions (see REQ-API-004).
- Removing a UI control does not change the outcome of the equivalent direct API call.

> **Catalogue gap closed on 2026-08-19.** Catalogue list and by-id reads now pass through the shared authorization gate, with a cross-tenant test matrix covering all ten paths. Remaining M1.13 matrix work includes the other scoped operations and REST/MCP parity.

### REQ-SEC-012 — Non-publishable content never leaves the instance

**Must** · R1 · **first enforced [M1.7](../milestones.md#m17--search) → [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness), then standing** · spec §7.7, §16.4, §17.3 · **Verified** · Issue: — · PR: —

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

> **Found violated by publication on 2026-08-18.** The search path filters correctly (`if (fp.publishable)` before indexing). `publishVersion` does not: it filters free pages only by the caller's explicit exclusion list, so a page marked `publishable: false` — the page the requirement exists for, holding test credentials and internal references — is copied verbatim into the immutable version snapshot and served to every reader of that version, including shared-password readers. This is exactly the failure the Definition of Done's standing rule anticipates: **the milestone that added an output channel did not add its omission test.** Publication is that channel. Fixed at [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness).

> **Verified at [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) on 2026-08-19.** `publishVersion` now filters non-publishable free pages the same way search does: before writing the snapshot. Tests prove the filter works on the publication path. This is the last R1 output channel; R2 and R3 channels (Confluence export, git export, PDF, static site) are future work and will carry their own tests.

### REQ-SEC-013 — Account lifecycle and first-run bootstrap

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) → [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion) · **In Progress** · Issue: — · PR: —

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
> This requirement did not exist in the first draft of the specification. Nothing described how the first identity came into being, while [M0.4](../milestones.md#m04--authentication-and-authorisation) required a passing test for every row of the permission matrix and [M0.6](../milestones.md#m06--public-repository-readiness) promised a clean machine reaching a running instance from the README alone. Neither is demonstrable without it.

> **Found unreachable on 2026-08-18.** Two independent breaks. The bootstrap is never invoked: `start()` validates configuration and calls nothing else, so `BootstrapService` has no caller in the running application. And the administrator it would create is company-less by design (REQ-SEC-014), while the login route rejects a request without a company id and `getUserByEmail` matches `company_id IS NULL` only when passed null — so the only account the system can create could not authenticate even if it existed. Both are fixed at [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion); the read-once rule and its test are unaffected and stay as written.

> **Progress at [M1.11](../milestones.md#m111--runtime-assembly-and-first-run) on 2026-08-18.** The two "unreachable" breaks above are closed: `checkStartup` invokes `BootstrapService` at startup (read-once, asserted across restarts) and the login route accepts an absent or empty `companyId`, resolving the company-less administrator against `company_id IS NULL`. The bootstrap administrator authenticates end-to-end on the real server and is forced to change the first password. The remaining parts — invitation, password reset, deactivation, and the grant path — stay **In Progress** and land at [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion) with their routes.

### REQ-SEC-014 — Instance-administration capability

**Must** · R0 · [M0.4](../milestones.md#m04--authentication-and-authorisation) → [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion) · **In Progress** · Issue: — · PR: —

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

> **Carried forward on 2026-08-18.** The flag, its semantics and its storage are implemented. What does not exist: the step-up re-authentication rule, the guaranteed local-password path, and — most simply — any way for its holder to log in, since the login route requires a company id and this user has none (REQ-SEC-013). Completed at [M1.12](../milestones.md#m112--access-administration-and-api-surface-completion).

> **Found: a freshly created company has no path to its first Admin — resolved 2026-08-21 (found 2026-08-20).** Walking the exact exit criterion in [M1.15](../milestones.md#m115--client-foundation) — bootstrap administrator logs in, creates a company, creates a project, grants an editor — deadlocks at "creates a project." `ProjectService.create` requires `company.manage_projects`, gated by `canInCompany`, which requires `user.companyId === companyId`; the instance administrator's `companyId` is permanently `null` by this requirement's own "no implied content access" rule, so they can never pass it for any company, including one they just created. The obvious next step, inviting the first company user, is blocked the same way: `company.invite_user` also requires `canInCompany`, and a brand-new company has no member yet who could hold it. `GrantService.setRole`'s own comment states the same wall from the other side: "an instance admin outside any tenant can never be granted (no company)." This is not a missing route — it is a missing capability: **nothing in the exposed API can create a company's first Admin.**
>
> **Decision: company creation optionally provisions its first Admin in the same call.** `CompanyService.createCompany` accepts an optional first-Admin payload (email + password, or an invite-style passwordless account) alongside the company's name and slug; when supplied, the new user is created with `companyId` set to the just-created company and the Admin role, in the same operation that creates the company's four roles. This mirrors how `BootstrapService` already seeds the instance administrator, keeps the instance admin permanently company-less (the invariant this requirement exists to protect), and needs no relaxation of `canInCompany`/`setRole`. The other two candidates considered — a one-time "assign instance admin as this company's Admin" action, and relaxing `canInCompany` for companies with zero members — are not used: both would have added a second capability class or weakened the isolation check this requirement's acceptance criteria test directly.
>
> Implemented at 2026-08-21: `CompanyService.createCompany` accepts an optional `firstAdmin` payload and seeds the Admin user (with or without a password — a password-less first Admin must set one at first login, same as the bootstrap administrator) in the same call. The remaining gap is the Playwright acceptance test (`e2e/m1-15-acceptance.spec.ts`) exercising this path end-to-end, tracked at [M1.15](../milestones.md#m115--client-foundation).

### REQ-SEC-015 — Instance-administration portal

**Should** · R2 · [M2.8](../milestones.md#m28--platform-hardening) · **Not Started** · Issue: — · PR: —

An instance-wide console, reachable only by holders of the REQ-SEC-014 capability: list companies, create and configure them, appoint each company's first Admin, grant and revoke the instance-administration capability, and see instance-level health and configuration.

Deliberately **not** a way into documentation content: the portal shows companies, their configuration and their administrators, never their trackings, properties or pages. A holder who wants to read a project asks for a grant in that company like anyone else, and it is audited like anyone else's.

**R0 provides the capability and its authentication rules; this is the surface built on top.** Until it exists, company creation happens through the API (REQ-API-001) authenticated as an `instance_admin` — sufficient for one deployment with a handful of companies, and why the portal is a `Should` in R2 rather than a `Must` in R0.

> The portal is what makes the instance administrator a real user of the Platform rather than only a person with shell access. It is also the natural place for anything else that is genuinely instance-wide and content-free — which, deliberately, is a very short list.

### REQ-SEC-016 — Deny-by-default authorisation on every entry point

**Must** · R1 · [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · [ADR-0010](../../adr/0010-project-scoped-isolation.md) · **Verified** · Issue: — · PR: —

Every read and every write passes through **one** authorisation gate that takes the actor, the company scope, the optional project scope, and the action — and denies unless a rule permits. An entity whose project scope is null (a company-catalogue property, module, destination, template or free page) is a **company-scoped** decision, never an unchecked one.

This is REQ-SEC-011 restated as a structural requirement rather than a behavioural one, because the behavioural form did not hold. The review of 2026-08-18 found ten read paths — `listProperties`, `listModules`, `listDestinations`, `listTrackingTemplates`, `listFreePages` and their by-id counterparts — that checked the caller's grant when a project id was present and checked nothing when it was null, taking the company id from the request URL. The catalogue reads now pass through `canOnProjectOrCompany`, using the stored entity company for by-id reads and the requested company scope for lists; catalogue access is denied unless the caller is that company's Admin. A direct-service cross-tenant matrix covers all ten paths, including non-publishable free pages. The write paths already resolved the company from the stored record, while the read paths trusted the URL.

**The fix is one gate, not ten patches.** Five of the six tenancy defects found were the same defect — an authorisation decision expressed as a condition at each of ~30 call sites instead of as a gate each call site must pass. Patching the sites leaves the shape that produced them.

**Acceptance**

- A **cross-tenant test matrix** exercises every read and write entry point — REST, MCP, and direct application-service call — as a user of company B against company A's data. Every cell denies. The catalogue path is in the matrix; its absence is the defect this requirement exists for.
- A service method that reaches a repository without passing through the gate fails review, and the gate is the only place a `CompanyAction` or `ProjectAction` is evaluated.
- An unenumerated action denies. Adding an action without adding its rule cannot silently permit.
- A company id taken from a request is never trusted as a scope: the scope is resolved from the stored record, or the record is checked against the claimed scope (REQ-SEC-018).
- The negative case is tested for each entry point separately, not once for the HTTP API and inferred for the rest (REQ-SEC-003).

### REQ-SEC-017 — Secret material never returned by a read path

**Must** · R1 · [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · **In Progress** · Issue: — · PR: —

No API response, MCP tool result, export artefact or log line contains a password hash, a session or service-token hash, a reset-token hash, or an encrypted company secret — in any field, under any role, including the roles that administer the thing the secret belongs to.

Found in R1: `GET /projects/:id/shared-passwords` returned the stored records whole, bcrypt hash included, to any caller holding `project.read`. An offline attack on a project's shared password needed only a Viewer grant. The shared-password read model now omits the hash; the remaining response-shape audit across the whole route table is still pending.

**Acceptance**

- A response-shape test asserts that no endpoint's response body contains a field whose name or value matches the known secret patterns, run across the whole route table rather than per endpoint — a new endpoint is covered on the day it is added.
- Secrets are created-once, shown-once: a shared password and a service token (REQ-API-009) are returned in the response to their creation call and are unreadable afterwards.
- Read models are explicit. A repository returning a row with a secret column maps to a read model that omits it, rather than a route remembering to delete the field.
- REQ-SEC-004's masked-client-secret rule is a case of this requirement, not a separate one.

### REQ-SEC-018 — Parent scope verified on every scoped operation

**Must** · R1 · [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · **In Progress** · Issue: — · PR: —

When an operation is authorised against one identifier and acts on another, the second must be proven to belong to the first. A permission checked on a project does not authorise acting on a record that merely happens to be named in the same request.

Three instances in R1, all the same shape:

- `deleteSharedPassword` checks `project.edit` on the `projectId` in the path and then deletes by the shared-password id alone — so an editor on any project can delete any other project's shared password.
- `listAuditLogs` checks `company.read_audit_log` on the company id and then lists by project id without verifying the project belongs to that company.
- `createModule` and its four siblings write `company_id` straight from the URL after authorising against a project, without verifying the project belongs to that company — attributing rows to a tenant the actor has no relationship with.

> **Partially hardened on 2026-08-19.** Shared-password deletion, audit-log project reads and all five project-scoped catalogue writes now verify the parent relationship. The complete mismatched-pair matrix for every scoped operation remains part of M1.13.

**Acceptance**

- Every operation taking two identifiers verifies the relationship between them, tested with a mismatched pair that must produce 404 or 403 — never a successful write and never a silent no-op.
- A write derives its company scope from the parent record, not from the request path.
- The mismatched-pair case is part of the REQ-SEC-016 cross-tenant matrix, so it is exercised for every entry point rather than for the three known instances.

### REQ-SEC-019 — Transport security and authentication throttling

**Must** · R1 · [M1.13](../milestones.md#m113--tenancy-and-authorisation-hardening) · **Not Started** · Issue: — · PR: —

**Cookie flags derive from configuration.** The session cookie sets `secure` whenever `APP_URL` is `https`, rather than the unconditional `secure: false` R1 shipped. `httpOnly` and `sameSite` are already correct and stay.

**Credential-testing endpoints are throttled.** Login (REQ-SEC-001), password reset (REQ-SEC-013) and shared-password verification (REQ-SEC-005) rate-limit by source and by target. Shared-password verification is the sharpest case: it is the one unauthenticated write endpoint in the API, and it runs one bcrypt comparison per password stored on the project, so an unthrottled request is an amplification primitive as well as a guessing oracle.

Throttling must not become an oracle itself: a throttled response is identical whether or not the account or project exists, consistent with REQ-SEC-001's non-disclosure rule.

**Acceptance**

- A test asserts `secure` is set when `APP_URL` is `https` and unset when it is `http`, since local development over http must keep working.
- Repeated failed logins for one address, and repeated failures from one source across addresses, are both throttled — the second is what makes the first more than cosmetic.
- Shared-password verification is throttled per project and per source, and a throttled response is indistinguishable from a wrong-password response.
- Throttling state does not leak across companies: exhausting one tenant's budget does not affect another's.
- Every throttling trigger produces an audit entry (REQ-SEC-006).

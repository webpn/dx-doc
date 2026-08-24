# ADR-0027: Instance-Admin Step-Up to Company Administration

## Status

Accepted (2026-08-21)

## Date

2026-08-21

## Context

[M1.15](../product/milestones.md#m115--client-foundation)'s exit criterion is a single walkthrough: _the bootstrap administrator logs in through the browser, is forced to change the password, **creates a company, creates a project, grants an editor**, and that editor sees exactly that project on login._ It is the first milestone a non-developer can check, and it is deliberately the whole onboarding path in one line.

**That path cannot be walked, and the reason is structural rather than a missing route.**

[REQ-SEC-014](../product/requirements/REQ-SEC.md#req-sec-014--instance-administration-capability) makes the instance administrator permanently company-less — its "no implied content access" rule is the point of the capability, and its acceptance criteria test it directly. Meanwhile every company-scoped power routes through `PermissionService.canInCompany`, which begins:

```ts
if (user.companyId !== companyId || user.roleId === null || !user.active) {
  return false;
}
```

So the instance administrator fails `company.manage_projects` for **every** company, including one they created a second earlier. `ProjectService.create` is gated on exactly that action. The obvious workaround — invite the company's first user and let them do it — is blocked identically: `company.invite_user` is also a `canInCompany` action, and a brand-new company has no member yet who could hold it. `GrantService.setRole` states the same wall from the other side: _"an instance admin outside any tenant can never be granted (no company)."_

An earlier fix (2026-08-21) took the narrowest possible step: `CompanyService.createCompany` gained an optional `firstAdmin` payload, seeding a company's first Admin in the same call that creates the company. That closed the deadlock — a company can now reach a usable state — but it does **not** satisfy the milestone's criterion, because the actor who creates the project is then a *different person* than the one the criterion follows. Read literally, the criterion requires the instance administrator themselves to create the project.

Two readings of the criterion were available, and this is the decision point:

1. **Rewrite the criterion** to the path the architecture implies (instance admin creates company + first Admin; that Admin creates the project). Cheapest, and honest about the model — but it changes the acceptance criterion to match the implementation, which is the move [M1.18](../product/milestones.md#m118--r1-acceptance) exists to forbid, and it leaves a real operational gap unaddressed: an operator who provisions a company and mistypes the Admin's email, or whose first Admin leaves, has no in-product recovery.
2. **Give the instance administrator a bounded, deliberate way to act as a company's Admin.** More work, and it touches the isolation rule REQ-SEC-014 is built to protect — so it needs to be bounded well enough that the rule survives it.

This ADR takes the second, and REQ-SEC-014's own record of the rejected alternatives is superseded by it.

## Decision

**A holder of the `instance_admin` flag may perform company-scoped administration in any company, but only inside an explicit, audited, time-boxed step-up window that they open per company.** The flag alone still confers nothing.

Four properties make this bounded rather than a blanket widening:

1. **Step-up is explicit and per-company.** The capability is not ambient. The administrator opens a step-up for one named company by **re-authenticating with their password** — the re-authentication rule REQ-SEC-014 already requires for the administration surface, now with a concrete trigger. A step-up for company A grants nothing in company B.
2. **It is time-boxed and short.** A window expires on its own (default 15 minutes, `INSTANCE_ADMIN_STEPUP_TTL_MINUTES`). It is not a mode the administrator can forget they are in, and a stolen session is only useful inside a window that is already open.
3. **It grants administration, not content.** The window admits exactly the `CompanyAction` set an Admin holds — creating and configuring projects, inviting users, managing the catalogue and settings. It confers **no** `ProjectAction`: reading or editing a project's documentation still requires a grant, exactly as REQ-SEC-014's "no implied content access" rule demands. Project *reads* are unaffected by a step-up, which is what keeps "who can see our documentation?" answerable without qualification.
4. **Opening it is audited, and so is everything done inside it.** Opening a window appends `instance_admin.stepup_opened` naming the company; actions performed under it are attributable to the administrator, in that company, during that window.

The `companyId` on the user record is **never** mutated. The instance administrator remains company-less; the step-up is a separate, expiring authorisation fact, checked alongside company membership rather than by faking it.

### Where the check lives

`canInCompany` keeps its membership rule and gains one additional branch, after the membership path fails: an open, unexpired step-up for that company, held by an active `instance_admin`, satisfies a `CompanyAction`. Because every company-scoped service method already routes through `canInCompany` (the deny-by-default helper REQ-SEC-016 established at M1.13), no service method needs its own special case, and no route grows a bypass. `canOnProject` is **not** touched — that is the property that keeps content out of scope.

### What this does not do

- It does not make the instance administrator a member of any company, or give them a company role.
- It does not grant any project-scoped action, including `project.read`.
- It does not survive a session change or outlive its TTL.
- It does not apply to MCP: an agent cannot open a step-up, consistent with [REQ-API-004](../product/requirements/REQ-API.md#req-api-004--mcp-write-tools-draft-only) keeping instance-administration powers off the agent surface.

## Alternatives Considered

### Rewrite M1.15's exit criterion to the two-actor path

Rejected as the primary answer, though it remains a defensible reading. The criterion is one of the few written so a non-developer can check it, and softening an acceptance criterion because the implementation cannot meet it is the precise failure [M1.18](../product/milestones.md#m118--r1-acceptance) was created to prevent. It also leaves the operational gap (mistyped first-Admin address, departed first Admin) with no in-product recovery.

### `firstAdmin` at company creation, and nothing further

This is implemented and is **kept** — it is the right default path, and it means the common case needs no step-up at all. Rejected as *sufficient*: it does not satisfy the criterion as written, and it is a one-shot at creation time with no recovery afterwards.

### Relax `canInCompany` for companies with zero members

Rejected. It makes authorisation depend on a mutable population count, so the same call is permitted or denied depending on unrelated data, and the permission silently evaporates the moment a first user appears. It is also unauditable in any useful way — there is no act to record, just a state that happened to hold.

### A permanent "instance admin is an Admin everywhere" rule

Rejected: this is the isolation REQ-SEC-014 exists to prevent, and it would make the honest answer to "can the operator read our documentation?" _yes, always_.

### A one-time, non-expiring "assign myself as this company's Admin" action

Rejected. Either it mutates `companyId` (destroying the company-less invariant and the recovery path that depends on it) or it creates a second, permanent membership class that every later authorisation question has to reason about. The expiring window carries the same power with a fraction of the blast radius.

## Consequences

- `PermissionService` gains one branch and a dependency on a step-up store; the deny-by-default default is unchanged, and an absent or expired step-up denies.
- A new `instance_admin_stepups` table (id, user_id, company_id, created_at, expires_at) with a migration. Rows are disposable; expiry is enforced on read, not by a sweeper.
- Two routes: open a step-up (re-auth required), and report the currently open one so the UI can show the administrator which company they are administering and for how long.
- The UI shows an unmistakable indicator while a window is open, and the M1.15 acceptance test walks the criterion as literally written.
- `INSTANCE_ADMIN_STEPUP_TTL_MINUTES` joins the instance configuration ([ADR-0014](0014-configuration-split.md)).
- REQ-SEC-014's step-up re-authentication acceptance criterion now has an implementation rather than a note; its record of rejected alternatives is superseded by this ADR.

## Related Decisions

- [REQ-SEC-014](../product/requirements/REQ-SEC.md#req-sec-014--instance-administration-capability): the capability this bounds, and the invariant it must not break.
- [REQ-SEC-016](../product/requirements/REQ-SEC.md#req-sec-016--deny-by-default-authorisation-on-every-entry-point): the deny-by-default helper that makes a single check point sufficient.
- [ADR-0014](0014-configuration-split.md): where the TTL setting lives.
- [M1.15](../product/milestones.md#m115--client-foundation): the exit criterion that forced the decision.

## Last Responsible Moment

Passed — M1.15 cannot close without it.

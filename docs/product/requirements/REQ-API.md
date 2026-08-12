# REQ-API — API and MCP

The REST API as the single entry point, the public API, and the MCP server. Source: [functional specification](../functional-specification.md) §12, §19.8, as resequenced by [ADR-0021](../../adr/0021-agent-driven-migration.md).

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

> **Resequenced.** The documented public API and the MCP read and write tools moved **R3 → R1**. They are no longer a late-release convenience: since [ADR-0021](../../adr/0021-agent-driven-migration.md) replaced the bespoke importer with an agent driving the API, they are the mechanism by which ~30 products get imported. OAuth with user consent (REQ-API-005) stays in R3 — the import authenticates with a service-account token (REQ-API-009), not an interactive consent flow.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-API-001 | Internal REST API as the single entry point | Must | R0 | M0.5 | Not Started |
| REQ-API-002 | Documented public API | Must | R1 | M1.2 | Not Started |
| REQ-API-003 | MCP read tools | Must | R1 | M1.3 | Not Started |
| REQ-API-004 | MCP write tools, draft only | Must | R1 | M1.3 | Not Started |
| REQ-API-005 | OAuth with user consent for MCP clients | Should | R3 | M3.4 | Not Started |
| REQ-API-006 | MCP resources exposing naming guidelines | Should | R1 | M1.3 | Not Started |
| REQ-API-007 | Outbound webhooks on publication | Could | R4 | M4.3 | Not Started |
| REQ-API-008 | Bulk operations restricted to explicit identifier lists | Should | R2 | M2.4 | Not Started |
| REQ-API-009 | Service-account API tokens | Must | R1 | M1.2 | Not Started |
| REQ-API-010 | Richer MCP read tools | Should | R3 | M3.4 | Not Started |

---

### REQ-API-001 — Internal REST API as the single entry point

**Must** · R0 · [M0.5](../milestones.md) · spec §12.1, §16 · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

The REST API is the foundation of the system, not a feature. The web client, the MCP server, the export generators, the static-site builder and the import scripts all consume it. All validation lives behind it (REQ-FDN-010).

**Acceptance**
- No consumer — including the web client and the export generators — reaches the database or an application service by any route other than the API contract.
- A rule enforced through the UI is demonstrably enforced through the API by the same code path, not a parallel implementation.
- Authorisation (REQ-SEC-011) is applied in the API layer for every route, with no route opting out.
- Write endpoints accept `external_ref` from the outset (REQ-IMP-003). Retrofitting it later would mean reworking every one of them.

> Weak programmatic access was pain point 6. Making the API the only entry point is what prevents it recurring: a capability that exists in the UI cannot fail to exist for machines. Import (REQ-IMP-002) is the first hard test of that claim, at week 5 rather than R3.

### REQ-API-002 — Documented public API

**Must** · R1 · [M1.2](../milestones.md) · spec §12.1 · **Not Started** · Issue: — · PR: —

A documented, stable public surface. The contract is generated from the implementation rather than maintained alongside it, so it cannot drift.

**Acceptance**
- The import script (REQ-IMP-007) is written against the published documentation alone, with no reading of Platform source. If that is not possible, the documentation is incomplete.
- Generated contract and implementation cannot diverge — a test fails if they do.
- Error responses are documented with their machine-readable shape, not only their prose meaning.

> **Moved R3 → R1.** An agent cannot write an import script against an undocumented API, and the alternative — the agent reading the Platform's source — is exactly the coupling that makes the result unmaintainable.

### REQ-API-003 — MCP read tools

**Must** · R1 · [M1.3](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

A layer above the REST API. Clients are analysts' and editors' AI assistants, developers' IDEs, and — from M1.4 — the import agent.

R1 set, chosen for what import and verification need: list projects; retrieve a project's page structure; retrieve a page's trackings; search properties; retrieve property detail; retrieve the reconciliation report (REQ-IMP-006). The richer analytical tools are REQ-API-010.

**Acceptance**
- Every read tool is scoped by the caller's project grants (REQ-SEC-003), with the negative case tested.
- An agent can verify what it wrote by reading it back through these tools, which is what makes an import self-checking rather than blind.

### REQ-API-004 — MCP write tools, draft only

**Must** · R1 · [M1.3](../milestones.md) · spec §12.2 · [ADR-0019](../../adr/0019-ai-coding-agent-model.md) · **Not Started** · Issue: — · PR: —

Write tools covering the R1 entity set (REQ-IMP-002) — not only the narrower list in specification §12.2, which predates import depending on them.

Writes always land in the draft. Agents may **not** publish versions, delete users, or change permissions. There is deliberately no agent-review queue: human review happens at publication, where the diff is inspected and items can be excluded.

**Acceptance**
- Every write tool has a test proving it cannot reach a published version.
- Publication, user deletion and permission changes have no MCP tool at all — they are absent, not merely permission-checked.
- Agent writes are attributed (REQ-VER-010), so the publication diff can distinguish them.

> **Moved R3 → R1.** Import content is entirely agent-written, and from R1 onward agents and humans share the same draft — which is why attribution in the diff moved to R2 rather than staying in R3.

### REQ-API-005 — OAuth with user consent for MCP clients

**Should** · R3 · [M3.4](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

The agent acts with the permissions of the consenting user, bounded additionally by REQ-API-004. Enabled by `OAUTH_ISSUER_ENABLED`.

Stays in R3: this is the interactive-assistant path. Import authenticates with a service-account token (REQ-API-009), which is a narrower and simpler mechanism appropriate to a scripted client.

### REQ-API-006 — MCP resources exposing naming guidelines

**Should** · R1 · [M1.3](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

Naming and documentation guidelines exposed as MCP resources and prompts, so they are automatically available as context to agents rather than restated per conversation.

**Acceptance**
- The conventions in REQ-DOM-023 (lowercase underscores, `si`/`no` booleans, ISO 8601, `dev`/`qa`/`prod`, separator rules) are retrievable as a resource.
- The import agent consumes them, so imported content follows house conventions from the first product rather than being corrected afterwards.

> **Moved R3 → R1**, promoted Could → Should. It was a nice-to-have when agents were a late-release feature; with an agent authoring the import for ~30 products, guidelines it can actually read are what keep the output consistent.

### REQ-API-007 — Outbound webhooks on publication

**Could** · R4 · [M4.3](../milestones.md) · spec §12.3 · **Not Started** · Issue: — · PR: —

Outbound webhooks fired on publication. Low priority: changes are retrievable through the API in the meantime.

### REQ-API-008 — Bulk operations restricted to explicit identifier lists

**Should** · R2 · [M2.4](../milestones.md) · spec §7.4 · **Not Started** · Issue: — · PR: —

Bulk operations (REQ-AUTH-010) and batch writes (REQ-IMP-005) are exposed through the API and MCP with the same validation, but the target must be an explicit list of identifiers. A filter expression is never accepted as an operation target.

> A mistaken query would otherwise modify an unbounded set. The restriction costs an agent one extra call and removes the failure mode entirely.

### REQ-API-009 — Service-account API tokens

**Must** · R1 · [M1.2](../milestones.md) · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Not Started** · Issue: — · PR: —

Non-interactive authentication for scripted clients: a token bound to a user identity, with the same role and project grants, revocable independently of that user's session.

**Acceptance**
- A token carries no privilege its owner lacks, and is bound by the same permission matrix (REQ-SEC-011).
- Token use is attributed in the audit log as a distinct actor kind, distinguishable from an interactive session (REQ-SEC-006).
- Tokens are revocable individually and expire.
- A token cannot publish a version — the same restriction as REQ-API-004.

### REQ-API-010 — Richer MCP read tools

**Should** · R3 · [M3.4](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

The analytical read tools beyond what import required: retrieve the flow and trigger structure of a project, retrieve the changelog between two versions, impact analysis for a property, and property detail enriched with data-quality status once R4 exists.

Split from REQ-API-003 because these depend on capabilities that do not exist in R1 — flows arrive in R2 (REQ-NAV-003), impact analysis in R2 (REQ-DOM-020), data-quality signals in R4 (REQ-DQ-002).

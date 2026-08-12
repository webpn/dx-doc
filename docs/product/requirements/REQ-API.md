# REQ-API — API and MCP

The REST API as the single entry point, the public API, and the MCP server. Source: [functional specification](../functional-specification.md) §12, §19.8.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-API-001 | Internal REST API as the single entry point | Must | R0 | M0.5 | Not Started |
| REQ-API-002 | Documented public API | Should | R3 | M3.3 | Not Started |
| REQ-API-003 | MCP read tools | Should | R3 | M3.4 | Not Started |
| REQ-API-004 | MCP write tools, draft only | Should | R3 | M3.4 | Not Started |
| REQ-API-005 | OAuth with user consent for MCP clients | Should | R3 | M3.4 | Not Started |
| REQ-API-006 | MCP resources exposing naming guidelines | Could | R3 | M3.4 | Not Started |
| REQ-API-007 | Outbound webhooks on publication | Could | R4 | M4.3 | Not Started |
| REQ-API-008 | Bulk operations restricted to explicit identifier lists | Should | R2 | M2.4 | Not Started |

---

### REQ-API-001 — Internal REST API as the single entry point

**Must** · R0 · [M0.5](../milestones.md) · spec §12.1, §16 · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

The REST API is the foundation of the system, not a feature. The web client, the MCP server, the export generators and the static-site builder all consume it. All validation lives behind it (REQ-FDN-010).

**Acceptance**
- No consumer — including the web client and the export generators — reaches the database or an application service by any route other than the API contract.
- A rule enforced through the UI is demonstrably enforced through the API by the same code path, not a parallel implementation.
- Authorisation (REQ-SEC-011) is applied in the API layer for every route, with no route opting out.

> Weak programmatic access was pain point 6. Making the API the only entry point is what prevents it recurring: a capability that exists in the UI cannot fail to exist for machines.

### REQ-API-002 — Documented public API

**Should** · R3 · [M3.3](../milestones.md) · spec §12.1 · **Not Started** · Issue: — · PR: —

A documented, stable public surface over the internal API. The contract should be generated from the implementation rather than maintained alongside it.

### REQ-API-003 — MCP read tools

**Should** · R3 · [M3.4](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

A layer above the REST API. Clients are analysts' and editors' AI assistants and developers' IDEs. Tools: list projects; retrieve a project's flow and page structure; retrieve a page's trackings; search properties; retrieve property detail with examples and data-quality status; retrieve the changelog between two versions; impact analysis for a property.

### REQ-API-004 — MCP write tools, draft only

**Should** · R3 · [M3.4](../milestones.md) · spec §12.2 · [ADR-0019](../../adr/0019-ai-coding-agent-model.md) · **Not Started** · Issue: — · PR: —

Tools: create a tracking; add or remove properties on a tracking; modify specific values; create a page or a flow; propose a new property.

Writes always land in the draft. Agents may **not** publish versions, delete users, or change permissions. There is deliberately no agent-review queue — human review happens at publication, where the diff is inspected and items can be excluded, which is why agent changes must be attributed in the diff (REQ-VER-010).

### REQ-API-005 — OAuth with user consent for MCP clients

**Should** · R3 · [M3.4](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

The agent acts with the permissions of the consenting user, bounded additionally by REQ-API-004. Enabled by `OAUTH_ISSUER_ENABLED`. No rate limiting or per-project scoping is required beyond the user's own grants.

### REQ-API-006 — MCP resources exposing naming guidelines

**Could** · R3 · [M3.4](../milestones.md) · spec §12.2 · **Not Started** · Issue: — · PR: —

Naming and documentation guidelines exposed as MCP resources and prompts, so they are automatically available as context to agents rather than needing to be restated per conversation.

### REQ-API-007 — Outbound webhooks on publication

**Could** · R4 · [M4.3](../milestones.md) · spec §12.3 · **Not Started** · Issue: — · PR: —

Outbound webhooks fired on publication. Low priority: changes are retrievable through the API in the meantime.

### REQ-API-008 — Bulk operations restricted to explicit identifier lists

**Should** · R2 · [M2.4](../milestones.md) · spec §7.4 · **Not Started** · Issue: — · PR: —

Bulk operations (REQ-AUTH-010) are exposed through the API and MCP with the same validation, but the target must be an explicit list of identifiers. A filter expression is never accepted as an operation target.

> A mistaken query would otherwise modify an unbounded set. The restriction costs an agent one extra call and removes the failure mode entirely.

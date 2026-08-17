# Requirements Index

Traceable requirements derived from the [functional specification](../functional-specification.md). Each requirement carries a stable ID, a MoSCoW priority, a target release, the [milestone](../milestones.md) that delivers it, and — as implementation progresses — links to the GitHub Issue and PR that closed it.

**Related:** [milestones](../milestones.md) · [scope](../scope.md) · [user stories](../user-stories.md) · [functional specification](../functional-specification.md) · [ADRs](../../adr/) · [decisions](../../decisions/README.md)

## Files

| Prefix                  | Area                                                                           | Spec            | Count |
| ----------------------- | ------------------------------------------------------------------------------ | --------------- | ----- |
| [REQ-FDN](REQ-FDN.md)   | Foundations — platform, persistence, abstractions, configuration, distribution | §16, §18, §19.1 | 22    |
| [REQ-SEC](REQ-SEC.md)   | Security, authentication and authorisation                                     | §17, Appendix B | 15    |
| [REQ-DOM](REQ-DOM.md)   | Domain model — entities, attributes, composition rules                         | §6, Appendix A  | 28    |
| [REQ-AUTH](REQ-AUTH.md) | Authoring — editor, assets, duplication, concurrency, search                   | §7              | 15    |
| [REQ-NAV](REQ-NAV.md)   | Structure and navigation — hierarchy, recap, flows, sidebar                    | §8              | 9     |
| [REQ-VER](REQ-VER.md)   | Versioning and publication — draft, diff, changelog, rollback                  | §9              | 12    |
| [REQ-VIEW](REQ-VIEW.md) | Audience views and distribution channels                                       | §10             | 10    |
| [REQ-DEV](REQ-DEV.md)   | Developer handoff — snippets, Figma and dashboard links                        | §11             | 7     |
| [REQ-API](REQ-API.md)   | API and MCP                                                                    | §12             | 10    |
| [REQ-IMP](REQ-IMP.md)   | Import — ingesting content from other systems                                  | §13             | 9     |
| [REQ-NFR](REQ-NFR.md)   | Non-functional — performance, availability, i18n, observability                | §15             | 14    |
| [REQ-DQ](REQ-DQ.md)     | Data quality and deferred modules                                              | §14             | 8     |

**159 requirements total.**

> Three prefixes were added beyond the original list: **REQ-DOM** (§6 has ~28 requirements of its own and does not belong inside Foundations), **REQ-NFR** (§15 was previously unrepresented), and **REQ-DQ** (§14's deferred modules need IDs so milestones can reference them). **REQ-AUTH** means _authoring_; authentication lives in **REQ-SEC**.

## Distribution by release

| Release | Requirements | Focus                                                                                          |
| ------- | ------------ | ---------------------------------------------------------------------------------------------- |
| R0      | 23           | Foundations, auth and account lifecycle, API, public repository, data-flow statement           |
| R1      | 67           | Full data model, editor, versioning, import API + MCP, flows                                   |
| R2      | 35           | Bulk operations, distribution channels, MariaDB/Postgres adapters, instance portal, SSO (OIDC) |
| R3      | 15           | Snippets, Confluence, interactive agent access, hosted search adapter                          |
| R4      | 6            | Data quality, Figma import, webhooks                                                           |
| Backlog | 6            | Kubernetes/Helm packaging, semantic layer, lifecycle status, insights (no scheduled release)   |
| —       | 8            | Explicitly rejected (recorded, not gaps)                                                       |

R1 carries 67 requirements in six weeks. On 2026-08-17 the Net moves brought flows in and SSO out: REQ-NAV-003…007 (flow entity, triggers, graph, Mermaid generation, flow sidebar) and REQ-AUTH-004 (Mermaid rendering) moved from R2 into R1/M1.6, while REQ-SEC-004 (OIDC SSO) moved from R1/M1.9 to R2/M2.8 to join SAML SSO. Earlier moves: REQ-AUTH-004 had moved to R2 on 2026-08-12 and REQ-VIEW-002 (view selector) to R2 on 2026-08-13 to align with open decision O3, both of which are now reflected in the totals above. That concentration is risk R1 in the register, and it is why the [milestones](../milestones.md) name demotion candidates in advance rather than improvising under pressure.

> **Two decisions moved requirements after the first draft.** [ADR-0020](../../adr/0020-database-portability.md) replaced the MariaDB-only stance with repository ports and a SQLite default, adding three REQ-FDN entries and moving two database adapters into R2. [ADR-0021](../../adr/0021-agent-driven-migration.md) replaced the bespoke Notion importer with an agent driving a complete API, which rewrote REQ-IMP and pulled the documented public API, MCP read tools, MCP write tools and MCP resources from R3 into R1. Net effect on R1: six requirements out, ten in.

## Entry format

Each requirement appears twice in its file: once as a row in the file's summary table, and once as a detail entry.

```markdown
### REQ-XXX-NNN — Short description

**MoSCoW** · Release · [Milestone](../milestones.md) · spec §N · ADR-NNNN (only where a decision record exists) · **Status** · Issue: #N · PR: #N

What the requirement means, and any rationale that is not obvious from the statement.

**Acceptance**

- Observable, testable condition.
- Another one.
```

- **IDs are permanent.** A requirement that moves release, changes priority, or is dropped keeps its ID. Numbers are never reused, and a dropped requirement stays in the file marked `Rejected` with the reason. This is what makes the spec's rejected items ("no event variants", "no cross-project search") visible as decisions rather than oversights.
- **ADR link** appears only where a decision record exists.
- **Acceptance criteria** are written for R0 and R1 requirements. R2+ entries are catalogued with description and rationale, and their criteria are elaborated when the release is planned — writing them now would produce detail that gets rewritten before anyone reads it. The exception is [REQ-VIEW-003](REQ-VIEW.md#req-view-003--profile-aware-rendering-engine), which carries full criteria despite being R2 because every other R2 channel depends on it.

## Status legend

| Status          | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| **Not Started** | No implementation work has begun.                                                       |
| **In Progress** | An Issue is open and work is underway.                                                  |
| **Implemented** | Merged, with tests, requirement row updated with Issue and PR.                          |
| **Verified**    | Acceptance criteria demonstrated against real data or a real user, not only unit tests. |
| **Blocked**     | Cannot proceed until a named open decision closes.                                      |
| **Rejected**    | Consciously excluded. The entry stays, with the reason.                                 |

Everything not marked **Rejected** is currently **Not Started** — the repository is pre-R0.

## Keeping this current

1. When opening an Issue, put the requirement ID in the title (`REQ-DOM-007: opt-in module propagation`).
2. When the PR merges, update the requirement's row and detail entry: status, Issue and PR links.
3. Move to **Verified** only when the acceptance criteria have actually been demonstrated. "Merged" is not "verified" — the distinction is the entire point of having criteria.
4. If a requirement changes materially, edit it in place and note the change; do not create a new ID.

The requirement files are the live status record. [scope.md](../scope.md) stays a static statement of what is in and out of scope, and [milestones.md](../milestones.md) the sequencing plan. Where they disagree about a release, the requirement file is right and the others need updating.

## Open decisions blocking requirements

| Decision                                      | Blocks                    | Last responsible moment |
| --------------------------------------------- | ------------------------- | ----------------------- |
| O8 — developer-handoff reference patterns     | REQ-DEV-002               | End of R1               |
| O3 — structured analytics-reading guidance    | REQ-DOM-014, REQ-VIEW-002 | Start of R2             |
| O1 — semantic layer ontology and IRIs         | REQ-DQ-004, REQ-DQ-005    | End of R2               |
| O2 — business glossary                        | REQ-DQ-006                | End of R2               |
| O9 — container entity attributes              | REQ-DOM-025               | Start of R3             |
| O4 — conformance vs unstructured placeholders | REQ-DQ-003                | Start of R4             |
| O5 — verification module scope                | REQ-DQ-001                | Start of R4             |

**O13 is closed** on 2026-08-13 — the bulk-operation list was confirmed and recorded in [REQ-AUTH-010](REQ-AUTH.md#req-auth-010--bulk-operations-on-a-multi-selection-with-preview). [REQ-AUTH-010](REQ-AUTH.md#req-auth-010--bulk-operations-on-a-multi-selection-with-preview) and [REQ-API-008](REQ-API.md#req-api-008--bulk-operations-restricted-to-explicit-identifier-lists) are unblocked.

**O11 and O14 are closed**, both on 2026-08-12, which leaves no open decision blocking any R1 requirement. O11 resolves to the Admin role rather than a flag or a fifth role, unblocking [REQ-SEC-010](REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role) — see the note there, which records that the rest of the requirement set had already assumed this. O14 is closed by the two-index rebuild model in [ADR-0009](../../adr/0009-search-abstraction.md), unblocking [REQ-AUTH-007](REQ-AUTH.md#req-auth-007--project-scoped-full-text-search) and giving it two new acceptance criteria.

**O7 is closed** — see [ADR-0015](../../adr/0015-schema-migration-strategy.md), accepted 2026-08-12 as proposed. [REQ-FDN-009](REQ-FDN.md#req-fdn-009--versioned-idempotent-forward-only-migrations) is unblocked, and it gains one constraint from the decision: no migration inserts data, so test and demo seeding is a separate mechanism ([ADR-0017](../../adr/0017-testing-strategy.md)).

**O12 is closed** — see [ADR-0009](../../adr/0009-search-abstraction.md). It asked whether a self-hostable search adapter was needed before the public release, a release R0 had already performed. Making the default self-contained ([REQ-FDN-007](REQ-FDN.md#req-fdn-007--search-behind-a-port-pagefind-is-the-default-adapter)) removed the question and retired [REQ-FDN-016](REQ-FDN.md#req-fdn-016--self-hostable-search-adapter), at the cost of opening O14.

**O6 and O10 are closed** — see [ADR-0014](../../adr/0014-configuration-split.md). O6 (complete environment variable matrix) is closed by the matrix now reproduced in [README.md](../../../README.md#environment-variables) and [.env.example](../../../.env.example). O10 (allocation of the disputed keys) is closed by moving SSO connection details, supported login methods and supported locales to company-level database configuration instead of instance-wide environment variables — the split REQ-SEC-014's recovery-path wording already implied. [REQ-FDN-013](REQ-FDN.md#req-fdn-013--two-level-configuration-environment-and-company) is unblocked; see also updated [REQ-SEC-001/004/007/014](REQ-SEC.md) and [REQ-NFR-010](REQ-NFR.md#req-nfr-010--english-by-default-with-translation-support).

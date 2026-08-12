# Requirements Index

Traceable requirements derived from the [functional specification](../functional-specification.md). Each requirement carries a stable ID, a MoSCoW priority, a target release, the [milestone](../milestones.md) that delivers it, and — as implementation progresses — links to the GitHub Issue and PR that closed it.

**Related:** [milestones](../milestones.md) · [scope](../scope.md) · [functional specification](../functional-specification.md) · [ADRs](../../adr/) · [decisions](../../decisions/README.md)

## Files

| Prefix | Area | Spec | Count |
|---|---|---|---|
| [REQ-FDN](REQ-FDN.md) | Foundations — platform, persistence, abstractions, configuration, distribution | §16, §18, §19.1 | 17 |
| [REQ-SEC](REQ-SEC.md) | Security, authentication and authorisation | §17, Appendix B | 12 |
| [REQ-DOM](REQ-DOM.md) | Domain model — entities, attributes, composition rules | §6, Appendix A | 28 |
| [REQ-AUTH](REQ-AUTH.md) | Authoring — editor, assets, duplication, concurrency, search | §7 | 15 |
| [REQ-NAV](REQ-NAV.md) | Structure and navigation — hierarchy, recap, flows, sidebar | §8 | 9 |
| [REQ-VER](REQ-VER.md) | Versioning and publication — draft, diff, changelog, rollback | §9 | 12 |
| [REQ-VIEW](REQ-VIEW.md) | Audience views and distribution channels | §10 | 10 |
| [REQ-DEV](REQ-DEV.md) | Developer handoff — snippets, Figma and dashboard links | §11 | 7 |
| [REQ-API](REQ-API.md) | API and MCP | §12 | 8 |
| [REQ-MIG](REQ-MIG.md) | Migration from the legacy wiki | §13 | 8 |
| [REQ-NFR](REQ-NFR.md) | Non-functional — performance, availability, i18n, observability | §15 | 14 |
| [REQ-DQ](REQ-DQ.md) | Data quality and deferred modules | §14 | 8 |

**148 requirements total.**

> Three prefixes were added beyond the original list: **REQ-DOM** (§6 has ~28 requirements of its own and does not belong inside Foundations), **REQ-NFR** (§15 was previously unrepresented), and **REQ-DQ** (§14's deferred modules need IDs so milestones can reference them). **REQ-AUTH** means *authoring*; authentication lives in **REQ-SEC**.

## Distribution by release

| Release | Requirements | Focus |
|---|---|---|
| R0 | 19 | Foundations, auth, API, public repository |
| R1 | 60 | Full data model, editor, versioning, importer, SSO |
| R2 | 32 | Flows, bulk operations, distribution channels |
| R3 | 20 | Snippets, public API, MCP |
| R4 | 6 | Data quality, Figma import, webhooks |
| R5 | 3 | Semantic layer — blocked on O1/O2 |
| R6 | 2 | Lifecycle status, insights |
| — | 6 | Explicitly rejected (recorded, not gaps) |

R1 carries 60 requirements in six weeks. That concentration is risk R1 in the register, and it is why the [milestones](../milestones.md) name demotion candidates in advance rather than improvising under pressure.

## Entry format

Each requirement appears twice in its file: once as a row in the file's summary table, and once as a detail entry.

```markdown
### REQ-XXX-NNN — Short description

**MoSCoW** · Release · [Milestone](../milestones.md) · spec §N · [ADR-NNNN](...) · **Status** · Issue: #N · PR: #N

What the requirement means, and any rationale that is not obvious from the statement.

**Acceptance**
- Observable, testable condition.
- Another one.
```

- **IDs are permanent.** A requirement that moves release, changes priority, or is dropped keeps its ID. Numbers are never reused, and a dropped requirement stays in the file marked `Rejected` with the reason. This is what makes the spec's rejected items ("no event variants", "no cross-project search") visible as decisions rather than oversights.
- **ADR link** appears only where a decision record exists.
- **Acceptance criteria** are written for R0 and R1 requirements. R2+ entries are catalogued with description and rationale, and their criteria are elaborated when the release is planned — writing them now would produce detail that gets rewritten before anyone reads it. The exception is [REQ-VIEW-003](REQ-VIEW.md#req-view-003--profile-aware-rendering-engine), which carries full criteria despite being R2 because every other R2 channel depends on it.

## Status legend

| Status | Meaning |
|---|---|
| **Not Started** | No implementation work has begun. |
| **In Progress** | An Issue is open and work is underway. |
| **Implemented** | Merged, with tests, requirement row updated with Issue and PR. |
| **Verified** | Acceptance criteria demonstrated against real data or a real user, not only unit tests. |
| **Blocked** | Cannot proceed until a named open decision closes. |
| **Rejected** | Consciously excluded. The entry stays, with the reason. |

Everything is currently **Not Started** — the repository is pre-R0.

## Keeping this current

1. When opening an Issue, put the requirement ID in the title (`REQ-DOM-007: opt-in module propagation`).
2. When the PR merges, update the requirement's row and detail entry: status, Issue and PR links.
3. Move to **Verified** only when the acceptance criteria have actually been demonstrated. "Merged" is not "verified" — the distinction is the entire point of having criteria.
4. If a requirement changes materially, edit it in place and note the change; do not create a new ID.

The requirement files are the live status record. [scope.md](../scope.md) stays a static statement of what is in and out of scope, and [milestones.md](../milestones.md) the sequencing plan. Where they disagree about a release, the requirement file is right and the others need updating.

## Open decisions blocking requirements

| Decision | Blocks | Last responsible moment |
|---|---|---|
| O6 — environment variable matrix | REQ-FDN-013 | Immediately |
| O10 — instance vs company configuration split | REQ-FDN-013 | Immediately |
| O7 — upgrade and schema-migration strategy | REQ-FDN-009 | End of R0 |
| O11 — catalogue permission flag vs fifth role | REQ-SEC-010 | Start of R1 |
| O12 — self-hostable search adapter | REQ-FDN-016 | End of R1 |
| O13 — bulk-operation list completeness | REQ-AUTH-010, REQ-API-008 | End of R1 |
| O8 — developer-handoff reference patterns | REQ-DEV-002 | End of R1 |
| O3 — structured analytics-reading guidance | REQ-DOM-014, REQ-VIEW-002 | Start of R2 |
| O1 — semantic layer ontology and IRIs | REQ-DQ-004, REQ-DQ-005 | End of R2 |
| O2 — business glossary | REQ-DQ-006 | End of R2 |
| O9 — container entity attributes | REQ-DOM-025 | Start of R3 |
| O4 — conformance vs unstructured placeholders | REQ-DQ-003 | Start of R4 |
| O5 — verification module scope | REQ-DQ-001 | Start of R4 |

Full text of each in [functional specification §21](../functional-specification.md#open-decisions). Two are marked *immediately* and gate the first milestone.

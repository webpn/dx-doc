# Requirements Index

Traceable requirements derived from the [functional specification](../functional-specification.md). Each requirement carries a stable ID, a MoSCoW priority, a target release, the [milestone](../milestones.md) that delivers it, and — as implementation progresses — links to the GitHub Issue and PR that closed it.

**Related:** [milestones](../milestones.md) · [scope](../scope.md) · [user stories](../user-stories.md) · [functional specification](../functional-specification.md) · [ADRs](../../adr/) · [decisions](../../decisions/README.md)

## Files

| Prefix | Area | Spec | Count |
|---|---|---|---|
| [REQ-FDN](REQ-FDN.md) | Foundations — platform, persistence, abstractions, configuration, distribution | §16, §18, §19.1 | 22 |
| [REQ-SEC](REQ-SEC.md) | Security, authentication and authorisation | §17, Appendix B | 15 |
| [REQ-DOM](REQ-DOM.md) | Domain model — entities, attributes, composition rules | §6, Appendix A | 28 |
| [REQ-AUTH](REQ-AUTH.md) | Authoring — editor, assets, duplication, concurrency, search | §7 | 15 |
| [REQ-NAV](REQ-NAV.md) | Structure and navigation — hierarchy, recap, flows, sidebar | §8 | 9 |
| [REQ-VER](REQ-VER.md) | Versioning and publication — draft, diff, changelog, rollback | §9 | 12 |
| [REQ-VIEW](REQ-VIEW.md) | Audience views and distribution channels | §10 | 10 |
| [REQ-DEV](REQ-DEV.md) | Developer handoff — snippets, Figma and dashboard links | §11 | 7 |
| [REQ-API](REQ-API.md) | API and MCP | §12 | 10 |
| [REQ-MIG](REQ-MIG.md) | Import — ingesting content from other systems | §13 | 9 |
| [REQ-NFR](REQ-NFR.md) | Non-functional — performance, availability, i18n, observability | §15 | 14 |
| [REQ-DQ](REQ-DQ.md) | Data quality and deferred modules | §14 | 8 |

**159 requirements total.**

> Three prefixes were added beyond the original list: **REQ-DOM** (§6 has ~28 requirements of its own and does not belong inside Foundations), **REQ-NFR** (§15 was previously unrepresented), and **REQ-DQ** (§14's deferred modules need IDs so milestones can reference them). **REQ-AUTH** means *authoring*; authentication lives in **REQ-SEC**.

## Distribution by release

| Release | Requirements | Focus |
|---|---|---|
| R0 | 23 | Foundations, auth and account lifecycle, API, public repository, data-flow statement |
| R1 | 65 | Full data model, editor, versioning, migration API + MCP, SSO |
| R2 | 36 | Flows, bulk operations, distribution channels, MariaDB/Postgres adapters, instance portal |
| R3 | 16 | Snippets, Confluence, interactive agent access, hosted search adapter |
| R4 | 6 | Data quality, Figma import, webhooks |
| R5 | 3 | Semantic layer — blocked on O1/O2 |
| R6 | 2 | Lifecycle status, insights |
| — | 8 | Explicitly rejected (recorded, not gaps) |

R1 carries 65 requirements in six weeks. That concentration is risk R1 in the register, and it is why the [milestones](../milestones.md) name demotion candidates in advance rather than improvising under pressure.

> **Two decisions moved requirements after the first draft.** [ADR-0020](../../adr/0020-database-portability.md) replaced the MariaDB-only stance with repository ports and a SQLite default, adding three REQ-FDN entries and moving two database adapters into R2. [ADR-0021](../../adr/0021-agent-driven-migration.md) replaced the bespoke Notion importer with an agent driving a complete API, which rewrote REQ-MIG and pulled the documented public API, MCP read tools, MCP write tools and MCP resources from R3 into R1. Net effect on R1: six requirements out, ten in.

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

Everything not marked **Rejected** is currently **Not Started** — the repository is pre-R0.

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
| **O14 — draft-index rebuild trigger and acceptable lag under Pagefind** | REQ-AUTH-007 | Start of R1 |
| O13 — bulk-operation list completeness | REQ-AUTH-010, REQ-API-008 | End of R1 |
| O8 — developer-handoff reference patterns | REQ-DEV-002 | End of R1 |
| O3 — structured analytics-reading guidance | REQ-DOM-014, REQ-VIEW-002 | Start of R2 |
| O1 — semantic layer ontology and IRIs | REQ-DQ-004, REQ-DQ-005 | End of R2 |
| O2 — business glossary | REQ-DQ-006 | End of R2 |
| O9 — container entity attributes | REQ-DOM-025 | Start of R3 |
| O4 — conformance vs unstructured placeholders | REQ-DQ-003 | Start of R4 |
| O5 — verification module scope | REQ-DQ-001 | Start of R4 |

Full text of each in [functional specification §21](../functional-specification.md#open-decisions). Two are marked *immediately* and gate the first milestone.

**O12 is closed** — see [ADR-0009](../../adr/0009-search-abstraction.md). It asked whether a self-hostable search adapter was needed before the public release, a release R0 had already performed. Making the default self-contained ([REQ-FDN-007](REQ-FDN.md)) removed the question and retired [REQ-FDN-016](REQ-FDN.md), at the cost of opening O14.

## Known inconsistencies

Carried forward from the requirements review of 2026-08-12, which found seventeen issues; fifteen were resolved and applied into the requirement files, and these are the two that were consciously left. They are defects in the record rather than open product questions — none blocks a milestone. Fix one by editing the requirement in place and deleting its line here.

### Blocking relationships recorded only in this file

The table above asserts blocks that the requirement entries themselves do not record, so none of these three is marked `Blocked`:

| This table claims | The requirement says |
|---|---|
| O13 blocks [REQ-API-008](REQ-API.md) | No `**Blocked by:**` line |
| O8 blocks [REQ-DEV-002](REQ-DEV.md) | No `**Blocked by:**` line |
| O3 blocks [REQ-DOM-014](REQ-DOM.md) and [REQ-VIEW-002](REQ-VIEW.md) | No `**Blocked by:**` line on either |

This file states that the requirement files are the live status record, so a block recorded only here is a block nobody will act on.

The O3 case is also release-inconsistent: [REQ-VIEW-002](REQ-VIEW.md) is `Must` · R1 · [M1.9](../milestones.md), but O3's last responsible moment is *start of R2* and it gates only M2.1. The likely answer — that O3 shapes the R2 structured field while the R1 view selector ships without it — is worth writing down rather than leaving inferable.

### Minor

1. **[REQ-FDN-017](REQ-FDN.md) uses release `R3+`**, the only non-canonical value in the set; the distribution table counts it under R3. Normalise it, or introduce an explicit `Backlog` release.
2. **Status vocabulary for undefined scope is inconsistent.** [REQ-DQ-004](REQ-DQ.md)–[REQ-DQ-006](REQ-DQ.md) are `Blocked` while [REQ-DQ-007](REQ-DQ.md)–[REQ-DQ-008](REQ-DQ.md) are `Not Started`, despite being equally undefined.
3. **[REQ-SEC-005](REQ-SEC.md)** says *"no per-reader audit is required for this mode"* while [REQ-SEC-006](REQ-SEC.md) records *"guest access"*. Reconcilable — the access event is recorded, the reader is not identifiable — but it reads as a contradiction until said.
4. **`external_ref` behaviour under duplication is unspecified.** [REQ-AUTH-006](REQ-AUTH.md), [REQ-AUTH-008](REQ-AUTH.md), [REQ-AUTH-009](REQ-AUTH.md) and [REQ-AUTH-015](REQ-AUTH.md) all copy entities; [REQ-MIG-003](REQ-MIG.md) makes `external_ref` unique per project and the key for idempotent re-runs. A duplicated project carrying its `external_ref` values makes a later script re-run ambiguous. State that duplication clears it.
5. **[REQ-VER-004](REQ-VER.md)** makes the version number *"editable"* without stating whether uniqueness or monotonicity is enforced, though [REQ-VER-007](REQ-VER.md) and the changelog both assume an ordering.
6. **Asset retention is implied, not required.** [REQ-VER-007](REQ-VER.md)'s acceptance — assets *"are never deleted while a version references them"* — is the only statement of asset lifecycle anywhere, and no requirement owns it. [REQ-SEC-009](REQ-SEC.md) archive/restore touches it.
7. **[vision.md](../vision.md)'s persona table has five rows; [personas.md](../personas.md) has nine.** Align them, or have the vision defer to the persona document rather than restating it.
8. **R5 and R6 milestones list no deliverables** while [REQ-DQ-004](REQ-DQ.md)–[REQ-DQ-008](REQ-DQ.md) name M5.1, M6.1 and M6.2 as their milestones. Deliberate — those milestones are unscopeable until O1 and O2 close — but it is the one place the requirement↔milestone mapping does not resolve in both directions.

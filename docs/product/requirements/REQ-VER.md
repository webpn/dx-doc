# REQ-VER — Versioning and Publication

Draft model, selective publication, diff, changelog, history and rollback. Source: [functional specification](../functional-specification.md) §9, §19.6.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-VER-001 | Single draft → published model | Must | R1 | M1.6 | Not Started |
| REQ-VER-002 | Unpublished-changes indicator | Must | R1 | M1.6 | Not Started |
| REQ-VER-003 | Selective publication of trackings and pages/flows | Must | R1 | M1.6 | Not Started |
| REQ-VER-004 | Version metadata | Must | R1 | M1.6 | Not Started |
| REQ-VER-005 | Diff by entity, property and specific value | Must | R1 | M1.6 | Not Started |
| REQ-VER-006 | Automatically generated changelog | Must | R1 | M1.6 | Not Started |
| REQ-VER-007 | Full historical version consultation | Must | R1 | M1.6 | Not Started |
| REQ-VER-008 | Full rollback | Should | R2 | M2.7 | Not Started |
| REQ-VER-009 | Publication email notifications | Should | R2 | M2.7 | Not Started |
| REQ-VER-010 | Agent-vs-human attribution in the diff | Should | R3 | M3.4 | Not Started |
| REQ-VER-011 | Selective rollback | Could | R3 | M3.5 | Not Started |
| REQ-VER-012 | Branches, merges, approval, scheduled deprecation | Won't | — | — | Rejected |

---

### REQ-VER-001 — Single draft → published model

**Must** · R1 · [M1.6](../milestones.md) · spec §9.1 · [ADR-0005](../../adr/0005-draft-to-published-versioning.md) · **Not Started** · Issue: — · PR: —

One draft stream per project. All edits accumulate in the draft. Publishing creates a Version. No parallel branches, no merges, no approval workflow — editors publish autonomously.

**Acceptance**
- Every write path, including API, MCP and bulk operations, writes to the draft. There is no path that writes directly to a published version.
- A reader without editing access sees the published version; an editor can see both.
- Publishing is atomic: a failure part-way leaves the previous version intact.

### REQ-VER-002 — Unpublished-changes indicator

**Must** · R1 · [M1.6](../milestones.md) · spec §9.1 · **Not Started** · Issue: — · PR: —

Editors see clearly which changes are not yet published.

**Acceptance**
- The indicator is reachable from the project level, not only per entity — the question is "what would I publish?", asked before publishing.
- It reflects changes made by any actor, including agents.

### REQ-VER-003 — Selective publication of trackings and pages/flows

**Must** · R1 · [M1.6](../milestones.md) · spec §9.2 · **Not Started** · Issue: — · PR: —

At publication the editor may exclude individual Trackings and individual Pages/Flows. Properties and Modules cannot be selectively excluded — their changes always publish.

**Acceptance**
- A published tracking can never reference an unpublished property. This is why properties are not selectively excludable, and it is enforced, not merely documented.
- An exclusion applies to that publication only; excluded items are not remembered as excluded next time.
- Excluded items remain in the draft, unchanged.

> The property exclusion carve-out is a deliberate simplification to avoid dependency resolution. Reopening it means building a dependency resolver, so it should be reopened only with that cost accepted.

### REQ-VER-004 — Version metadata

**Must** · R1 · [M1.6](../milestones.md) · spec §9.3 · **Not Started** · Issue: — · PR: —

Auto-proposed progressive number, publication date, optional title, optional free-text release notes.

**Acceptance**
- The proposed number is editable but defaults to the next progressive value.
- Product releases are referenced in prose within the notes; there is no product-release entity.

### REQ-VER-005 — Diff by entity, property and specific value

**Must** · R1 · [M1.6](../milestones.md) · spec §9.4 · **Not Started** · Issue: — · PR: —

Granularity: per entity (tracking, page, flow, property, module, destination, audience, survey — added, modified, removed); per property within a tracking; per specific value; textual diff on rich-text descriptions. **No image diff.**

**Acceptance**
- Diff generation for a large project completes within the target in REQ-NFR-003 (< 6 s).
- A bulk operation's effects appear as ordinary per-entity changes, not as an opaque single entry.
- Image changes are reported as "image changed" without attempting a visual diff.

### REQ-VER-006 — Automatically generated changelog

**Must** · R1 · [M1.6](../milestones.md) · spec §9.4 · **Not Started** · Issue: — · PR: —

The changelog is generated from the diff. The changelog view lists all versions with name, date, description and the set of changed elements.

**Acceptance**
- Publishing produces a changelog nobody wrote by hand.
- The changelog is filterable to development-relevant changes (REQ-VIEW-008 in R2; the underlying data must support it from R1).

> This is the single capability whose absence defined pain point 5, and it is part of the R1 exit criterion. It is explicitly not a demotion candidate.

### REQ-VER-007 — Full historical version consultation

**Must** · R1 · [M1.6](../milestones.md) · spec §9.5 · **Not Started** · Issue: — · PR: —

Any historical version can be consulted in full, not only as a list of changes.

**Acceptance**
- A version's content renders as it was at publication, including assets, which are therefore never deleted while a version references them.
- Migrated projects start at version 1 with no prior history (REQ-MIG-008).

### REQ-VER-008 — Full rollback

**Should** · R2 · [M2.7](../milestones.md) · spec §9.5 · **Not Started** · Issue: — · PR: —

Restoring the draft to the state of a previous version, in full. Recorded in the audit log (REQ-SEC-006).

### REQ-VER-009 — Publication email notifications

**Should** · R2 · [M2.7](../milestones.md) · spec §9.6 · **Not Started** · Issue: — · PR: —

On publication, email to users subscribed to that project. Subscription is per project; publication is the only notification event. SMTP is configured per company (REQ-FDN-013). Unsubscribe from the web interface.

### REQ-VER-010 — Agent-vs-human attribution in the diff

**Should** · R3 · [M3.4](../milestones.md) · spec §9.4, §12.2 · [ADR-0019](../../adr/0019-ai-coding-agent-model.md) · **Not Started** · Issue: — · PR: —

Changes made through MCP agents are visually distinguished from human edits in the diff.

> This is the whole agent-review mechanism. There is deliberately no separate agent-review queue: human review happens at publication, where the diff is inspected and items can be excluded. That only works if agent changes are visible as such.

### REQ-VER-011 — Selective rollback

**Could** · R3 · [M3.5](../milestones.md) · spec §9.5 · **Not Started** · Issue: — · PR: —

Rolling back individual elements rather than the whole project state.

### REQ-VER-012 — Branches, merges, approval workflow, scheduled deprecation

**Won't** · spec §9.1, §19.6 · **Rejected**

Explicitly rejected, not deferred:

- **Parallel branches and merge workflows** — a single draft stream only.
- **Approval workflow** — editors publish autonomously. Review happens at the diff.
- **Scheduled deprecation** — properties are deprecated manually.

Recorded so that each is a decision with a reason rather than a gap.

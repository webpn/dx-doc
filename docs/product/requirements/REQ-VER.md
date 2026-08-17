# REQ-VER — Versioning and Publication

Draft model, selective publication, diff, changelog, history and rollback. Source: [functional specification](../functional-specification.md) §9, §19.6.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID          | Requirement                                        | MoSCoW | Rel. | Milestone | Status      |
| ----------- | -------------------------------------------------- | ------ | ---- | --------- | ----------- |
| REQ-VER-001 | Single draft → published model                     | Must   | R1   | M1.8      | Not Started |
| REQ-VER-002 | Unpublished-changes indicator                      | Must   | R1   | M1.8      | Not Started |
| REQ-VER-003 | Selective publication of trackings and pages/flows | Must   | R1   | M1.8      | Not Started |
| REQ-VER-004 | Version metadata                                   | Must   | R1   | M1.8      | Not Started |
| REQ-VER-005 | Diff by entity, property and specific value        | Must   | R1   | M1.8      | Not Started |
| REQ-VER-006 | Automatically generated changelog                  | Must   | R1   | M1.8      | Not Started |
| REQ-VER-007 | Full historical version consultation               | Must   | R1   | M1.8      | Not Started |
| REQ-VER-008 | Full rollback                                      | Should | R2   | M2.7      | Not Started |
| REQ-VER-009 | Publication email notifications                    | Should | R2   | M2.7      | Not Started |
| REQ-VER-010 | Agent-vs-human attribution in the diff             | Should | R2   | M2.7      | Not Started |
| REQ-VER-011 | Selective rollback                                 | Could  | R3   | M3.5      | Not Started |
| REQ-VER-012 | Branches, merges, approval, scheduled deprecation  | Won't  | —    | —         | Rejected    |

---

### REQ-VER-001 — Single draft → published model

**Must** · R1 · [M1.8](../milestones.md) · spec §9.1 · [ADR-0005](../../adr/0005-draft-to-published-versioning.md) · **Not Started** · Issue: — · PR: —

One draft stream per project. All edits accumulate in the draft. Publishing creates a Version. No parallel branches, no merges, no approval workflow — editors publish autonomously.

> **Storage representation, decided 2026-08-17 (D36): event-sourced append log.** The draft is an append-only log of edits; a Version is a pointer to a point in that log (gaining its sequential number at publication, REQ-VER-004). Any historical version is reconstructed by replaying edits up to that point — which is exactly the "full historical consultation" REQ-VER-007 requires, and the raw material the diff/changelog (REQ-VER-005/006) are computed from. Selective publication (REQ-VER-003) is expressed as which recorded edits the published point includes. Asset retention (REQ-VER-007) is unaffected: a referenced asset is never pruned while any reachable version references it.

**Acceptance**

- Every write path, including API, MCP and bulk operations, writes to the draft. There is no path that writes directly to a published version.
- A reader without editing access sees the published version; an editor can see both.
- Publishing is atomic: a failure part-way leaves the previous version intact.

### REQ-VER-002 — Unpublished-changes indicator

**Must** · R1 · [M1.8](../milestones.md) · spec §9.1 · **Not Started** · Issue: — · PR: —

Editors see clearly which changes are not yet published.

**Acceptance**

- The indicator is reachable from the project level, not only per entity — the question is "what would I publish?", asked before publishing.
- It reflects changes made by any actor, including agents.

### REQ-VER-003 — Selective publication of trackings and pages/flows

**Must** · R1 · [M1.8](../milestones.md) · spec §9.2 · **Not Started** · Issue: — · PR: —

At publication the editor may exclude individual Trackings and individual Pages/Flows. Properties and Modules cannot be selectively excluded — their changes always publish.

**Acceptance**

- **No published entity may reference an excluded entity.** This is the general rule; the cases below are its consequences, and it is enforced rather than merely documented.
- A published tracking can never reference an unpublished property. This is why properties are not selectively excludable.
- Excluding a Page **proposes excluding the Trackings attached to it**, selected by default. If the editor overrides the proposal and publishes a tracking whose page is excluded, the publication is **refused** with the conflicting pair named — it does not proceed and leave a tracking attached to nothing.
- The same rule covers Flows from R1 (they moved into R1/M1.6 on 2026-08-17): publishing a Flow whose Trigger references an excluded Tracking or Page is refused, so a generated diagram (REQ-NAV-006) can never contain a node that does not exist in the version.
- Destinations, audiences and surveys are not excludable, so they cannot produce this conflict.
- An exclusion applies to that publication only; excluded items are not remembered as excluded next time.
- Excluded items remain in the draft, unchanged.

> The property exclusion carve-out is a deliberate simplification to avoid dependency resolution. Reopening it means building a dependency resolver, so it should be reopened only with that cost accepted.
>
> The page-and-tracking case is not that: it is one reference, checked in one direction, and excluding a page is the natural way to hold back an unfinished feature — which makes its trackings exactly what an editor would forget to exclude alongside it. Proposing the exclusion is the convenience; refusing the conflict is the guarantee.

### REQ-VER-004 — Version metadata

**Must** · R1 · [M1.8](../milestones.md) · spec §9.3 · **Not Started** · Issue: — · PR: —

A system-granted progressive number, the publication date, an optional free-form title, and optional free-text release notes.

**Acceptance**

- The sequential number is granted at publication as the next progressive value and cannot be edited — uniqueness and ordering are guaranteed by assignment, not by the editor.
- The title is free-form and fully customisable.
- The publication date is saved with the version.
- Product releases are referenced in prose within the notes; there is no product-release entity.

### REQ-VER-005 — Diff by entity, property and specific value

**Must** · R1 · [M1.8](../milestones.md) · spec §9.4 · **Not Started** · Issue: — · PR: —

Granularity: per entity (tracking, page, flow, property, module, destination, audience, survey — added, modified, removed); per property within a tracking; per specific value; textual diff on rich-text descriptions. **No image diff.**

**Acceptance**

- Diff generation for a large project completes within the target in REQ-NFR-003 (< 6 s).
- A bulk operation's effects appear as ordinary per-entity changes, not as an opaque single entry.
- Image changes are reported as "image changed" without attempting a visual diff.

### REQ-VER-006 — Automatically generated changelog

**Must** · R1 · [M1.8](../milestones.md) · spec §9.4 · **Not Started** · Issue: — · PR: —

The changelog is generated from the diff. The changelog view lists all versions with name, date, description and the set of changed elements.

**Acceptance**

- Publishing produces a changelog nobody wrote by hand.
- The changelog is filterable to development-relevant changes (REQ-VIEW-008 in R2; the underlying data must support it from R1).

> This is the single capability whose absence defined pain point 5, and it is part of the R1 exit criterion. It is explicitly not a demotion candidate.

### REQ-VER-007 — Full historical version consultation

**Must** · R1 · [M1.8](../milestones.md) · spec §9.5 · **Not Started** · Issue: — · PR: —

Any historical version can be consulted in full, not only as a list of changes.

**Owns the asset-retention rule:** a version renders as it was at publication, including its assets, so an asset referenced by any published version is never deleted. This requirement is the single owner of that statement; [REQ-SEC-009](REQ-SEC.md) (archive/restore) builds on it and must not contradict it.

**Acceptance**

- A version's content renders as it was at publication, including assets, which are therefore never deleted while a version references them.
- Imported projects start at version 1 with no prior history (REQ-IMP-009).

### REQ-VER-008 — Full rollback

**Should** · R2 · [M2.7](../milestones.md) · spec §9.5 · **Not Started** · Issue: — · PR: —

Restoring the draft to the state of a previous version, in full. Recorded in the audit log (REQ-SEC-006).

### REQ-VER-009 — Publication email notifications

**Should** · R2 · [M2.7](../milestones.md) · spec §9.6 · **Not Started** · Issue: — · PR: —

On publication, email to users subscribed to that project. Subscription is per project; publication is the only notification event. SMTP is configured per company (REQ-FDN-013). Unsubscribe from the web interface.

### REQ-VER-010 — Agent-vs-human attribution in the diff

**Should** · R2 · [M2.7](../milestones.md) · spec §9.4, §12.2 · [ADR-0019](../../adr/0019-ai-coding-agent-model.md) · **Not Started** · Issue: — · PR: —

Changes made through MCP agents and service-account tokens are visually distinguished from human edits in the diff.

> This is the whole agent-review mechanism. There is deliberately no separate agent-review queue: human review happens at publication, where the diff is inspected and items can be excluded. That only works if agent changes are visible as such.
>
> **Moved R3 → R2.** MCP write tools land in R1 (REQ-API-004, per [ADR-0021](../../adr/0021-agent-driven-migration.md)), so agents and humans start sharing a draft from R1 rather than R3. Attribution is not needed for the import itself — version 1 has nothing to diff against — but it is needed as soon as agents edit alongside editors, which is the release immediately after.

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

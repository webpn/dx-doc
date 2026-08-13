# ADR-0005: Draft-to-Published Versioning Model

## Status

Accepted

## Date

2026-08-11

## Context

The Platform must support versioning of project documentation: editors work on a draft, then publish a snapshot that becomes the authoritative version for consumers. The legacy wiki has no such model — the Platform's versioning is its primary differentiator.

## Decision

**Single draft stream per project.** No branches, no merges, no approval workflow.

**How it works:**

1. Every project has exactly one **draft**. All edits — human or agent — write into the draft.
2. At publication, the editor may **selectively exclude** individual Trackings and individual Pages/Flows from the version.
3. Publishing creates an immutable **Version** snapshot. The snapshot stores the full state of included entities at that moment.
4. A **diff** is computed by comparing the new version against the previous one. The diff is at entity level (added/modified/removed tracking, page, property, etc.) with per-property and per-specific-value granularity.
5. A **changelog** is generated automatically from the diff.
6. Excluded items are **not** remembered as excluded for the next publication. The decision is made afresh each time.

## Alternatives Considered

### Git-like branching and merging

Rejected: the user population (analysts and business users, not developers) would find branching confusing. The single-draft model matches their mental model: work in progress → publish. Branching adds complexity (conflict resolution, merge UI) with no demonstrated need.

### Approval workflow (draft → review → approved → published)

Rejected: editorial ownership sits with the analytics function. Editors publish autonomously. There is no organisational requirement for approval gates, and adding them would slow down the primary workflow.

### Automatic publication of all changes

Rejected: editors need selective control. Not everything in the draft is ready for publication at the same time. Selective exclusion supports this without requiring branches.

### Storing only deltas between versions

Rejected: makes historical version consultation expensive (must replay all deltas). Full snapshots are slightly larger in storage but make reading any historical version O(1). Storage is cheap; complexity is not.

## Consequences

- The draft is the single mutable state. Concurrency conflicts are handled by optimistic locking (ADR-0018).
- Version snapshots duplicate data. This is accepted; the alternative (computing historical states from deltas) is more complex and error-prone.
- Selective exclusion means a published version may not contain every entity in the draft. Properties and Modules cannot be selectively excluded — this simplifies dependency resolution (a published tracking never references an unpublished property).
- No merge conflicts. No conflict resolution UI. Simpler mental model.
- The model cannot support parallel workstreams on the same project (e.g., two editors working on different releases simultaneously). The spec accepts this limitation.

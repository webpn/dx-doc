# REQ-MIG — Migration

Import from the legacy wiki and the transition off it. Source: [functional specification](../functional-specification.md) §13, §19.9.

Entry format and status legend: [requirements index](README.md).

> All of these land in [M1.2](../milestones.md), scheduled at **week 5 of R1, deliberately ahead of a complete UI**. Running the importer against real pilot data is the only test that measures the data model against years of accumulated real usage, and its diagnostic value decays: an import that runs in week 5 can still change the model, one that runs in week 8 cannot. This is the mitigation for risks R1 and R2 in the register.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-MIG-001 | Importer from the "Markdown & CSV" export | Must | R1 | M1.2 | Not Started |
| REQ-MIG-002 | Idempotent, re-runnable import | Must | R1 | M1.2 | Not Started |
| REQ-MIG-003 | 1:1 mapping of all structured tables | Must | R1 | M1.2 | Not Started |
| REQ-MIG-004 | Asset migration into object storage | Must | R1 | M1.2 | Not Started |
| REQ-MIG-005 | Legacy block conversion into supported Markdown | Must | R1 | M1.2 | Not Started |
| REQ-MIG-006 | Import report | Should | R1 | M1.2 | Not Started |
| REQ-MIG-007 | Legacy wiki frozen, then read-only archive | Must | R1 | M1.8 | Not Started |
| REQ-MIG-008 | Flow reconstruction; history migration; internal links | Won't | — | — | Rejected |

---

### REQ-MIG-001 — Importer from the "Markdown & CSV" export

**Must** · R1 · [M1.2](../milestones.md) · spec §13.1 · **Not Started** · Issue: — · PR: —

Migration reads the legacy wiki's Markdown & CSV export — a ZIP archive of Markdown page bodies plus asset folders.

**Acceptance**
- A CSV-only export is explicitly insufficient and is rejected with a clear message: it carries database properties but not page bodies, where descriptions, images and diagrams live.
- The importer runs per project.

### REQ-MIG-002 — Idempotent, re-runnable import

**Must** · R1 · [M1.2](../milestones.md) · spec §13.3 · **Not Started** · Issue: — · PR: —

The importer can be re-run per project so a first pass can be corrected and repeated.

**Acceptance**
- Running the same export twice produces no duplicates and no orphans.
- Re-import matches existing entities by a stable key derived from the source, not by name — this is what immutable identifiers (REQ-FDN-004) are for.
- A partial failure leaves the project in a re-runnable state, not a half-imported one.

### REQ-MIG-003 — 1:1 mapping of all structured tables

**Must** · R1 · [M1.2](../milestones.md) · spec §13.2 · **Not Started** · Issue: — · PR: —

Pages, Trackings, Modules, Data Layer Properties, Specific Values, analytics variables and events (both mapped into the unified Destination entity, REQ-DOM-015), Audiences, Surveys.

**Acceptance**
- Every row of every source table is either imported or reported as skipped with a reason. Silent loss is a defect.
- Counts per entity type are reconciled against the source before the pilot is accepted.
- Placeholders inside specific values survive verbatim (REQ-DOM-010).

> The migration perimeter defines the data-model perimeter. Audiences and surveys look secondary, but a 1:1 migration that loses them fails the pilot — which is why they are Must in R1.

### REQ-MIG-004 — Asset migration into object storage

**Must** · R1 · [M1.2](../milestones.md) · spec §13.2 · **Not Started** · Issue: — · PR: —

Assets from the export's folders are migrated into the Platform's object storage (REQ-FDN-006).

**Acceptance**
- Every image referenced by imported content resolves after import; a dangling reference is reported, not silently rendered broken.
- Re-running the import does not duplicate assets.

### REQ-MIG-005 — Legacy block conversion into supported Markdown

**Must** · R1 · [M1.2](../milestones.md) · spec §13.2 · **Not Started** · Issue: — · PR: —

Legacy-wiki-specific blocks — callouts, toggles, Mermaid — are converted into the supported Markdown block set (REQ-AUTH-001).

**Acceptance**
- Each unsupported block type is either converted or reported; none is dropped silently.
- Mermaid blocks survive as Mermaid, renderable by REQ-AUTH-004.

> This is the main source of fidelity loss in the migration and deserves proportionate attention during M1.2 review.

### REQ-MIG-006 — Import report

**Should** · R1 · [M1.2](../milestones.md) · spec §13.3 · **Not Started** · Issue: — · PR: —

A report listing imported items, skipped items and warnings, supporting the manual verification step.

**Acceptance**
- The report is the artefact reviewed at the M1.2 exit; it is legible to an editor, not only to a developer.
- Warnings distinguish "converted with possible fidelity loss" from "not imported".

### REQ-MIG-007 — Legacy wiki frozen, then read-only archive

**Must** · R1 · [M1.8](../milestones.md) · spec §13.4 · **Not Started** · Issue: — · PR: —

Editing on the legacy wiki is frozen during migration. Afterwards it remains accessible read-only as an archive.

**Acceptance**
- The freeze is announced and effective before the final import, so no edit is stranded.
- The archive stays reachable — nothing in this plan deletes it.

### REQ-MIG-008 — Flow reconstruction; history migration; internal links

**Won't** · spec §13.2 · **Rejected**

- **Flows and graphs are out of scope for the importer** — they do not exist in the source and are catalogued manually after migration (REQ-NAV-003).
- **History is not migrated.** Each migrated project starts at version 1 (REQ-VER-007).
- **Internal links are not migrated** — no internal cross-links are expected in the source material.

# REQ-IMP — Import

Importing content into the Platform from other systems. Source: [functional specification](../functional-specification.md) §13, as revised by [ADR-0021](../../adr/0021-agent-driven-migration.md).

Entry format and status legend: [requirements index](README.md).

> **This area was re-specified.** Specification §13 called for a bespoke importer inside the Platform. [ADR-0021](../../adr/0021-agent-driven-migration.md) replaces it: the Platform ships **no source-format-specific code**, and import is performed by an AI agent driving the public API, producing a committed re-runnable script. The requirements below were renumbered rather than contorted to fit the old IDs — nothing here had an Issue open or a line of code written, so renumbering costs nothing and preserving misleading IDs would have cost clarity. §13's _scope_ decisions are unchanged and survive as REQ-IMP-009.
>
> The capability is **general-purpose, not tied to any one source system.** The same API surface that lets an agent import content from an existing platform is what makes any future bulk ingestion — from any other system — idempotent and scriptable. Everything here lands in **[M1.2](../milestones.md#m12--import-grade-api), [M1.3](../milestones.md#m13--mcp-server) and [M1.4](../milestones.md#m14--agent-driven-pilot-import)** — weeks 4–6 of R1, deliberately ahead of a complete UI. The week-5 real-data checkpoint is unchanged in logic and now does double duty: it validates the data model against years of accumulated real usage _and_ proves the API is genuinely complete, because a gap in the API surface shows up as something the agent cannot create.

| ID          | Requirement                                    | MoSCoW | Rel. | Milestone | Status      |
| ----------- | ---------------------------------------------- | ------ | ---- | --------- | ----------- |
| REQ-IMP-001 | No source-format-specific code in the Platform | Must   | R1   | M1.2      | Implemented |
| REQ-IMP-002 | API surface complete for every R1 entity       | Must   | R1   | M1.2      | Implemented |
| REQ-IMP-003 | Idempotent upsert keyed on `custom_id`         | Must   | R1   | M1.2      | Implemented |
| REQ-IMP-004 | Asset upload through the API                   | Must   | R1   | M1.2      | Implemented |
| REQ-IMP-005 | Batch write endpoints                          | Should | R1   | M1.2      | Implemented |
| REQ-IMP-006 | Reconciliation report                          | Should | R1   | M1.2      | Implemented |
| REQ-IMP-007 | Import scripts committed and re-runnable       | Must   | R1   | M1.4      | Not Started |
| REQ-IMP-008 | Source system frozen, then read-only archive   | Must   | R1   | M1.10     | Not Started |
| REQ-IMP-009 | Flows, history, internal links, importer UI    | Won't  | —    | —         | Rejected    |

---

### REQ-IMP-001 — No source-format-specific code in the Platform

**Must** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Not Started** · Issue: — · PR: —

The Platform contains no parser, block converter, import endpoint or importer UI for any source system. Zero lines of the codebase reference any external platform's format.

**Acceptance**

- A search of the codebase for any source system's name returns nothing outside documentation.
- No API endpoint accepts an export archive.
- Import capability is expressed entirely as general-purpose API and MCP surface (REQ-IMP-002 … REQ-IMP-006), all of which has value beyond any single import.

> This is the requirement that keeps throwaway, source-specific code out of a product that ships to every open-source deployer. If it is ever weakened, the reason to prefer this approach over a bespoke importer disappears with it.

### REQ-IMP-002 — API surface complete for every R1 entity

**Must** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · spec §12.1 · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

Every entity in the R1 data model is creatable, readable and updatable through the API: Page, Tracking, DataLayerProperty (including `object` children and `parent_property`), Module, TrackingTemplate, SpecificValue, Destination and its N:N mapping with `destination_name_override`, FreePage, and the company catalogue. CDP Audience and Survey were moved to R2 (M2.7) on 2026-08-17, so they are not part of the R1 surface.

**Acceptance**

- Every attribute writable in the UI is writable through the API. A UI-only field is a defect (this follows from ADR-0007, and import is what proves it).
- The full first imported product can be constructed through the API alone, with the UI never opened. This is the acceptance test for the whole requirement.
- Relationships are settable in either order, or the API documents its required ordering — an agent should not have to infer a creation sequence by trial and error.
- Validation errors identify the offending field and rule in a form a script can branch on, not only prose for a human.

### REQ-IMP-003 — Idempotent upsert keyed on `custom_id`

**Must** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · spec §13.3 · [ADR-0004](../../adr/0004-immutable-internal-identifiers.md) · **Not Started** · Issue: — · PR: —

Every entity accepts an optional `custom_id` — source system plus source identifier — unique within its project. A write carrying a `custom_id` that already exists updates that entity rather than creating a second one.

**Duplication does not inherit `custom_id`:** any operation that copies an entity (duplicate tracking, cross-project copy, whole-project duplication) starts with a blank `custom_id`. Otherwise a re-run of the original import could match the copy instead of the source entity.

**Acceptance**

- Running the same import script twice produces no duplicates and no orphans.
- A corrected script re-run over a partial import converges to the correct state without a manual cleanup.
- `custom_id` is orthogonal to the immutable `id`: it never becomes a foreign key, and dx-doc's own references always use `id`.
- The field is nullable and unused by entities created through the UI — it carries no meaning for them.

> This lands in R1 rather than when first needed because retrofitting it means reworking every write endpoint. It is also not import scaffolding: it is what makes any future bulk ingestion idempotent.

### REQ-IMP-004 — Asset upload through the API

**Must** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · spec §13.2 · **Not Started** · Issue: — · PR: —

Images are uploadable through the API with the same limits and processing as the UI path (REQ-AUTH-002): size cap, resize, object storage.

**Acceptance**

- A script can upload an image from a local export folder and reference it from Markdown content in the same run.
- Asset upload is idempotent by `custom_id` (REQ-IMP-003) — a re-run does not duplicate assets.
- Every image referenced by imported content resolves after import; the reconciliation report (REQ-IMP-006) lists any that do not.

### REQ-IMP-005 — Batch write endpoints

**Should** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · **Not Started** · Issue: — · PR: —

Endpoints accepting an array of entities in one call, so that thousands of trackings across the products being imported do not require one round trip each.

**Acceptance**

- A batch reports per-item outcomes; one invalid item does not silently discard the rest, and the response says exactly which items failed and why.
- Batch semantics are **per-item, decided 2026-08-17** (D35): valid items in a batch succeed, and the response lists exactly which items failed and why. This is the consistent behaviour across every batch endpoint — an import with one bad row must not fail the other ~thousands.
- Batches accept an explicit list of entities only — never a filter expression (REQ-API-008).
- Batch writes produce proportionate audit entries, not one per item (REQ-SEC-006).

### REQ-IMP-006 — Reconciliation report

**Should** · R1 · [M1.2](../milestones.md#m12--import-grade-api) · spec §13.3 · **Not Started** · Issue: — · PR: —

A per-project report of what exists in dx-doc: counts per entity type, entities carrying a `custom_id`, unresolved asset references, and properties not referenced by any tracking. Comparable by a human against the source.

**Acceptance**

- The report is generated by the Platform from its own state, not by the import script. A process that reports on itself is not verification.
- It is legible to an editor, not only to a developer — it is the artefact reviewed at the [M1.4](../milestones.md#m14--agent-driven-pilot-import) exit.
- It is available through API and MCP, so the agent can check its own work mid-run.

### REQ-IMP-007 — Import scripts committed and re-runnable

**Must** · R1 · [M1.4](../milestones.md#m14--agent-driven-pilot-import) · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Not Started** · Issue: — · PR: —

An agent explores a source system's export interactively and then **writes a script**. The script is committed to a repository, reviewed before it runs at scale, and re-run per project.

**Acceptance**

- The import deliverable is a reviewable script, not an agent transcript. This is what makes the approach reproducible, diffable and auditable rather than merely convenient.
- The script lives outside the Platform's own repository, so REQ-IMP-001 holds.
- Re-running it is safe by construction (REQ-IMP-003).
- The first project is verified item-by-item by an editor before the remaining projects follow.

> The agent's deliverable is the _authoring_ of the script; the script performs the import. An agent may quietly coerce unanticipated input into something that looks right — where a parser would fail loudly — so review of the script, the reconciliation counts, and the item-by-item check on the first project are the three mitigations, and none is optional.

### REQ-IMP-008 — Source system frozen, then read-only archive

**Must** · R1 · [M1.10](../milestones.md#m110--pilot-cutover) · spec §13.4 · **Not Started** · Issue: — · PR: —

Editing on the source system is frozen during import. Afterwards it remains accessible read-only as an archive.

**Acceptance**

- The freeze is announced and effective before the final import run, so no edit is stranded.
- The archive stays reachable — nothing in this plan deletes it.
- Freeze applies per project as each is imported, not to all projects at once.

### REQ-IMP-009 — Flows, history, internal links, importer UI

**Won't** · spec §13.2 · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Rejected**

- **Flows and graphs are not imported** — they are catalogued manually afterwards (REQ-NAV-003).
- **History is not imported.** Each imported project starts at version 1 (REQ-VER-007).
- **Internal links are not imported** — no internal cross-links are expected in the source material.
- **No importer UI, and no import endpoint accepting an export archive** — added by ADR-0021. Import is a scripted API client, not a Platform feature.
- **No round-trip.** Import is one-way; the source system never becomes a second source of truth.

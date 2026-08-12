# REQ-MIG — Migration

Migrating ~30 products off the legacy wiki. Source: [functional specification](../functional-specification.md) §13, as revised by [ADR-0021](../../adr/0021-agent-driven-migration.md).

Entry format and status legend: [requirements index](README.md).

> **This area was re-specified.** Specification §13 called for a bespoke importer inside the Platform. [ADR-0021](../../adr/0021-agent-driven-migration.md) replaces it: the Platform ships **no source-format-specific code**, and migration is performed by an AI agent driving the public API, producing a committed re-runnable script. The requirements below were renumbered rather than contorted to fit the old IDs — nothing here had an Issue open or a line of code written, so renumbering costs nothing and preserving misleading IDs would have cost clarity. §13's *scope* decisions are unchanged and survive as REQ-MIG-009.
>
> Everything here lands in **[M1.2](../milestones.md), [M1.3](../milestones.md) and [M1.4](../milestones.md)** — weeks 4–6 of R1, deliberately ahead of a complete UI. The week-5 real-data checkpoint is unchanged in logic and now does double duty: it validates the data model against years of accumulated real usage *and* proves the API is genuinely complete, because a gap in the API surface shows up as something the agent cannot create.

| ID | Requirement | MoSCoW | Rel. | Milestone | Status |
|---|---|---|---|---|---|
| REQ-MIG-001 | No source-format-specific code in the Platform | Must | R1 | M1.2 | Not Started |
| REQ-MIG-002 | API surface complete for every R1 entity | Must | R1 | M1.2 | Not Started |
| REQ-MIG-003 | Idempotent upsert keyed on `external_ref` | Must | R1 | M1.2 | Not Started |
| REQ-MIG-004 | Asset upload through the API | Must | R1 | M1.2 | Not Started |
| REQ-MIG-005 | Batch write endpoints | Should | R1 | M1.2 | Not Started |
| REQ-MIG-006 | Reconciliation report | Should | R1 | M1.2 | Not Started |
| REQ-MIG-007 | Migration scripts committed and re-runnable | Must | R1 | M1.4 | Not Started |
| REQ-MIG-008 | Legacy wiki frozen, then read-only archive | Must | R1 | M1.10 | Not Started |
| REQ-MIG-009 | Flows, history, internal links, importer UI | Won't | — | — | Rejected |

---

### REQ-MIG-001 — No source-format-specific code in the Platform

**Must** · R1 · [M1.2](../milestones.md) · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Not Started** · Issue: — · PR: —

The Platform contains no parser, block converter, import endpoint or importer UI for any source system. Zero lines of the codebase reference Notion or any other legacy format.

**Acceptance**
- A search of the codebase for the source system's name returns nothing outside documentation.
- No API endpoint accepts an export archive.
- Migration capability is expressed entirely as general-purpose API and MCP surface (REQ-MIG-002 … REQ-MIG-006), all of which has post-migration value.

> This is the requirement that keeps ~30 runs' worth of throwaway code out of a product that ships to every open-source deployer. If it is ever weakened, the reason to prefer this approach over a bespoke importer disappears with it.

### REQ-MIG-002 — API surface complete for every R1 entity

**Must** · R1 · [M1.2](../milestones.md) · spec §12.1 · [ADR-0007](../../adr/0007-api-as-single-entry-point.md) · **Not Started** · Issue: — · PR: —

Every entity in the R1 data model is creatable, readable and updatable through the API: Page, Tracking, DataLayerProperty (including `object` children and `parent_property`), Module, TrackingTemplate, SpecificValue, Destination and its N:N mapping with `destination_name_override`, CdpAudience, Survey, FreePage, and the company catalogue.

**Acceptance**
- Every attribute writable in the UI is writable through the API. A UI-only field is a defect (this follows from ADR-0007, and migration is what proves it).
- The full pilot product can be constructed through the API alone, with the UI never opened. This is the acceptance test for the whole requirement.
- Relationships are settable in either order, or the API documents its required ordering — an agent should not have to infer a creation sequence by trial and error.
- Validation errors identify the offending field and rule in a form a script can branch on, not only prose for a human.

### REQ-MIG-003 — Idempotent upsert keyed on `external_ref`

**Must** · R1 · [M1.2](../milestones.md) · spec §13.3 · [ADR-0004](../../adr/0004-immutable-internal-identifiers.md) · **Not Started** · Issue: — · PR: —

Every entity accepts an optional `external_ref` — source system plus source identifier — unique within its project. A write carrying an `external_ref` that already exists updates that entity rather than creating a second one.

**Acceptance**
- Running the same migration script twice produces no duplicates and no orphans.
- A corrected script re-run over a partial migration converges to the correct state without a manual cleanup.
- `external_ref` is orthogonal to the immutable `id`: it never becomes a foreign key, and dx-doc's own references always use `id`.
- The field is nullable and unused by entities created through the UI — it carries no meaning for them.

> This lands in R1 rather than when first needed because retrofitting it means reworking every write endpoint. It is also not migration scaffolding: it is what makes any future bulk ingestion idempotent.

### REQ-MIG-004 — Asset upload through the API

**Must** · R1 · [M1.2](../milestones.md) · spec §13.2 · **Not Started** · Issue: — · PR: —

Images are uploadable through the API with the same limits and processing as the UI path (REQ-AUTH-002): size cap, resize, object storage.

**Acceptance**
- A script can upload an image from a local export folder and reference it from Markdown content in the same run.
- Asset upload is idempotent by `external_ref` (REQ-MIG-003) — a re-run does not duplicate assets.
- Every image referenced by migrated content resolves after migration; the reconciliation report (REQ-MIG-006) lists any that do not.

### REQ-MIG-005 — Batch write endpoints

**Should** · R1 · [M1.2](../milestones.md) · **Not Started** · Issue: — · PR: —

Endpoints accepting an array of entities in one call, so that thousands of trackings across ~30 products do not require one round trip each.

**Acceptance**
- A batch reports per-item outcomes; one invalid item does not silently discard the rest, and the response says exactly which items failed and why.
- Batch semantics are documented as all-or-nothing or per-item, and the choice is consistent across endpoints.
- Batches accept an explicit list of entities only — never a filter expression (REQ-API-008).
- Batch writes produce proportionate audit entries, not one per item (REQ-SEC-006).

### REQ-MIG-006 — Reconciliation report

**Should** · R1 · [M1.2](../milestones.md) · spec §13.3 · **Not Started** · Issue: — · PR: —

A per-project report of what exists in dx-doc: counts per entity type, entities carrying an `external_ref`, unresolved asset references, and properties not referenced by any tracking. Comparable by a human against the source.

**Acceptance**
- The report is generated by the Platform from its own state, not by the migration script. A process that reports on itself is not verification.
- It is legible to an editor, not only to a developer — it is the artefact reviewed at the [M1.4](../milestones.md) exit.
- It is available through API and MCP, so the agent can check its own work mid-run.

### REQ-MIG-007 — Migration scripts committed and re-runnable

**Must** · R1 · [M1.4](../milestones.md) · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Not Started** · Issue: — · PR: —

Claude explores a product's export interactively and then **writes a script**. The script is committed to a repository, reviewed before it runs at scale, and re-run per product.

**Acceptance**
- The migration deliverable is a reviewable script, not an agent transcript. This is what makes the approach reproducible, diffable and auditable rather than merely convenient.
- The script lives outside the Platform's own repository, so REQ-MIG-001 holds.
- Re-running it is safe by construction (REQ-MIG-003).
- The first product is verified item-by-item by an editor before the remaining ~29 follow.

> The agent's deliverable is the *authoring* of the script; the script performs the migration. An agent may quietly coerce unanticipated input into something that looks right — where a parser would fail loudly — so review of the script, the reconciliation counts, and the item-by-item check on the first product are the three mitigations, and none is optional.

### REQ-MIG-008 — Legacy wiki frozen, then read-only archive

**Must** · R1 · [M1.10](../milestones.md) · spec §13.4 · **Not Started** · Issue: — · PR: —

Editing on the legacy wiki is frozen during migration. Afterwards it remains accessible read-only as an archive.

**Acceptance**
- The freeze is announced and effective before the final migration run, so no edit is stranded.
- The archive stays reachable — nothing in this plan deletes it.
- Freeze applies per product as each is migrated, not to all ~30 at once.

### REQ-MIG-009 — Flows, history, internal links, importer UI

**Won't** · spec §13.2 · [ADR-0021](../../adr/0021-agent-driven-migration.md) · **Rejected**

- **Flows and graphs are not migrated** — they do not exist in the source and are catalogued manually afterwards (REQ-NAV-003).
- **History is not migrated.** Each migrated project starts at version 1 (REQ-VER-007).
- **Internal links are not migrated** — no internal cross-links are expected in the source material.
- **No importer UI, and no import endpoint accepting an export archive** — added by ADR-0021. Migration is a scripted API client, not a Platform feature.
- **No round-trip.** Migration is one-way; the legacy wiki never becomes a second source of truth.

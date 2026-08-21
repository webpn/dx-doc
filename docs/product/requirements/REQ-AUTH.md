# REQ-AUTH — Authoring

Editing, assets, duplication, concurrency, history and search. Source: [functional specification](../functional-specification.md) §7, §19.4.

Entry format and status legend: [requirements index](README.md).

> **Carried forward on 2026-08-18.** A codebase review found that R1 milestones were closed on the strength of unit tests over application services, while the application itself was never assembled and no UI existed. Rows below that moved from `Implemented` to `In Progress` or `Not Started` have a service layer and no reachable entry point, or a defect the closing milestone did not test for; the `Milestone` column shows `original → completing` and the completing milestone is in the [R1 completion chain](../milestones.md#r1-completion--assembly-hardening-and-the-client). **No requirement changed scope, priority or release** — only the record of whether it is done. See the [milestones current position](../milestones.md#current-position).
> Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

> Naming note: this prefix covers **authoring**. Authentication requirements are in [REQ-SEC](REQ-SEC.md).

| ID           | Requirement                                          | MoSCoW | Rel. | Milestone    | Status      |
| ------------ | ---------------------------------------------------- | ------ | ---- | ------------ | ----------- |
| REQ-AUTH-001 | Markdown editor with the full block set              | Must   | R1   | M1.5 → M1.16 | Not Started |
| REQ-AUTH-002 | Image upload, 10 MB cap, resize to 2000 px           | Must   | R1   | M1.5 → M1.16 | Not Started |
| REQ-AUTH-003 | Free wiki pages with publishable flag                | Must   | R1   | M1.5 → M1.16 | In Progress |
| REQ-AUTH-004 | Mermaid rendering and live preview                   | Must   | R1   | M1.6 → M1.17 | In Progress |
| REQ-AUTH-005 | Optimistic concurrency with stale-write rejection    | Must   | R1   | M1.5 → M1.14 | In Progress |
| REQ-AUTH-006 | Tracking duplication within a project                | Must   | R1   | M1.5 → M1.16 | In Progress |
| REQ-AUTH-007 | Project-scoped full-text search                      | Must   | R1   | M1.7 → M1.17 | In Progress |
| REQ-AUTH-008 | Page and flow duplication                            | Should | R2   | M2.7         | Not Started |
| REQ-AUTH-009 | Cross-project tracking copy with guided mapping      | Should | R2   | M2.7         | Not Started |
| REQ-AUTH-010 | Bulk operations on a multi-selection, with preview   | Should | R2   | M2.4         | Not Started |
| REQ-AUTH-011 | Individual item archive and restore                  | Could  | R3   | M3.5         | Not Started |
| REQ-AUTH-012 | Per-element change history ("blame")                 | Should | R2   | M2.7         | Not Started |
| REQ-AUTH-013 | Global script-instruction template with placeholders | Should | R2   | M2.7         | Not Started |
| REQ-AUTH-014 | Image annotation layer linked to triggers            | Should | R2   | M2.3         | Not Started |
| REQ-AUTH-015 | Whole-project duplication                            | Could  | R3   | M3.5         | Not Started |

---

### REQ-AUTH-001 — Markdown editor with the full block set

**Must** · R1 · [M1.5](../milestones.md#m15--authoring) → [M1.16](../milestones.md#m116--authoring-ui) · spec §7.1, §16.1 · **Not Started** · Issue: — · PR: —

Content is stored as Markdown. Required blocks: headings, ordered and unordered lists, bold and italic, links, tables, code blocks, images, quotes and callouts. A ` ```mermaid ` fenced block is authorable and stored verbatim from R1 as a code block; **rendering** it as a diagram is REQ-AUTH-004, in R2.

Applies to tracking descriptions, page descriptions, flow descriptions, property descriptions and free pages.

**Acceptance**

- Stored content is Markdown, readable and diffable as text — this is what makes the git export and text diff possible at all.
- Every block round-trips through save and reload without lossy re-serialisation.
- Content authored in the editor renders identically in generated artefacts.

### REQ-AUTH-002 — Image upload, 10 MB cap, resize to 2000 px

**Must** · R1 · [M1.5](../milestones.md#m15--authoring) → [M1.16](../milestones.md#m116--authoring-ui) · spec §7.2 · **Not Started** · Issue: — · PR: —

Direct upload by drag-and-drop and clipboard paste. Maximum `UPLOAD_MAX_BYTES` (default 10 MB), automatic resize to `IMAGE_MAX_DIMENSION` (default 2000 px per side), stored in object storage (REQ-FDN-006).

**Acceptance**

- Clipboard paste works for a screenshot taken outside the browser — the single most common authoring action for this domain.
- Assets are **copied, not referenced**, when a tracking or page is duplicated, so deleting one copy cannot break the other.
- An oversized upload fails with a message naming the limit, before the bytes are stored.

### REQ-AUTH-003 — Free wiki pages with publishable flag

**Must** · R1 · [M1.5](../milestones.md#m15--authoring) → [M1.16](../milestones.md#m116--authoring-ui) · spec §7.7 · **In Progress** · Issue: — · PR: —

Hierarchically organised unstructured pages covering what the previous documentation template held outside the structured tables: data layer overview, script and SDK integration instructions, references, test URLs, test credentials.

**Acceptance**

- Each page carries a publishable flag; non-publishable pages are visible only to users with editing access.
- The flag's enforcement is REQ-SEC-012 — index exclusion and artefact omission, tested per path.
- Free pages have their own hierarchy, independent of the Page/Screen hierarchy.

### REQ-AUTH-004 — Mermaid rendering and live preview

**Must** · R1 · [M1.6](../milestones.md#m16--structure-and-navigation) → [M1.17](../milestones.md#m117--consultation-search-and-publication-ui) · spec §7.1, §8.4 · **In Progress** · Issue: — · PR: —

Mermaid code blocks render, and render live while editing. This is both the format used for hand-written diagrams and the format auto-generated from the flow graph (REQ-NAV-006, also R1/M1.6).

**Acceptance**

- A syntax error shows a legible message and leaves the source editable — it never discards the block.
- Hand-written Mermaid remains available inside any rich-text content after the flow-graph generator (REQ-NAV-006) lands.
- A ` ```mermaid ` block authored in R1 renders identically; it was stored verbatim as a fenced block (REQ-AUTH-001) from M1.5.

> **Demoted to R2 (M2.2) on 2026-08-12, then returned to R1 (M1.6) on 2026-08-17** when the Flow entity and its Mermaid generator (REQ-NAV-003…007) were moved into R1. The renderer is built once and serves both the auto-generated flow diagrams and hand-written blocks; it now ships with them rather than a release behind. The prior demotion note — that a ` ```mermaid ` block is a fenced code block, stored verbatim and searchable from R1 but not rendered — documents the state that held only while flows were R2.

> **Carried forward on 2026-08-18.** `generateMermaidDiagram` produces a correct diagram string from the graph, with node shapes and edge labels. Nothing renders it — there is no renderer, no preview and no client. The generator half is done; the requirement is about the rendered result. [M1.17](../milestones.md#m117--consultation-search-and-publication-ui).

### REQ-AUTH-005 — Optimistic concurrency with stale-write rejection

**Must** · R1 · [M1.5](../milestones.md#m15--authoring) → [M1.14](../milestones.md#m114--write-integrity-audit-and-publication-correctness) · spec §7.5, §16.1 · [ADR-0016](../../adr/0016-concurrency-model.md) · **In Progress** · Issue: — · PR: —

No pessimistic locking. A notice appears when a record being viewed is modified by someone else. A save is rejected if the record changed after the user opened it.

> **Status on 2026-08-21.** `Property`, `Module`, `Destination`, `NavigationEvent`, `Tracking`, `TrackingProperty` presence, `TrackingTemplate`, `FreePage`, `Flow`, `Trigger`, `Page`, `Project` and `Company` take `expectedUpdatedAt` and enforce it as an atomically guarded `UPDATE ... WHERE id = ? AND updated_at = ?`, returning `stale_write` when the row changed since the caller's read. Every mutable entity in the system is covered. `expectedUpdatedAt` is optional per call on every entity; omitting it writes unconditionally (last-write-wins), which is the client's choice to make, not the server's. What remains for this requirement: the conflict is not yet surfaced comprehensibly in the UI (still [M1.16](../milestones.md#m116--authoring-ui)).

**Acceptance**

- A rejected save states what happened and does not discard the user's input.
- The check is server-side and applies to API and MCP writes identically, not only to the UI.
- No lock can be left held by a departed session, because no lock exists.

### REQ-AUTH-006 — Tracking duplication within a project

**Must** · R1 · [M1.5](../milestones.md#m15--authoring) → [M1.16](../milestones.md#m116--authoring-ui) · spec §7.3 · **In Progress** · Issue: — · PR: —

A duplicated tracking inherits everything: properties, modules, specific values, description, images, page attachment and destinations.

**Acceptance**

- The copy is fully independent — there is no "derived tracking" with a live link to a parent.
- Images are copied into new storage objects, not referenced (REQ-AUTH-002).
- The copy receives its own immutable identifier.

### REQ-AUTH-007 — Project-scoped full-text search

**Must** · R1 · [M1.7](../milestones.md#m17--search) → [M1.17](../milestones.md#m117--consultation-search-and-publication-ui) · spec §7.8, §16.4 · **In Progress** · Issue: — · PR: —

Full-text search, scoped to a single project. Property names and tracking names rank above other text. **Specific values are indexed.** All textual content is indexed except non-publishable free pages.

**Acceptance**

- Searching a literal specific value answers "which tracking sets `page_name` to this?" — the most frequent lookup for analysts and developers alike.
- Prefix and stem matching work: `page_nam` and `tracked` find `page_name` and `tracking`.
- Search reflects the draft for an editor and the published version for a reader, consistently with REQ-NAV-002.
- Scope filtering is server-side from project grants (REQ-FDN-008); there is no cross-project search.
- Non-publishable content is absent from the index, verified against the index itself (REQ-SEC-012).

**Typo tolerance is deliberately not in scope.** The original criterion — "a fuzzy match on a misspelled property name still returns it" — is **withdrawn**, not deferred to a decision. The default adapter (Pagefind, REQ-FDN-007) does prefix matching and stemming, not typo correction, and that is accepted: it arrives when a search tool that supports it is adopted (REQ-FDN-022), and no requirement is written against it before then.

**Unblocked 2026-08-12.** O14 is closed by the rebuild model in [ADR-0009](../../adr/0009-search-abstraction.md): **two indices per project**. The published index is rebuilt on publication, so a reader searches exactly what is published and staleness is structurally impossible. The draft index is rebuilt asynchronously after each save, coalescing bursts, never blocking the write.

Two acceptance criteria follow from it:

- A draft edit is findable within **30 seconds** of the save that contained it, at pilot scale.
- A rebuild failure is surfaced and retried, never silent. A stale index returns plausible-looking empty results, which is the one search failure a user cannot distinguish from a correct answer.

The published index also makes the criterion above stronger than a filter: built from published content only, a non-publishable free page is absent by construction rather than by remembering to exclude it (REQ-SEC-012).

> Sacrificing typo tolerance is the deliberate first-phase trade for a search stack with no external dependency. The property being bought — no documentation content leaving the instance (REQ-FDN-021) — is the one an operator cannot add later; typo tolerance is one an organisation can buy whenever it wants it, by selecting a different adapter.

> **Carried forward on 2026-08-18.** The index is built correctly — properties, trackings, specific values, publishable free pages only — and the leak guards are in place. It cannot be queried: Pagefind has no server-side query API, so the adapter's `query` rejects by construction (documented honestly in the adapter itself), and the browser-side path it defers to does not exist. `GET /projects/:id/search` therefore fails for the default driver. The client-side query path, served through the grant-checked route, is built at [M1.17](../milestones.md#m117--consultation-search-and-publication-ui).

### REQ-AUTH-008 — Page and flow duplication

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §7.3 · **Not Started** · Issue: — · PR: —

Duplicating a page or a flow within a project, including contained trackings.

### REQ-AUTH-009 — Cross-project tracking copy with guided mapping

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §7.3 · **Not Started** · Issue: — · PR: —

Copying a selection of trackings into another project. Where the target lacks a source module or property, the user maps each missing item onto an existing one; unmapped items are created. Copies are independent (REQ-DOM-028) — no shared identity results.

### REQ-AUTH-010 — Bulk operations on a multi-selection, with preview

**Should** · R2 · [M2.4](../milestones.md#m24--bulk-operations) · spec §7.4 · **Not Started** · Issue: — · PR: —

Applied to a multi-selection of trackings: add module, remove module, add property, remove property, change page attachment, archive.

Every operation previews the affected items and the resulting change before applying. Each produces a **single** audit entry recording the operation, the selection size and the actor. Bulk edits write to the draft like any other edit, so they appear in the publication diff and can be excluded from a version.

Exposure through API and MCP carries the same validation, but agents must target an explicit list of identifiers — never a filter expression (REQ-API-008).

> The operation list above is the confirmed scope, which closes open decision O13 — bulk operations are no longer blocked.

> This addresses a long-standing shortcoming of the previous documentation. The presentation half is already solved by application-controlled layout: changing how trackings render updates every tracking at once, with no data migration.

### REQ-AUTH-011 — Individual item archive and restore

**Could** · R3 · [M3.5](../milestones.md#m35--containers-and-conveniences) · spec §19.4 · **Not Started** · Issue: — · PR: —

Archiving individual entities, as distinct from archiving a whole project (REQ-SEC-009).

### REQ-AUTH-012 — Per-element change history ("blame")

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §7.6 · **Not Started** · Issue: — · PR: —

Who changed what and when, on individual entities. Distinct from project-level versioning (REQ-VER-*) and from the audit log (REQ-SEC-006), which records events rather than content.

### REQ-AUTH-013 — Global script-instruction template with placeholders

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §7.7 · **Not Started** · Issue: — · PR: —

Script and SDK integration instructions derive from a company-level template containing placeholders for the identifiers configured per project. In R1 a copied free page suffices.

### REQ-AUTH-014 — Image annotation layer linked to triggers

**Should** · R2 · [M2.3](../milestones.md#m23--image-annotations) · spec §7.2 · **Not Started** · Issue: — · PR: —

Annotations are **structural, not decorative**. The original image is preserved; annotations are stored as a separate JSON layer rendered as a canvas overlay, so they stay editable.

- **Point** — small elements such as a button or icon.
- **Region** — larger areas such as a carousel, swimlane or content block. Regions may nest, expressing container-level and item-level interactions.
- An annotation may link to a Trigger or a Tracking.

> The link is what makes it structural. Instead of prose describing "the click on the CTA on this page", the documentation shows which element fires the tracking — addressing implementation ambiguity more directly than better prose can.

### REQ-AUTH-015 — Whole-project duplication

**Could** · R3 · [M3.5](../milestones.md#m35--containers-and-conveniences) · spec §7.3 · **Not Started** · Issue: — · PR: —

Duplicating an entire project, producing a fully independent copy.

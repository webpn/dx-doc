# REQ-AUTH — Authoring

Editing, assets, duplication, concurrency, history and search. Source: [functional specification](../functional-specification.md) §7, §19.4.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

> Naming note: this prefix covers **authoring**. Authentication requirements are in [REQ-SEC](REQ-SEC.md).

| ID           | Requirement                                          | MoSCoW | Rel. | Milestone | Status      |
| ------------ | ---------------------------------------------------- | ------ | ---- | --------- | ----------- |
| REQ-AUTH-001 | Markdown editor with the full block set              | Must   | R1   | M1.5      | Not Started |
| REQ-AUTH-002 | Image upload, 10 MB cap, resize to 2000 px           | Must   | R1   | M1.5      | Not Started |
| REQ-AUTH-003 | Free wiki pages with publishable flag                | Must   | R1   | M1.5      | Not Started |
| REQ-AUTH-004 | Mermaid rendering and live preview                   | Should | R2   | M2.2      | Not Started |
| REQ-AUTH-005 | Optimistic concurrency with stale-write rejection    | Must   | R1   | M1.5      | Not Started |
| REQ-AUTH-006 | Tracking duplication within a project                | Must   | R1   | M1.5      | Not Started |
| REQ-AUTH-007 | Project-scoped full-text search                      | Must   | R1   | M1.7      | Not Started |
| REQ-AUTH-008 | Page and flow duplication                            | Should | R2   | M2.7      | Not Started |
| REQ-AUTH-009 | Cross-project tracking copy with guided mapping      | Should | R2   | M2.7      | Not Started |
| REQ-AUTH-010 | Bulk operations on a multi-selection, with preview   | Should | R2   | M2.4      | Not Started |
| REQ-AUTH-011 | Individual item archive and restore                  | Could  | R3   | M3.5      | Not Started |
| REQ-AUTH-012 | Per-element change history ("blame")                 | Should | R2   | M2.7      | Not Started |
| REQ-AUTH-013 | Global script-instruction template with placeholders | Should | R2   | M2.7      | Not Started |
| REQ-AUTH-014 | Image annotation layer linked to triggers            | Should | R2   | M2.3      | Not Started |
| REQ-AUTH-015 | Whole-project duplication                            | Could  | R3   | M3.5      | Not Started |

---

### REQ-AUTH-001 — Markdown editor with the full block set

**Must** · R1 · [M1.5](../milestones.md) · spec §7.1, §16.1 · **Not Started** · Issue: — · PR: —

Content is stored as Markdown. Required blocks: headings, ordered and unordered lists, bold and italic, links, tables, code blocks, images, quotes and callouts. A ` ```mermaid ` fenced block is authorable and stored verbatim from R1 as a code block; **rendering** it as a diagram is REQ-AUTH-004, in R2.

Applies to tracking descriptions, page descriptions, flow descriptions, property descriptions and free pages.

**Acceptance**

- Stored content is Markdown, readable and diffable as text — this is what makes the git export and text diff possible at all.
- Every block round-trips through save and reload without lossy re-serialisation.
- Content authored in the editor renders identically in generated artefacts.

### REQ-AUTH-002 — Image upload, 10 MB cap, resize to 2000 px

**Must** · R1 · [M1.5](../milestones.md) · spec §7.2 · **Not Started** · Issue: — · PR: —

Direct upload by drag-and-drop and clipboard paste. Maximum `UPLOAD_MAX_BYTES` (default 10 MB), automatic resize to `IMAGE_MAX_DIMENSION` (default 2000 px per side), stored in object storage (REQ-FDN-006).

**Acceptance**

- Clipboard paste works for a screenshot taken outside the browser — the single most common authoring action for this domain.
- Assets are **copied, not referenced**, when a tracking or page is duplicated, so deleting one copy cannot break the other.
- An oversized upload fails with a message naming the limit, before the bytes are stored.

### REQ-AUTH-003 — Free wiki pages with publishable flag

**Must** · R1 · [M1.5](../milestones.md) · spec §7.7 · **Not Started** · Issue: — · PR: —

Hierarchically organised unstructured pages covering what the legacy template held outside the structured tables: data layer overview, script and SDK integration instructions, references, test URLs, test credentials.

**Acceptance**

- Each page carries a publishable flag; non-publishable pages are visible only to users with editing access.
- The flag's enforcement is REQ-SEC-012 — index exclusion and artefact omission, tested per path.
- Free pages have their own hierarchy, independent of the Page/Screen hierarchy.

### REQ-AUTH-004 — Mermaid rendering and live preview

**Should** · R2 · [M2.2](../milestones.md) · spec §7.1, §8.4 · **Not Started** · Issue: — · PR: —

Mermaid code blocks render, and render live while editing. This is both the format used for hand-written diagrams and the format auto-generated from the flow graph in R2 (REQ-NAV-006).

**Acceptance**

- A syntax error shows a legible message and leaves the source editable — it never discards the block.
- Hand-written Mermaid remains available inside any rich-text content after REQ-NAV-006 lands.

**Demoted from Must · R1 · M1.5 on 2026-08-12**, and the demotion is close to free because of what it does _not_ move. A ` ```mermaid ` block is a fenced code block, and content is stored as Markdown ([REQ-AUTH-001](#req-auth-001--markdown-editor-with-the-full-block-set)) — so from R1 an author can write one, it is stored verbatim, it survives export and re-import, and it is searchable. What moves to R2 is **rendering it as a diagram** instead of showing it as code.

This is why the requirement lands on [M2.2](../milestones.md) rather than anywhere else: [REQ-NAV-006](REQ-NAV.md) generates Mermaid from the flow graph in that same milestone and needs a renderer regardless. The two are now built once, together, rather than built in R1 and extended in R2.

> The cost is real and worth naming: in R1 a hand-written diagram is legible only to someone who reads Mermaid source. That falls on the container-page use case in the [R1 minimum requirements](../minimum-requirements.md), where a multi-page process is described with a flow diagram. The description and hierarchy carry it in R1; the picture arrives in R2.

### REQ-AUTH-005 — Optimistic concurrency with stale-write rejection

**Must** · R1 · [M1.5](../milestones.md) · spec §7.5, §16.1 · [ADR-0016](../../adr/0016-concurrency-model.md) · **Not Started** · Issue: — · PR: —

No pessimistic locking. A notice appears when a record being viewed is modified by someone else. A save is rejected if the record changed after the user opened it.

**Acceptance**

- A rejected save states what happened and does not discard the user's input.
- The check is server-side and applies to API and MCP writes identically, not only to the UI.
- No lock can be left held by a departed session, because no lock exists.

### REQ-AUTH-006 — Tracking duplication within a project

**Must** · R1 · [M1.5](../milestones.md) · spec §7.3 · **Not Started** · Issue: — · PR: —

A duplicated tracking inherits everything: properties, modules, specific values, description, images, page attachment and destinations.

**Acceptance**

- The copy is fully independent — there is no "derived tracking" with a live link to a parent.
- Images are copied into new storage objects, not referenced (REQ-AUTH-002).
- The copy receives its own immutable identifier.

### REQ-AUTH-007 — Project-scoped full-text search

**Must** · R1 · [M1.7](../milestones.md) · spec §7.8, §16.4 · **Not Started** · Issue: — · PR: —

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

### REQ-AUTH-008 — Page and flow duplication

**Should** · R2 · [M2.7](../milestones.md) · spec §7.3 · **Not Started** · Issue: — · PR: —

Duplicating a page or a flow within a project, including contained trackings.

### REQ-AUTH-009 — Cross-project tracking copy with guided mapping

**Should** · R2 · [M2.7](../milestones.md) · spec §7.3 · **Not Started** · Issue: — · PR: —

Copying a selection of trackings into another project. Where the target lacks a source module or property, the user maps each missing item onto an existing one; unmapped items are created. Copies are independent (REQ-DOM-028) — no shared identity results.

### REQ-AUTH-010 — Bulk operations on a multi-selection, with preview

**Should** · R2 · [M2.4](../milestones.md) · spec §7.4 · **Not Started** · Issue: — · PR: —

Applied to a multi-selection of trackings: add module, remove module, swap module, add property, remove property, set presence, change page attachment, archive.

Every operation previews the affected items and the resulting change before applying. Each produces a **single** audit entry recording the operation, the selection size and the actor. Bulk edits write to the draft like any other edit, so they appear in the publication diff and can be excluded from a version.

Exposure through API and MCP carries the same validation, but agents must target an explicit list of identifiers — never a filter expression (REQ-API-008).

**Blocked by:** open decision O13. The operation list is a considered proposal, not an observed requirement. Confirm or extend it from what editors actually did by hand during the pilot import and its item-by-item verification ([M1.10](../milestones.md)) — that evidence exists only once.

> This addresses the second-costliest shortcoming of the legacy wiki. The presentation half is already solved by application-controlled layout: changing how trackings render updates every tracking at once, with no data migration.

### REQ-AUTH-011 — Individual item archive and restore

**Could** · R3 · [M3.5](../milestones.md) · spec §19.4 · **Not Started** · Issue: — · PR: —

Archiving individual entities, as distinct from archiving a whole project (REQ-SEC-009).

### REQ-AUTH-012 — Per-element change history ("blame")

**Should** · R2 · [M2.7](../milestones.md) · spec §7.6 · **Not Started** · Issue: — · PR: —

Who changed what and when, on individual entities. Distinct from project-level versioning (REQ-VER-*) and from the audit log (REQ-SEC-006), which records events rather than content.

### REQ-AUTH-013 — Global script-instruction template with placeholders

**Should** · R2 · [M2.7](../milestones.md) · spec §7.7 · **Not Started** · Issue: — · PR: —

Script and SDK integration instructions derive from a company-level template containing placeholders for the identifiers configured per project. In R1 a copied free page suffices.

### REQ-AUTH-014 — Image annotation layer linked to triggers

**Should** · R2 · [M2.3](../milestones.md) · spec §7.2 · **Not Started** · Issue: — · PR: —

Annotations are **structural, not decorative**. The original image is preserved; annotations are stored as a separate JSON layer rendered as a canvas overlay, so they stay editable.

- **Point** — small elements such as a button or icon.
- **Region** — larger areas such as a carousel, swimlane or content block. Regions may nest, expressing container-level and item-level interactions.
- An annotation may link to a Trigger or a Tracking.

> The link is what makes it structural. Instead of prose describing "the click on the CTA on this page", the documentation shows which element fires the tracking — addressing implementation ambiguity more directly than better prose can.

### REQ-AUTH-015 — Whole-project duplication

**Could** · R3 · [M3.5](../milestones.md) · spec §7.3 · **Not Started** · Issue: — · PR: —

Duplicating an entire project, producing a fully independent copy.

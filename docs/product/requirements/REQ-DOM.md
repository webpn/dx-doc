# REQ-DOM — Domain Model

Entities, attributes, relationships and composition rules. Source: [functional specification](../functional-specification.md) §6, §19.3, Appendix A.

Entry format and status legend: [requirements index](README.md).

> **Carried forward on 2026-08-18.** A codebase review found that R1 milestones were closed on the strength of unit tests over application services, while the application itself was never assembled and no UI existed. Rows below that moved from `Implemented` to `In Progress` or `Not Started` have a service layer and no reachable entry point, or a defect the closing milestone did not test for; the `Milestone` column shows `original → completing` and the completing milestone is in the [R1 completion chain](../milestones.md#r1-completion--assembly-hardening-and-the-client). **No requirement changed scope, priority or release** — only the record of whether it is done. See the [milestones current position](../milestones.md#current-position).
> Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID          | Requirement                                           | MoSCoW | Rel. | Milestone    | Status      |
| ----------- | ----------------------------------------------------- | ------ | ---- | ------------ | ----------- |
| REQ-DOM-001 | Page/Screen entity                                    | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-002 | Tracking entity with navigation event and attachment  | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-003 | Data Layer Property, full attribute set               | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-004 | `object` property type with parent-child hierarchy    | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-005 | `business_label` field                                | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-006 | Module entity, project-scoped, inheritable            | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-007 | Opt-in propagation of module changes                  | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-008 | Property removal with automatic module detachment     | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-009 | Tracking Template, editor-configurable                | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-010 | Specific Values with plain `[placeholder]` strings    | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-011 | Prose conditional valorisations                       | Won't  | —    | —            | Rejected    |
| REQ-DOM-012 | Structured property conditions, four operators + note | Should | R2   | M2.1         | Not Started |
| REQ-DOM-013 | Conditions targeting nested property paths            | Should | R2   | M2.1         | Not Started |
| REQ-DOM-014 | Company-defined custom fields                         | Should | R2   | M2.1         | Not Started |
| REQ-DOM-015 | Unified Destination entity, N:N with properties       | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-016 | Per-destination name override                         | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-017 | CDP Audience entity                                   | Should | R2   | M2.7         | Not Started |
| REQ-DOM-018 | Survey entity                                         | Should | R2   | M2.7         | Not Started |
| REQ-DOM-019 | Company catalogue, copy-on-project-creation           | Must   | R1   | M1.1 → M1.16 | In Progress |
| REQ-DOM-020 | Project-scoped impact analysis                        | Should | R2   | M2.7         | Not Started |
| REQ-DOM-021 | Project pairing and alignment report                  | Could  | R4   | M4.3         | Not Started |
| REQ-DOM-022 | `derived_from` descriptive dependency field           | Should | R2   | M2.1         | Not Started |
| REQ-DOM-023 | Non-blocking naming and format warnings               | Should | R2   | M2.1         | Not Started |
| REQ-DOM-024 | Selective adoption of catalogue module changes        | Should | R2   | M2.7         | Not Started |
| REQ-DOM-025 | Extension / Segment / Calculated Metric containers    | Should | R3   | M3.5         | Not Started |
| REQ-DOM-026 | Recurring custom property standardisation hint        | Could  | R3   | M3.5         | Not Started |
| REQ-DOM-027 | TrackingProperty entity carrying the `presence` enum  | Must   | R1   | M1.1         | Implemented |
| REQ-DOM-028 | No cross-project references                           | Must   | R1   | M1.1         | Implemented |

---

### REQ-DOM-001 — Page/Screen entity

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.1, §8.1 · **In Progress** · Issue: — · PR: —

A page, screen, modal, popup, or page template of the product, organised in a hierarchy. Carries a short behavioural description, optional screenshots, and Figma coordinates (REQ-DEV-001). Where content is CMS-driven, only generic templates are catalogued.

The description is Markdown, like every other rich-text field (REQ-AUTH-001), and screenshots are image references to uploaded assets inside it (REQ-AUTH-002) — there is no separate page-to-asset relation. Figma coordinates are R2, with REQ-DEV-001.

**Acceptance**

- Modals and popups are Pages, not a distinct entity — a tracking on a modal attaches to that Page.
- Pages are **created, edited, deleted and reordered by editors** through the UI and the API alike; the page set of a project is not fixed or seeded — it is the project's own catalogue of screens. (Editing was implicit in M0.5 CRUD and REQ-NAV-001; this states it as the page requirement itself.)
- The hierarchy is arbitrarily deep and reorderable without changing any identifier (REQ-FDN-004).
- A page carries its position in the hierarchy explicitly, so sibling order survives export and re-import.
- A description survives a save-and-reload round trip verbatim, including fenced code blocks and image references.

### REQ-DOM-002 — Tracking entity with navigation event and attachment

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.7 · **In Progress** · Issue: — · PR: —

A single tracked event. Attaches either to a specific Page or to a page template. Carries name, navigation event (screen view / popup view / element click / form submission / user error, extensible), applied modules, resulting property set (a set of TrackingProperty records, REQ-DOM-027), specific values, rich-text description, and associated flow edges.

**Acceptance**

- The navigation-event list is **project-scoped data owned by editors** (Admin, Project Manager and Editor), not a hard-coded enum in application logic and not instance- or company-wide configuration. An editor can add, rename and deactivate events from the project settings; every tracking's event references that project's list.
- There is no "cross-page" attachment mode: an action appearing on many screens is a Trigger with several source Pages (REQ-NAV-004).
- There is no variant mechanism; scenario differences are expressed as property conditions (REQ-DOM-012).
- [ ] An editor creates a brand-new Tracking from the browser. Not yet true: `TrackingEditorPage` (`useTracking`/`useUpdateTracking`) only edits a Tracking that already exists, and no route reaches a create form — `useCreateTracking` exists in `src/app/queries/trackings.ts` but nothing in `App.tsx` calls it.

> **Found 2026-09-01.** Same defect class as the [2026-08-18 carry-forward](#req-dom--domain-model) above: a service layer with no reachable entry point. Directly blocks the [M1.16 exit criterion](../milestones.md#m116--authoring-ui) ("two trackings, their modules, properties... using the browser only").

### REQ-DOM-003 — Data Layer Property, full attribute set

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.4 · **In Progress** · Issue: — · PR: —

The central entity. Attributes: `id`, `name`, `business_label`, `description`, `data_source` (`development` / `tag_manager` / `other`), `type`, `format_pattern`, `allowed_values`, `example_values`, `pii_flag`, `hashing_policy`, `status`, `introduced_in_version`, `analysis_notes`, `aep_field_group`, `parent_property`, `derived_from`, `destinations`.

**Acceptance**

- **The property carries no `presence`.** Presence exists only on the TrackingProperty entity (REQ-DOM-027) — there is no default on the property and no second place to read it from.
- `data_source` drives the development-view filter (REQ-VIEW-003): a `tag_manager` property is physically excluded from development artefacts.
- `introduced_in_version` is set automatically at first publication and never edited by hand.
- `status` supports `deprecated` without deletion; deprecation is manual, never scheduled.
- Identifiers are documented as collected in clear text, with `hashing_policy` recording which algorithm applies to which destination — the hashing itself happens downstream.
- [ ] An editor creates a brand-new Property from the browser. Not yet true: `PropertyEditorPage` only edits an existing Property, and the only way a Property reaches a project is [REQ-DOM-019](#req-dom-019--company-catalogue-copy-on-project-creation)'s catalogue copy — which requires the Property to already exist at company level.

> **Found 2026-09-01.** Same defect class as the [2026-08-18 carry-forward](#req-dom--domain-model) above. Directly blocks the [M1.16 exit criterion](../milestones.md#m116--authoring-ui).

### REQ-DOM-004 — `object` property type with parent-child hierarchy

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.4 · **Implemented** · Issue: — · PR: —

A property of type `object` has child properties, addressed by path (`product.characteristics.colour`). Children are ordinary properties with `parent_property` set, inheriting every other attribute behaviour.

**Acceptance**

- Children appear in search, carry destinations, and can be targeted by conditions exactly as top-level properties do.
- Nesting depth is not artificially limited; the editor warns beyond three levels without blocking.
- A cycle in `parent_property` is rejected.
- The path, not the name, is displayed wherever ambiguity is possible.

> This exists because properties carry AEP XDM paths and XDM schemas are hierarchical. A flat list misrepresents any genuinely nested data layer, which most modern ones are.

### REQ-DOM-005 — `business_label` field

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.4, §14.2 · **Implemented** · Issue: — · PR: —

A human-readable label alongside the technical name, reserved for the future business glossary. Ships in R1 even though nothing consumes it.

**Acceptance**

- The field exists, is editable, and is exported wherever properties are exported.
- No feature depends on it being populated.

> One column now avoids a migration if the semantic layer is ever built (backlog). Deliberate cost, taken while it is cheap. See open decision O2.

### REQ-DOM-006 — Module entity, project-scoped, inheritable

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.5 · **In Progress** · Issue: — · PR: —

A named, project-scoped bundle of Data Layer Properties used to add properties to a tracking in bulk. Modules contain properties only and are **not nestable**. They may be inherited from the company catalogue at project creation.

**Acceptance**

- A module cannot contain another module; the attempt is rejected at the domain level.
- A module belongs to exactly one project.
- [ ] An editor creates a brand-new Module from the browser. Not yet true: `ModuleEditorPage` only edits an existing Module (name, description, attached properties); the only way a Module reaches a project is [REQ-DOM-019](#req-dom-019--company-catalogue-copy-on-project-creation)'s catalogue copy.

> **Found 2026-09-01.** Same defect class as the [2026-08-18 carry-forward](#req-dom--domain-model) above. Directly blocks the [M1.16 exit criterion](../milestones.md#m116--authoring-ui).

### REQ-DOM-007 — Opt-in propagation of module changes

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.5 · **In Progress** · Issue: — · PR: —

When a module's property set changes, the editor is asked — at save time or later on demand — whether to propagate to existing trackings using it. **The default is no propagation.**

**Acceptance**

- Without an explicit propagation action, a module change affects only trackings created afterwards.
- Propagation shows what it will change before it changes it, and writes to the draft like any other edit.
- Propagation produces a single audit entry, not one per tracking.

> Named as a demotion candidate if R1 overruns — see [milestones](../milestones.md#risk-mitigations-owned-by-milestones).

> **Carried forward on 2026-08-21.** `previewModulePropagation` reports which trackings a module's current property set would change and which properties each would gain, writing nothing; `propagateModuleToTrackings` applies it on explicit request and records a single `module_propagated` audit entry for the whole operation. `updateModule` still never propagates, so the default remains no propagation. Both reuse the `applyModuleToTracking` domain rule, so a propagated property is indistinguishable from one added by attaching the module by hand. What remains: the opt-in prompt and preview surface in the authoring UI at [M1.16](../milestones.md#m116--authoring-ui), and the REST route exposing both calls.

### REQ-DOM-008 — Property removal with automatic module detachment

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.7 · **Implemented** · Issue: — · PR: —

Any property may be removed from a tracking individually, whether it arrived via a module or was added directly. If **all** of a module's properties are removed, the module association is removed automatically, with a warning.

**Acceptance**

- Removing a module-supplied property does not remove the module while other module properties remain.
- Removing the last one detaches the module and warns the editor — it does not silently leave a module with no effect.
- Re-adding the module restores its full property set without duplicating properties added individually.

### REQ-DOM-009 — Tracking Template, editor-configurable

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.6 · **In Progress** · Issue: — · PR: —

A blueprint for new trackings: preselected modules, preconfigured custom properties, default specific values, prefilled description sections. Project-scoped, optionally inherited from the catalogue.

**Acceptance**

- Any editor can create and modify a template with no software release.
- Modifying a template has no effect on trackings already created from it.
- Templates exist only for Trackings; no template mechanism exists for pages or flows.
- The current _Page View_ and _Action_ templates are expressible as instances of this mechanism, with no hard-coded behaviour remaining.

> **Updated 2026-09-03.** `createTracking` accepts an optional `templateId`, validates the template scope, and applies JSON defaults for description, page, navigation event and modules. A seeded module's properties are materialised into the new tracking through the same `applyModuleToTracking` domain rule used when attaching a module by hand. Template `config_json` now also accepts `specificValues` entries shaped as `{propertyId, value, description?}` or `{propertyCustomId, value, description?}`. Each entry must address a property seeded by `propertyIds` or `moduleIds`; valid values are attached to the newly generated `trackingProperty` record, while an unseeded reference is rejected before the tracking is created. The raw JSON template editor is browser-reachable, so this configuration is editor-configurable without a software release. Existing trackings are not changed when a template is modified. The requirement remains **In Progress** pending the M1.16 browser acceptance walkthrough and a browser-reachable create-from-template selection flow.

### REQ-DOM-010 — Specific Values with plain `[placeholder]` strings

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.8 · **Implemented** · Issue: — · PR: —

The concrete value a property must take within a given tracking. Attaches to a TrackingProperty (REQ-DOM-027) and is optional on it. Values may contain placeholders written as plain text in square brackets (`article_detail_[slug]`).

**Acceptance**

- Placeholders have no formal grammar: no nesting, no typing, no optionality markers. Their meaning is prose in the tracking or property description.
- Placeholders survive round-tripping through export and import verbatim.
- Specific values are indexed for search (REQ-AUTH-007).

> Accepted limitation (open decision O4): conformance checking of a placeholder-bearing value stays approximate. Revisit before R4 begins, or accept it.

### REQ-DOM-011 — Prose conditional valorisations

**Won't** · spec §6.8 · **Rejected — superseded by REQ-DOM-012**

Originally a `Must` in R1: a conditional valorisation ("one value if logged in, another otherwise") expressed in prose, with the structured form arriving in R2.

Rejected. **R1 carries no conditional valorisations in any form.** The structured mechanism (REQ-DOM-012) is the only one, and it arrives in R2.

An editor who needs to express a condition before then does so as ordinary description text, which is not a mechanism and is not treated as one: nothing reads it, nothing reports on it, and nothing is expected to convert it later.

> Rejecting the prose form removes the conversion problem instead of scheduling it. Had R1 shipped prose conditions, the products being imported would have carried an unknown number of them in free text with no marker, and R2 would have needed an inventory report to find them before the structured field could be populated. That report is now unnecessary — which is the whole reason to accept the R1 gap rather than fill it with something that has to be undone.

### REQ-DOM-012 — Structured property conditions, four operators + note

**Should** · R2 · [M2.1](../milestones.md#m21--structured-expression) · spec §6.8 · **Not Started** · Issue: — · PR: —

_property_ + _operator_ + _value_ + optional _note_, attached to a TrackingProperty (REQ-DOM-027). Exactly four operators: `is`, `is not`, `is set`, `is not set` — the last available only where that record's `presence` is `sometimes`. The note is the escape hatch for anything the operators cannot express.

**This is the only mechanism for conditional valorisation.** The prose form was rejected rather than deferred (REQ-DOM-011), so conditions do not exist in the product before R2 and no migration path into this field is required.

Two downstream capabilities depend on this and on nothing else: snippet narrowing (REQ-DEV-005) and mechanical conformance checking (REQ-DQ-003).

### REQ-DOM-013 — Conditions targeting nested property paths

**Should** · R2 · [M2.1](../milestones.md#m21--structured-expression) · spec §6.8 · **Not Started** · Issue: — · PR: —

A condition may target a child property by path. A condition on a child is independent of any condition on its parent; the full path is always displayed.

### REQ-DOM-014 — Company-defined custom fields

**Should** · R2 · [M2.1](../milestones.md#m21--structured-expression) · spec §6.4, §14.2 · **Not Started** · Issue: — · PR: —

Additional typed fields defined at company level and attachable to properties, trackings and pages. This is how semantic-layer attributes are modelled until the ontology is defined — replacing the previously reserved `owl_details` placeholder.

The "how to read this in the analytics platform" guidance is captured as a **single free-text note per property**: one unstructured field an editor writes in plain language, describing how the value should be interpreted once it lands in the downstream analytics tool. No per-platform or structured sub-fields are modelled; the flexibility lives in the prose.

**Resolved:** open decision O3 closed on 2026-08-17 — the analytics-reading guidance is a single free-text note per property (option A), not structured or per-destination sub-fields. [REQ-DOM-014](#req-dom-014--company-defined-custom-fields) is unblocked. The view selector ([REQ-VIEW-002](REQ-VIEW.md#req-view-002--view-selector-as-a-presentation-filter)) is sequenced after O3 but at M2.5 is not gated by it.

### REQ-DOM-015 — Unified Destination entity, N:N with properties

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.9 · **Implemented** · Issue: — · PR: —

A single entity replaces the separate analytics-variable and analytics-event tables. Attributes: platform, variable type, identifier, name, reconciliation identifier, plus platform-specific attributes (Adobe eVar/prop/event; CJA XDM path and field group; GA4 custom dimension and scope; PostHog identifier). A per-destination note records downstream processing.

**Acceptance**

- One property may feed several destinations and one destination may be fed by several properties.
- Relationships to Extension and Calculated Metric are modelled even though those entities remain containers until R3 (REQ-DOM-025).
- The import maps both legacy tables into this single entity without loss (REQ-IMP-003).

### REQ-DOM-016 — Per-destination name override

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.9 · **Implemented** · Issue: — · PR: —

The property↔destination relationship carries `destination_name_override`: the same property is frequently named one way as an Adobe eVar and another as a GA4 custom dimension.

**Acceptance**

- The override lives on the relationship, not on either entity.
- Where absent, the property name is used.

> Ships in R1 because retrofitting it once mappings are populated is expensive, and the column costs nothing now.

### REQ-DOM-017 — CDP Audience entity

| **Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §6.10 · **Not Started** · Issue: — · PR: —

| Name, downstream systems fed, identifier in the audience-management platform, free-text entry/exit conditions, and the properties the audience is built on.

**Acceptance**

- Entry and exit conditions are free text — there is no structured rule builder.
- Audiences appear in impact analysis (REQ-DOM-020) as consumers of a property.
- Audiences are excluded from the development view (REQ-VIEW-003).

### REQ-DOM-018 — Survey entity

| **Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §6.11 · **Not Started** · Issue: — · PR: —

| Name, tool, trigger/invitation conditions, properties used, pages involved, status (offline / in test / live), campaign, delivery type, go-live and deactivation dates.

**Acceptance**

- Surveys appear in impact analysis and are excluded from the development view.

> **Moved out of R1 on 2026-08-17.** Audiences and surveys were originally `Must` in R1 because a 1:1 import that lost them would fail a real imported product. That import no longer requires them in R1, so they move to R2 (M2.7); the import documents them in free text or as post-import additions rather than holding them in the critical path.

### REQ-DOM-019 — Company catalogue, copy-on-project-creation

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) → [M1.16](../milestones.md#m116--authoring-ui) · spec §6.3 · **Implemented** · Issue: — · PR: —

The company catalogue holds standard properties, modules, templates and free-page templates. At project creation the selected items are **copied** into the project. There is no live link.

**Acceptance**

- Subsequent catalogue changes do not propagate to existing projects.
- A property created inside a project cannot be promoted into the catalogue — the operation does not exist.
- A copied item has its own identifier, independent of its catalogue source. **No provenance column is stored**: the copy retains no reference of any kind to the catalogue item it came from.
- The copy is **self-contained**: a copied module references the copied properties, never the catalogue's property rows. A copied module carries its properties even when only the module was selected — selecting a module implies copying what it is made of.
- Where a later feature needs to relate a project item back to a catalogue item (REQ-DOM-024), it does so by **matching on name**, computed at the moment it is needed.

> Accepted consequence: the catalogue drifts from project reality over time. Conscious trade-off for project autonomy. The mitigation (REQ-DOM-026) is optional and deferred.
>
> **Name matching is the deliberate choice, and it has a stated cost.** Renaming a module on either side breaks the correspondence, and two items that coincidentally share a name are treated as the same item. That is acceptable because every feature built on the match is advisory and human-confirmed — REQ-DOM-024 proposes, an editor accepts. The alternative, a stored `catalogue_source_id`, buys precision at the cost of a link the model has otherwise gone to some trouble not to have.

> **Implemented on 2026-09-03.** The REST project-creation path invokes the copy through `ProjectService`, and direct application-service creation uses the same flow. The standalone catalogue endpoint remains available and idempotently reuses existing project-scoped copies by name, preserving module-to-property remapping. Integration tests cover populated and empty catalogues, tenant/project isolation, and manual re-copy.

### REQ-DOM-020 — Project-scoped impact analysis

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §6.12 · **Not Started** · Issue: — · PR: —

Answers: which trackings, destinations, audiences, surveys and dashboards reference this property? Required before deprecating anything. Project-scoped only — there is no cross-project impact analysis.

### REQ-DOM-021 — Project pairing and alignment report

**Could** · R4 · [M4.3](../milestones.md#m43--r4-conveniences) · spec §6.13 · **Not Started** · Issue: — · PR: —

A project may declare another as its counterpart. The pairing does nothing except enable a read-only, advisory name-matched comparison report. It never proposes or applies a change.

> Deliberately a report and nothing more: it requires no model change, can be added at any time, and can be dropped if it proves unused. Platform alignment is a convenience, not a design driver.

### REQ-DOM-022 — `derived_from` descriptive dependency field

**Should** · R2 · [M2.1](../milestones.md#m21--structured-expression) · spec §6.4 · **Not Started** · Issue: — · PR: —

A list of property references documenting derivation. Descriptive only — never used for automated analysis, and distinct from the `parent_property` object hierarchy. The two relationships must not be collapsed into one.

### REQ-DOM-023 — Non-blocking naming and format warnings

**Should** · R2 · [M2.1](../milestones.md#m21--structured-expression) · spec §6.4 · **Not Started** · Issue: — · PR: —

Warnings, never blocks, for: lowercase underscore-separated names; booleans as `si`/`no`; ISO 8601 timestamps; environment values `dev`/`qa`/`prod`; separators `,` at macro level and `|` for sub-properties.

Preferring generic properties qualified by context, and explicit names over generic ones such as _category_ or _type_, remains a human review responsibility and is **not** automated.

> Named as a demotion candidate if R1 overruns — though it is already R2.

### REQ-DOM-024 — Selective adoption of catalogue module changes

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §6.3, §6.5 · **Not Started** · Issue: — · PR: —

A project may choose on demand to adopt a change made to a company-level module, and then separately whether to propagate it internally (REQ-DOM-007). Two independent decisions.

Correspondence between a project module and a catalogue module is established by **name match**, computed when the comparison is requested — no provenance is stored at copy time (REQ-DOM-019). The feature is therefore advisory: it shows the editor a candidate correspondence and the difference it implies, and the editor accepts or ignores it. A renamed module on either side simply produces no match, and no adoption is proposed.

### REQ-DOM-025 — Extension / Segment / Calculated Metric containers

**Should** · R3 · [M3.5](../milestones.md#m35--containers-and-conveniences) · spec §6.9, §14.2 · **Not Started** · Issue: — · PR: —

Ship as containers with their relationships modelled; they gain substance with the semantic layer in the backlog.

**Blocked by:** open decision O9 — whether they need real attributes before the semantic layer (backlog).

### REQ-DOM-026 — Recurring custom property standardisation hint

**Could** · R3 · [M3.5](../milestones.md#m35--containers-and-conveniences) · spec §6.3 · **Not Started** · Issue: — · PR: —

A report highlighting custom properties recurring across many projects as candidates for standardisation. Advisory; mitigates catalogue drift without introducing a live link.

### REQ-DOM-027 — TrackingProperty entity carrying the `presence` enum

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.4 · **Implemented** · Issue: — · PR: —

**TrackingProperty** is the record of one Data Layer Property being used by one Tracking. It is a first-class entity, not an implicit link: it carries `tracking`, `property`, `source` (`module` / `direct`, per REQ-DOM-008) and `presence`.

`presence` is `always` / `sometimes` / `never`, resolved per tracking on this record. Replaces a plain boolean.

**This is the only place `presence` exists.** The Data Layer Property carries no presence attribute and no default (REQ-DOM-003) — a property has a presence only in the context of a tracking that uses it.

The entity is what the Tracking's "resulting property set" (REQ-DOM-002) is made of, and it is the parent of the two other per-(tracking, property) records: Specific Values (REQ-DOM-010) and Property Conditions (REQ-DOM-012) attach to a TrackingProperty, not to a bare Tracking–Property pair.

**Acceptance**

- The entity exists in its own right, so presence has exactly one declared home rather than being an attribute of an unmodelled relationship.
- The value lives on this record, so the same property may be `always` in one tracking and `sometimes` in another.
- No schema, API payload or export represents presence as an attribute of the property itself.
- Removing a TrackingProperty removes its Specific Values and Conditions with it; a property cannot hold a specific value in a tracking that does not use it.
- `never` is expressible, and is what lets a condition state that a property must **not** be present in a scenario.
- `is not set` (REQ-DOM-012) is offered only where presence is `sometimes`.

### REQ-DOM-028 — No cross-project references

**Must** · R1 · [M1.1](../milestones.md#m11--tracking-data-model) · spec §6.2, §6.13 · [ADR-0010](../../adr/0010-project-scoped-isolation.md) · **Implemented** · Issue: — · PR: —

An entity may only reference entities belonging to its own project. Properties are fully isolated: the `page_name` of a web project and of the corresponding app project are unrelated objects.

**Acceptance**

- A reference crossing a project boundary is rejected at the domain level, not merely absent from the UI.
- Cross-project copy (REQ-AUTH-009) creates independent copies, never shared references.
- No project-scoped name prefix is needed or used, since collisions across projects are impossible by construction.

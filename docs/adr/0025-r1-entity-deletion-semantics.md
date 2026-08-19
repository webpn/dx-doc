# ADR-0025: R1 Entity Deletion Semantics

## Status

Accepted

## Date

2026-08-18

## Context

[M1.12](../product/milestones.md#m112--access-administration-and-api-surface-completion)
carries "deletion for every entity that R1 allows an editor to delete" as
part of completing the API surface. A codebase review on 2026-08-18 found
that almost none of it exists: the only delete paths in the whole
application are grant revocation, shared-password deletion, service-token
revocation, and `removeTrackingProperty` (detaching one property from one
tracking). Every catalogue entity (Property, Module, Destination,
NavigationEvent, TrackingTemplate), every content entity (Page, Tracking,
FreePage, SpecificValue), and every flow entity (Flow, Trigger) can be
created and updated through the API and has no delete route at all.

The schema (`db/migrations/`) defines every foreign key with Kysely's
default `.references(...)` and no `.onDelete(...)` clause anywhere. Combined
with `PRAGMA foreign_keys = ON` (set on every SQLite connection, verified by
`sqlite.test.ts`), this means the database **already enforces RESTRICT
semantics**: attempting to delete a row that another row still references
fails with a foreign-key constraint error. Nothing in the schema cascades or
nulls a reference on delete. This was not a deliberate decision recorded
anywhere — it is simply what happens when no `onDelete` is specified — but
it is the behavior every entity has had since M1.1, and reversing it now
would mean writing new migrations, so this ADR treats it as the starting
point rather than something to relitigate per entity.

One existing precedent shapes the pattern: `removeTrackingProperty`
(`sqlite-tracking-repositories.ts`) deletes a tracking property's own
`specific_values` rows before deleting the `tracking_properties` row itself.
Those rows have no independent identity — a specific value is meaningless
without the property it specifies — so removing them alongside their parent
is not a data-loss decision, it is the parent's own composition being
removed with it.

The entity graph splits cleanly into two kinds of relationship, and the
decision below is really one rule applied twelve times:

- **Ownership** (a row exists only to record another entity's own
  composition: a module's property list, a property's destination
  mappings, a tracking's module/property/specific-value/trigger
  associations, a flow's nodes and edges). These rows are deleted alongside
  their owner. This is not a new cascade mechanism — it is the same
  delete-children-then-parent sequence `removeTrackingProperty` already
  uses, applied consistently.
- **Reference** (a row points at an entity that exists independently of
  it: a module attached to a tracking, a property mapped to a destination,
  a page holding trackings or used in a flow diagram, a trigger placed on
  a flow canvas). Deleting the referenced entity while the reference exists
  is refused.

## Decision

**Delete is refused (409, `IN_USE`) whenever another entity still
references the target through something other than the target's own
owned/junction rows. Owned rows are removed together with their parent, in
the same operation, before the parent row is deleted — extending the
pattern `removeTrackingProperty` already established.** No entity is
soft-deleted, archived, or silently cascades into deleting another
independently-existing entity. `Project` archival (REQ-SEC-016 lifecycle,
`project.archive`) is out of scope here — it is a status flip, not a
delete, and is unaffected by this ADR.

The `IN_USE` error carries a short machine-readable `reason` naming what
blocks the delete (e.g. `"attached to 3 tracking(s)"`), following the
existing `replyServiceError` pattern (`duplicate_custom_id`,
`hierarchy_cycle`) rather than the raw SQLite constraint message.

Per entity:

| Entity               | Blocks delete when...                                                                                                                    | Deletes alongside it (owned rows)                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **FreePage**         | never — nothing references it                                                                                                            | —                                                                                                       |
| **TrackingTemplate** | never — `config_json` is a value blob, not FK-linked to trackings created from it                                                        | —                                                                                                       |
| **SpecificValue**    | never — a leaf value                                                                                                                     | —                                                                                                       |
| **Destination**      | any `property_destinations` row maps a property to it                                                                                    | —                                                                                                       |
| **NavigationEvent**  | any `trackings` or `tracking_templates` row references it                                                                                | —                                                                                                       |
| **Module**           | attached to any tracking (`tracking_modules`)                                                                                            | its `module_properties` membership rows                                                                 |
| **Property**         | used on any tracking (`tracking_properties`), member of any module (`module_properties`), or has child properties (`parent_property_id`) | its own `property_destinations` mapping rows                                                            |
| **Trigger**          | placed as a node on any flow (`flow_nodes.trigger_id`)                                                                                   | its `trigger_trackings` association rows                                                                |
| **Page**             | has child pages (`parent_id`), holds any tracking (`trackings.page_id`), or is a node on any flow (`flow_nodes.page_id`)                 | —                                                                                                       |
| **Flow**             | never — nothing references a flow except its own nodes/edges                                                                             | its `flow_nodes` and `flow_edges` (edges before nodes)                                                  |
| **Tracking**         | never — a trigger's association with it is its own ownership concern, not the tracking's                                                 | its `tracking_modules`, `tracking_properties` (+ their `specific_values`), and `trigger_trackings` rows |

**Why `Tracking` blocks nothing.** A tracking is the unit an editor
actively curates; every table that mentions a `tracking_id` exists to
record _that tracking's own_ configuration (which modules it uses, which
properties it carries, which trigger recognizes it) rather than something
else depending on the tracking staying alive. Deleting it should not
require first undoing that configuration by hand — the configuration is
exactly what deleting the tracking is supposed to remove. This mirrors
`removeTrackingProperty` deleting `specific_values` without asking the
editor to delete them individually first.

**Why `Page`, `Destination`, `Module`, `Property`, `Trigger` do block.**
These are exactly the cases where the referencing row records some _other_
entity's dependency on this one continuing to exist: a tracking's
attachment to a page, a property's mapping to a destination, a tracking's
use of a module or property, a flow diagram's placement of a trigger. That
matches the precedent already set by [M1.1's exit
criterion](../product/milestones.md#m11--tracking-data-model) for the
_single-tracking_ case — "removing the last module-supplied property from
a tracking detaches the module **and warns**" — extended to the
whole-catalogue-entity case: the API refuses rather than silently
detaching everywhere at once. A bulk "detach everywhere then delete" tool
is explicitly an R2 concept ([REQ-AUTH-010](../product/requirements/REQ-AUTH.md#req-auth-010--bulk-operations-on-a-multi-selection-with-preview),
M2.4); R1 requires the explicit unwind first, through the endpoints that
already exist (`PUT /api/properties/:id/destinations`, tracking
module/property attachment, flow graph editing, page reparenting).

**Transactionality.** The owned-rows-then-parent deletes run as sequential
statements, not inside a database transaction — the same as every other
multi-statement write in the codebase today (`setModuleProperties`,
`setTrackingModules`, `removeTrackingProperty` itself). [REQ-FDN-025](../product/requirements/REQ-FDN.md#req-fdn-025--transactional-write-boundaries)
at [M1.14](../product/milestones.md#m114--write-integrity-audit-and-publication-correctness)
is the milestone that makes every multi-statement write atomic; this ADR
does not special-case deletion ahead of that milestone; it matches the
standard the rest of the codebase is held to until then.

**Permission required to delete an entity is the same permission required
to edit it** (`project.edit` for project-scoped content entities,
`company.manage_catalogue` for catalogue entities per
[REQ-SEC-010](../product/requirements/REQ-SEC.md#req-sec-010--company-catalogue-is-managed-by-the-admin-role)) —
deletion is not a distinct, more privileged action in R1.

## Alternatives Considered

### Cascade everything (deleting a Page deletes its trackings, deleting a Module deletes it from every tracking silently)

Rejected. This is the fastest to implement and the most dangerous: a
single click on an old catalogue Module could silently strip properties
off dozens of trackings with no confirmation and no per-item review — the
exact failure mode the M1.1 exit criterion's "detach and warns" language
was written to prevent for the single-tracking case. It also does not
match the schema, which already enforces RESTRICT by omission; cascading
in application code while the database restricts would mean writing
code specifically to work around a safety property that is already there
for free.

### Soft delete / archive every entity, never hard-delete

Rejected for R1. [REQ-SEC-016](../product/requirements/REQ-SEC.md#req-sec-016--deny-by-default-authorisation-on-every-entry-point)'s
sibling milestones only specify archive for `Project`
([M2.8](../product/milestones.md#m28--platform-hardening): "projects
cannot be hard-deleted through any entry point"), which implies the R1
entity set — pages, trackings, catalogue items — is expected to support
real deletion, not archival. Introducing a `deleted_at` convention for
eleven tables is a schema-wide change with its own read-path implications
(every list/get query would need a `WHERE deleted_at IS NULL`, every
`custom_id` uniqueness check would need to decide whether a deleted row's
`custom_id` is reusable) that no requirement asks for in R1.

### Let the raw SQLite foreign-key error surface to the client

Rejected. `SQLITE_CONSTRAINT_FOREIGNKEY` names the internal table and
column, not the domain concept, and gives the editor nothing to act on. A
mapped `IN_USE` error with a `reason` is one small `try/catch`-free
pre-check per delete method (a `COUNT` query against the blocking table)
and is consistent with every other domain error this API already returns
as a structured code rather than a raw driver exception.

## Consequences

- Twelve `delete*` repository methods are added (one per entity in the
  table above), each preceded by the owned-row deletes it needs.
- `TrackingServiceError`, `PageServiceError` and `CompanyError` (already
  extended for company update) gain an `{ kind: 'in_use'; reason: string }`
  variant; `replyServiceError` in `src/api/helpers.ts` gains the matching
  409 case.
- Ten new `DELETE` routes are added: `/api/pages/:id`,
  `/api/properties/:id`, `/api/modules/:id`, `/api/destinations/:id`,
  `/api/navigation-events/:id`, `/api/tracking-templates/:id`,
  `/api/free-pages/:id`, `/api/trackings/:id`, `/api/flows/:id`,
  `/api/triggers/:id`, plus `/api/specific-values/:id`.
- The route-table test (`composition-root.test.ts`, REQ-FDN-023) picks
  these up automatically once registered; no change to its mechanism is
  needed.
- MCP write tools do **not** gain delete tools in this pass — deletion was
  not in the R1 MCP tool list ([REQ-API-004](../product/requirements/REQ-API.md#req-api-004--mcp-write-tools-draft-only)
  names create/attach operations only) and an agent-driven import has no
  reason to delete what it just wrote. Revisit if a future milestone gives
  agents a reason to clean up after themselves.
- Cross-tenant deletion (deleting an entity in a company/project the actor
  has no grant on) is denied by the same permission check every other
  write on that entity already uses; this ADR does not change the
  authorisation model, only what happens after permission is granted.

## Related

- [ADR-0004](0004-immutable-internal-identifiers.md) — identifiers this
  ADR's blocking checks query by.
- [ADR-0016](0016-concurrency-model.md) — the sibling ADR for another
  cross-cutting write rule (staleness) applied uniformly across entities;
  same shape of decision.
- [ADR-0020](0020-database-portability.md) — the portable-SQL subset these
  new queries stay inside.
- Requirements: this ADR is implementation guidance for the "deletion for
  every entity" line item in
  [M1.12](../product/milestones.md#m112--access-administration-and-api-surface-completion);
  no `REQ-*` id currently names entity deletion on its own.

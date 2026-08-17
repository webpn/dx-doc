# REQ-DEV — Developer Handoff

Code snippets and external design/dashboard links. Source: [functional specification](../functional-specification.md) §11, §19.8.

Entry format and status legend: [requirements index](README.md). These requirements are R2 and later; acceptance criteria are elaborated when the release is planned.

| ID          | Requirement                                         | MoSCoW | Rel. | Milestone | Status      |
| ----------- | --------------------------------------------------- | ------ | ---- | --------- | ----------- |
| REQ-DEV-001 | Figma frame links stored as file_id + node_id       | Should | R2   | M2.7      | Not Started |
| REQ-DEV-002 | Code snippet generation per platform × tag manager  | Should | R3   | M3.1      | Blocked     |
| REQ-DEV-003 | Snippets in every development-facing artefact       | Should | R3   | M3.1      | Not Started |
| REQ-DEV-004 | Changed-tracking snippets in the developer PDF      | Should | R3   | M3.1      | Not Started |
| REQ-DEV-005 | Snippets narrowed by structured property conditions | Should | R3   | M3.1      | Not Started |
| REQ-DEV-006 | Dashboard and KPI links                             | Should | R3   | M3.5      | Not Started |
| REQ-DEV-007 | Figma frame import with design refresh              | Could  | R4   | M4.3      | Not Started |

---

### REQ-DEV-001 — Figma frame links stored as file_id + node_id

**Should** · R2 · [M2.7](../milestones.md#m27--editorial-depth) · spec §11.2, §14.3 · **Not Started** · Issue: — · PR: —

Figma links at page and tracking level, stored as `figma_file_id` + `figma_node_id` rather than as an opaque URL. Until R4 the link is used for navigation only.

> The storage shape is the entire point. It costs nothing now and turns frame import (REQ-DEV-007) into an additive feature rather than a migration. **Frame import is explicitly not delivered before R4** — the page hierarchy is catalogued manually through R1–R3.

### REQ-DEV-002 — Code snippet generation per platform × tag manager

**Should** · R3 · [M3.1](../milestones.md#m31--code-snippet-generation) · spec §11.1 · **Blocked** · Issue: — · PR: —

For every tracking, a ready-to-use snippet containing all its properties. Output is determined by the project's platform (Web / iOS / Android / Flutter / React) and tag-manager configuration.

Snippets are **hard-coded per combination in the application source**, not user-configurable — changing a snippet template means a pull request to the Platform. They are **generated on the fly** and are not versioned, not diffed, and not included in the changelog. Placeholders are preserved verbatim (`article_detail_[slug]`) with explanatory comments.

**Blocked by:** open decision O8 — developer-handoff reference patterns: which snippet conventions to bake in per platform × tag manager, informed by reference products. Unblocked once that design question is settled.

### REQ-DEV-003 — Snippets in every development-facing artefact

**Should** · R3 · [M3.1](../milestones.md#m31--code-snippet-generation) · spec §11.1 · **Not Started** · Issue: — · PR: —

Snippets appear in the in-app development view, the Confluence export, the static site and the PDF. Depends on the profile-aware rendering engine (REQ-VIEW-003).

### REQ-DEV-004 — Changed-tracking snippets in the developer PDF

**Should** · R3 · [M3.1](../milestones.md#m31--code-snippet-generation) · spec §10.4, §11.1 · **Not Started** · Issue: — · PR: —

The PDF of a version's changes (REQ-VIEW-006) includes snippets for the trackings that changed — the handoff artefact a developer receives for a release.

### REQ-DEV-005 — Snippets narrowed by structured property conditions

**Should** · R3 · [M3.1](../milestones.md#m31--code-snippet-generation) · spec §6.8, §11.1 · **Not Started** · Issue: — · PR: —

Where structured conditions exist (REQ-DOM-012), the snippet shows only the allowed values that condition specifies, comments a property as required where its presence is `always` in that scenario, and as forbidden where it is `never`.

> This is a main practical gain over the previous documentation: the developer sees what applies to _this_ scenario rather than the full property set. It is also the reason REQ-DOM-012 exists — with prose conditions alone, this is not implementable.

### REQ-DEV-006 — Dashboard and KPI links

**Should** · R3 · [M3.5](../milestones.md#m35--containers-and-conveniences) · spec §11.2 · **Not Started** · Issue: — · PR: —

Dashboard links at project level, including links from individual KPIs to the trackings that feed them. Targets include analytics workspaces, BI dashboards and dashboard mockups. The inverse relationship — from a dashboard back to its source properties — is not required.

### REQ-DEV-007 — Figma frame import with design refresh

**Could** · R4 · [M4.3](../milestones.md#m43--r4-conveniences) · spec §14.3 · **Not Started** · Issue: — · PR: —

Importing design frames to create Pages, each with its image, name and a link back to source file and node, so a screenshot can be refreshed when the design changes, and frames laid out in sequence generate their transitions.

> Addresses a real process gap — who refreshes screenshots when the interface changes currently has no answer better than editorial discipline. A source link plus a refresh action turns it into a button. Deliberately not before R4; REQ-DEV-001 is the only obligation in the meantime.

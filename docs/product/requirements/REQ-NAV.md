# REQ-NAV — Structure and Navigation

Page hierarchy, recap views, flows and the sidebar. Source: [functional specification](../functional-specification.md) §8, §19.5.

Entry format and status legend: [requirements index](README.md). Acceptance criteria are written for R0 and R1 requirements; R2+ entries are catalogued and their criteria are elaborated when the release is planned.

| ID          | Requirement                                    | MoSCoW | Rel. | Milestone | Status      |
| ----------- | ---------------------------------------------- | ------ | ---- | --------- | ----------- |
| REQ-NAV-001 | Page hierarchy with navigable sidebar          | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-002 | Automatic per-page tracking recap              | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-003 | Flow entity                                    | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-004 | Trigger nodes distinct from visual transitions | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-005 | Directed graph with labels and conditions      | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-006 | Automatic Mermaid generation from the graph    | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-007 | Sidebar exposing flows alongside the hierarchy | Must   | R1   | M1.6      | Not Started |
| REQ-NAV-008 | Visual drag-and-drop graph editor              | Could  | R3   | M3.5      | Not Started |
| REQ-NAV-009 | Cross-project search                           | Won't  | —    | —         | Rejected    |

---

### REQ-NAV-001 — Page hierarchy with navigable sidebar

**Must** · R1 · [M1.6](../milestones.md) · spec §8.1, §8.5 · **Not Started** · Issue: — · PR: —

Pages and screens are organised in a hierarchy that drives a navigable sidebar. Where content is CMS-driven, only generic page templates are catalogued (_"single news page"_), not individual instances.

**Acceptance**

- The imported product's full hierarchy is navigable end to end without a search.
- Reordering or reparenting a page changes no identifier (REQ-FDN-004) and breaks no reference.
- The sidebar remains usable at pilot scale — thousands of trackings across a deep tree.

> Absence of a navigable content tree was pain point 4 in the previous documentation. This is the requirement that closes it.

### REQ-NAV-002 — Automatic per-page tracking recap

**Must** · R1 · [M1.6](../milestones.md) · spec §8.2 · **Not Started** · Issue: — · PR: —

Each page displays an automatic recap of every tracking attached to it — page views, popup views, actions — showing at minimum the tracking name and its specific values.

**Acceptance**

- Opening any page answers "what is tracked here?" with no further navigation.
- The recap is generated from the model, never maintained by hand.
- It reflects the draft when viewed by an editor and the published version when viewed by a reader.

### REQ-NAV-003 — Flow entity

**Must** · R1 · [M1.6](../milestones.md) · spec §8.3 · **Not Started** · Issue: — · PR: —

A named user journey: title, rich-text description, and a directed graph over the project's Pages. First-class but **purely representational** — it binds nothing and constrains nothing.

Funnel steps _are_ Pages; there is no separate step entity. A Page may belong to several flows. The graph is a graph, not a tree: branching, loops and re-entry are supported.

Because a Flow references Pages and Trackings it does not own, it participates in the publication referential rule (REQ-VER-003): publishing a Flow whose nodes include an excluded Page or Tracking is refused, so no generated diagram (REQ-NAV-006) can contain a node absent from the version.

### REQ-NAV-004 — Trigger nodes distinct from visual transitions

**Must** · R1 · [M1.6](../milestones.md) · spec §8.3 · **Not Started** · Issue: — · PR: —

The graph has two node types. A plain Page→Page connection is **purely visual**: the user moves between screens and nothing is bound. A **Trigger** is the navigation, system or user action that causes a tracking to fire, carrying:

- name and description
- 0..N source Pages — more than one is normal (a navigation-bar action exists on every screen)
- 0..N destination Pages — zero is normal (a filter toggle, an accordion, a validation error goes nowhere); self-references permitted
- label and descriptive condition
- 0..N associated Trackings
- 0..N image annotations anchoring the action to a region of a source screenshot (REQ-AUTH-014)

> Why two node types: an edge-only model can express "the click that moves the user from step 2 to step 3" but has nowhere to put a non-navigating action, and needs a special cross-page attachment mode for actions on many screens. The Trigger handles all three cases uniformly and removes the special case — which is why REQ-DOM-002 has no cross-page attachment mode.

### REQ-NAV-005 — Directed graph with labels and conditions

**Must** · R1 · [M1.6](../milestones.md) · spec §8.3, §8.4 · **Not Started** · Issue: — · PR: —

Edges are authored through a form-based list within the flow page. (Moved from R2/M2.2 to R1/M1.6 on 2026-08-17.) Nodes and edges are relational tables, not a graph database (REQ-FDN-005).

### REQ-NAV-006 — Automatic Mermaid generation from the graph

**Must** · R1 · [M1.6](../milestones.md) · spec §8.4 · **Not Started** · Issue: — · PR: —

The diagram is generated from the structured graph, not written. Hand-written Mermaid remains available inside any rich-text content for free-form diagrams not derived from the graph. Both rely on the renderer delivered by [REQ-AUTH-004](REQ-AUTH.md) in the same milestone — it is built once and serves both.

> Closes pain point 3: journeys drawn by hand with no relationship to the documented pages.

### REQ-NAV-007 — Sidebar exposing flows alongside the hierarchy

**Must** · R1 · [M1.6](../milestones.md) · spec §8.5 · **Not Started** · Issue: — · PR: —

The sidebar exposes both the page hierarchy and the flows, so the inventory can be navigated either way.

### REQ-NAV-008 — Visual drag-and-drop graph editor

**Could** · R3 · [M3.5](../milestones.md) · spec §8.4 · **Not Started** · Issue: — · PR: —

A visual editor replacing form-based edge authoring. The graph model is unchanged; this is presentation only.

### REQ-NAV-009 — Cross-project search

**Won't** · spec §7.8, §19.5 · **Rejected**

Search is scoped to a single project. Recorded here so the exclusion is explicit rather than an oversight, and because it follows from project isolation (REQ-DOM-028) rather than from effort.

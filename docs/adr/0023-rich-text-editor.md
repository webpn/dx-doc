# ADR-0023: Rich-Text Editor Engine

## Status

Accepted (2026-08-12) — **conditional on the verification spike below**

## Date

2026-08-12

## Context

[ADR-0011](0011-ui-library-selection.md) selected shadcn/ui and recorded that it covers neither the Markdown editor nor Mermaid. Both are Must requirements delivered by [M1.5](../product/milestones.md):

- **[REQ-AUTH-001](../product/requirements/REQ-AUTH.md)** — content is **stored as Markdown**, with the full block set, and _"every block round-trips through save and reload without lossy re-serialisation"_. Markdown-as-storage is not a preference: the git export ([ADR-0018](0018-git-export-model.md)) and the textual diff on descriptions ([REQ-VER-004](../product/requirements/REQ-VER.md)) both rest on it.
- **[REQ-AUTH-004](../product/requirements/REQ-AUTH.md)** — Mermaid rendering with live preview. **Demoted to R2 / M2.2 on 2026-08-12**, so it no longer bears on this decision for R1: a ` ```mermaid ` block is a fenced code block, and an editor that handles code blocks handles it. What R2 needs is a renderer, built once for both hand-written blocks and the diagrams generated from the flow graph ([REQ-NAV-006](../product/requirements/REQ-NAV.md)).

The editor is the single largest piece of UI in the product and the one an editor spends the day inside.

## Decision

**[Mina Rich Editor](https://github.com/Mina-Massoud/Mina-Rich-Editor)** (MIT), installed the same way every other component is:

```bash
npx shadcn@latest add https://ui-v4-livid.vercel.app/r/styles/new-york-v4/rich-editor.json
```

That command is the decisive argument. The editor is distributed **as a shadcn/ui component** — copy-paste source under MIT, landing in `src/design-system/` beside everything else, owned by this repository from the moment it is added. It arrives under exactly the model [ADR-0011](0011-ui-library-selection.md) chose, rather than as a second distribution mechanism bolted next to it.

Its stated features cover most of what REQ-AUTH-001 asks for: Notion-style block editing over paragraphs, headings, lists, images, tables and code blocks; Markdown shortcuts; smart paste that converts pasted Markdown into blocks; and export to JSON, semantic HTML or Markdown.

## The gap, and the spike that closes it

This is accepted **conditionally**, on one requirement the editor does not satisfy as published. It must be settled by a time-boxed spike **before M1.5 starts**, not discovered during it.

**Markdown is an export, not the storage model.** The editor's native representation is blocks; Markdown is one of three things it can emit. REQ-AUTH-001 requires the opposite direction to hold as well — Markdown is what is _stored_, and reloading it must reconstruct the same blocks without loss. An export is a one-way transform and does not demonstrate that.

The spike must prove a **lossless Markdown → blocks → Markdown round-trip over the full required block set**, including tables, nested lists, callouts, and code blocks with language tags — the last of which now carries Mermaid sources through R1 as plain fenced blocks, so their verbatim survival is part of the same test. If the round-trip is lossy, the alternatives are to store block JSON and give up the git export and the textual diff — not acceptable, they are the reason Markdown was chosen — or to change editor.

The spike should also include a paste from Word or Google Docs and a non-Latin IME test, for the reason given under risks below.

**Fallback if it fails:** TipTap (ProseMirror) or Lexical, both with mature Markdown serialisation. Naming the fallback now is what makes the spike a decision point rather than a sunk cost.

> The Mermaid gap was the second condition until 2026-08-12, when REQ-AUTH-004 was demoted to R2. It is now an R2 question about a renderer rather than an R1 question about this editor.

## Two features to switch off deliberately

The project advertises two capabilities this product does not want, and neither is harmless if left in place.

**AI assistance with a provider-agnostic model layer.** The Platform's stock configuration must contact no external service beyond what [REQ-FDN-021](../product/requirements/REQ-FDN.md)'s data-flow statement lists, and the whole argument for the Pagefind default ([ADR-0009](0009-search-abstraction.md)) is that documentation content does not leave the instance. An editor that can post the document to a model provider is exactly the kind of egress that statement exists to rule out. It must be removed or hard-disabled in the copied source, and the M0.6 data-flow test should cover the editor the way it covers search.

**CRDT-based multi-user editing.** [ADR-0016](0016-concurrency-model.md) chose optimistic concurrency with stale-write rejection, and [M1.5](../product/milestones.md)'s exit criterion is a _rejected_ save with a visible conflict. A live collaborative layer would silently merge exactly the situation the product has decided to surface. It is unused surface area at best and a contradiction of an accepted decision at worst.

## Risks accepted

| Risk                                                                   | Assessment                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single maintainer** — 1 contributor, 81 commits, 1 watcher           | Real, and it compounds risk R4 in the register (bus factor of one) by adding a second one. Mitigated more than usual by the distribution model: the source is copied and MIT-licensed, so an abandoned upstream leaves working code we already own, not a dead dependency to rip out.                                                                                                                          |
| **Quiet since 2026-03-22** (~5 months) on a project created 2025-10-11 | For a young editor this is the signal to watch. It does not block adoption of copied source; it does mean upstream fixes may never arrive.                                                                                                                                                                                                                                                                     |
| **Custom engine, "zero ProseMirror dependency"**                       | The largest technical risk. ProseMirror and Lexical encode years of `contenteditable` edge cases — IME composition, paste normalisation, undo across blocks, selection behaviour. A ten-month-old engine has not met them all, which is why the spike includes a Word/Docs paste and a non-Latin IME test.                                                                                                     |
| **Near-zero training-data representation**                             | Cuts directly against the criterion that decided [ADR-0011](0011-ui-library-selection.md). An agent knows TipTap; it does not know this editor and will need to read the copied source. That is the same instruction the "close to upstream" rule already gives, so the cost is bounded — but it is a cost, and it is the one place where this decision and ADR-0011's reasoning point in opposite directions. |

## Related Decisions

- [ADR-0011](0011-ui-library-selection.md): shadcn/ui — the distribution model this shares, and the AI-familiarity criterion it strains.
- [ADR-0016](0016-concurrency-model.md): optimistic concurrency — why the CRDT layer is switched off.
- [ADR-0018](0018-git-export-model.md): git export — why Markdown must be the stored form.
- [REQ-FDN-021](../product/requirements/REQ-FDN.md): the data-flow statement the AI features would violate.
- D14 in [decisions](../decisions/README.md).

## Last Responsible Moment

Before [M1.5](../product/milestones.md) begins — and the spike must land before it, not inside it.

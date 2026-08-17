# ADR-0023: Rich-Text Editor Engine

## Status

Accepted (2026-08-12) — **amended 2026-08-17**: the engine is **MDXEditor**, replacing the original Mina Rich Editor choice below. The acceptance condition (lossless Markdown round-trip) applies unchanged to the new engine.

## Date

2026-08-12 (accepted), amended 2026-08-17

## Context

[ADR-0011](0011-ui-library-selection.md) selected shadcn/ui and recorded that it covers neither the Markdown editor nor Mermaid. Both are Must requirements delivered by [M1.5](../product/milestones.md#m15--authoring):

- **[REQ-AUTH-001](../product/requirements/REQ-AUTH.md#req-auth-001--markdown-editor-with-the-full-block-set)** — content is **stored as Markdown**, with the full block set, and _"every block round-trips through save and reload without lossy re-serialisation"_. Markdown-as-storage is not a preference: the git export ([ADR-0018](0018-git-export-model.md)) and the textual diff on descriptions ([REQ-VER-004](../product/requirements/REQ-VER.md#req-ver-004--version-metadata)) both rest on it.
- **[REQ-AUTH-004](../product/requirements/REQ-AUTH.md#req-auth-004--mermaid-rendering-and-live-preview)** — Mermaid rendering with live preview. **Demoted to R2 on 2026-08-12, then returned to R1 / M1.6 on 2026-08-17** when flows (REQ-NAV-003…007) moved into R1. Either way it does not bear on the editor choice for R1 storage: a ` ```mermaid ` block is a fenced code block, and an editor that handles code blocks handles it (renderer delivery is a separate concern, REQ-AUTH-004).

The editor is the single largest piece of UI in the product and the one an editor spends the day inside.

## Decision (as amended 2026-08-17)

**[MDXEditor](https://github.com/mdx-editor/editor)** (`@mdxeditor/editor`, MIT, ~3.6k stars) — a React rich-text editor whose source of truth is Markdown itself. This is a decision-point reversal from the original pick (Mina Rich Editor), reached for two reasons:

1. **It is designed with Markdown as substrate**, not as an export target. The editor's model is the markdown document; blocks and MDX editing sit on top of it. This is the direction the original ADR's spike had to _prove out_ against Mina (whose native form is blocks, with Markdown one-way as an export). Choosing an editor whose canonical form is Markdown removes the spike's hardest open question at the source rather than relying on a round-trip that has not yet been demonstrated.
2. **It is a mainstream, widely-forked component** (~3.6k stars, an established npm package rather than a single-maintainer copied source). This directly addresses the two risks the original ADR carried: the single-maintainer bus-factor risk (R4) and the near-zero-agent-training-data risk that cut against ADR-0011's decision criterion.

Consequence to record: MDXEditor is distributed as an **npm package**, not as a shadcn copy-paste source file. ADR-0011's "kept close to upstream" rule therefore no longer applies to the editor in the copy-the-source sense; it is a normal dependency, pinned. This is a deliberate, visible divergence from ADR-0011's distribution model, taken because the package is the thing that makes the other two properties (Markdown-first, well-supported) true. The rest of the app's components remain shadcn source files.

### The acceptance condition still applies (unchanged)

[REQ-AUTH-001](../product/requirements/REQ-AUTH.md#req-auth-001--markdown-editor-with-the-full-block-set) requires **Markdown as the stored form**, with the full block set. A time-boxed spike must still verify a **lossless Markdown → document → Markdown round-trip over the full required block set** — headings, ordered/unordered lists, bold and italic, links, tables, code blocks (including ` ```mermaid ` fenced blocks with language tags), images, quotes and callouts. That spike lands **before M1.5 begins**, not inside it.

> The original fallback (TipTap/ProseMirror or Lexical) is retained. MDXEditor itself is built on ProseMirror, so if its own round-trip is lossy, TipTap as the fallback is a comparatively short step; both are named so the spike is a decision point rather than a sunk cost.

## Two features to switch off deliberately

The project advertises two capabilities this product does not want, and neither is harmless if left in place.

**AI assistance / MDX execution.** The Platform's stock configuration must contact no external service beyond what [REQ-FDN-021](../product/requirements/REQ-FDN.md#req-fdn-021--third-party-data-flow-statement)'s data-flow statement lists, and the whole argument for the Pagefind default ([ADR-0009](0009-search-abstraction.md)) is that documentation content does not leave the instance. Any AI-assist plugin and any live JSX/MDX execution must be removed or hard-disabled, and the M0.6 data-flow test should cover the editor the way it covers search.

**CRDT-based multi-user editing.** [ADR-0016](0016-concurrency-model.md) chose optimistic concurrency with stale-write rejection, and [M1.5](../product/milestones.md#m15--authoring)'s exit criterion is a _rejected_ save with a visible conflict. A live collaborative layer would silently merge exactly the situation the product has decided to surface. It is unused surface area at best and a contradiction of an accepted decision at worst — leave it off.

## Risks accepted

| Risk                                                                                       | Assessment                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not a shadcn component** — divergence from ADR-0011's copy-the-source distribution model | Accepted deliberately. The distribution model was a means, not an end; Markdown-as-substrate and an established community are worth more to this product than uniform component plumbing. Pinned version keeps it deterministic.                                                                                       |
| **MDX/JSX surface**                                                                        | The product's content is plain Markdown with fenced code blocks. The JSX/MDX editing surface is unused surface area; it is not toggled on and not documented as a feature.                                                                                                                                             |
| **Mermaid between R1 and R2**                                                              | Amended 2026-08-17: a ` ```mermaid ` block is a fenced code block, stored verbatim from R1 (REQ-AUTH-001) and rendered from M1.6 in R1 (REQ-AUTH-004, returned from R2 when flows moved to R1 — see the note in [REQ-AUTH-004](../product/requirements/REQ-AUTH.md#req-auth-004--mermaid-rendering-and-live-preview)). |

## Related Decisions

- [ADR-0011](0011-ui-library-selection.md): shadcn/ui — the distribution model this deliberately diverges from.
- [ADR-0016](0016-concurrency-model.md): optimistic concurrency — why the CRDT layer is switched off.
- [ADR-0018](0018-git-export-model.md): git export — why Markdown must be the stored form.
- [REQ-FDN-021](../product/requirements/REQ-FDN.md#req-fdn-021--third-party-data-flow-statement): the data-flow statement the AI features would violate.
- D14 in [decisions](../decisions/README.md).

## Last Responsible Moment

Before [M1.5](../product/milestones.md#m15--authoring) begins — and the spike must land before it, not inside it.

# ADR-0021: Agent-Driven Migration Instead of a Bespoke Importer

## Status

Accepted

## Date

2026-08-12

## Context

The specification (§13) calls for an importer built into the Platform: it reads a source system's "Markdown & CSV" export, maps the structured tables 1:1, migrates assets, converts source blocks into supported Markdown, and runs idempotently with an import report. It is listed as a Must in R1.

Three problems with that shape:

**It is throwaway code in the product.** A Notion-specific parser lives in the Platform's source forever, ships to every open-source deployer, and is exercised roughly thirty times in total — once per existing product — before becoming dead weight. Every future refactor pays for it.

**It is the wrong tool for a messy input.** The source is many products documented over years by many hands against a template that drifted. A parser handles the cases its author anticipated and fails or silently mangles the rest. Fidelity loss in block conversion was already flagged in the spec as "the main source of fidelity loss", and the failure mode of a parser meeting unanticipated structure is silent coercion.

**It builds nothing durable.** After migration the Platform is left with a dead importer and no better programmatic surface than it had before — while "weak programmatic access" was pain point 6, and machine-readability is a stated secondary goal (§3.2).

An AI agent reading the export directly inverts all three. The export is Markdown and CSV on a filesystem — an agent reads it natively, without a parser. It can recognise the drift between products, ask when something is genuinely ambiguous, and adapt. And the capability it needs on the dx-doc side — a complete, documented, idempotent API plus MCP tools — is exactly the capability the product wants to have anyway, for R3's goals and for the semantic layer beyond.

## Decision

**The Platform ships no source-format-specific import code. Migration is performed by an AI agent driving the public API, and the deliverable is a committed, re-runnable script.**

Four parts:

1. **The Platform knows nothing about Notion.** No parser, no block converter, no import endpoint, no importer UI. Zero lines of the codebase reference the source format. This is what keeps the migration cost out of the product.

2. **The API is complete and import-grade** (REQ-IMP-002 … REQ-IMP-005). Every R1 entity is creatable and updatable through the API; assets upload through it; writes are idempotent upserts keyed on a custom id; batch endpoints make bulk ingestion practical.

3. **MCP read and write tools move from R3 to R1** (REQ-API-003, REQ-API-004). The agent uses them to inspect target state, verify what it wrote, and reconcile — the loop a blind script cannot perform.

4. **The output is a script, not a conversation.** Claude explores one product's export interactively, then writes a migration script that is committed to a repository, reviewed, and re-run per product. This is the part that makes the approach defensible rather than merely convenient: a script is reproducible, reviewable, diffable, and idempotent. An agent transcript is none of those things.

**Applies to all the products being imported.** That is why the API investment is justified and why the script is a maintained artefact rather than a scratch file.

## Alternatives Considered

### Build the bespoke importer as specified (§13)

Rejected for the three reasons above. Its one genuine advantage — determinism — is preserved by the committed script, which is equally deterministic once written.

### Agent performs the migration interactively, no script

Rejected. It is unreproducible, unreviewable, and cannot be re-run after a correction — which forfeits the idempotency the specification correctly demanded (§13.3). It would also make thirty products thirty separate manual efforts. The agent's work is the _authoring_ of the script; the script does the migration.

### Importer as a separate repository, still hand-written

Rejected. It solves the "throwaway code in the product" problem but neither of the other two, and still requires the complete API in order to write against. Once the API exists, the hand-written parser is the part adding least value.

### Ship an import endpoint that accepts the Notion ZIP

Rejected — this is the bespoke importer with a different entry point, and it puts the source-format knowledge back in the product.

## Consequences

- **R1 grows a documented public API, MCP read tools, MCP write tools, and service-account tokens**, all of which were R3. R1 was already the release most at risk of overrunning (risk R1). The scope traded away — the importer and its block converter — is real but smaller. **Net, R1 gets harder.** This is accepted deliberately, because what R1 gains is permanent product capability rather than code that is dead after thirty runs.
- **The week-5 real-data checkpoint survives and gets sharper.** It was the mitigation for risks R1 and R2, and its logic is unchanged: run against real pilot data before the UI is finished, while the data model is still cheap to change. It now also validates that the API is genuinely complete — a gap in the API surface shows up as a thing the agent cannot create.
- **Verification shifts from the importer's report to the Platform's own reconciliation** (REQ-IMP-006). Counts per entity type per project, comparable against the source by a human. This is stronger than an importer's self-report, because it is generated by the system being written to rather than by the process doing the writing.
- **A new failure mode: plausible-looking wrong data.** A parser fails loudly on unanticipated input; an agent may quietly coerce it into something that looks right. Three mitigations, all already required for other reasons: the script is reviewed before it runs at scale, reconciliation counts are checked against the source, and the first product is verified item-by-item by an editor at M1.10 before the remaining products follow.
- **Migration content arrives via agent, so agent-vs-human attribution in the diff (REQ-VER-010) matters earlier.** Moved R3 → R2: from R1 onward, agents and humans write into the same draft, and the publication diff is the only review gate (ADR-0019).
- **The `custom_id` upsert key is a permanent model addition**, not migration scaffolding. It is what makes any future bulk ingestion idempotent, and retrofitting it after write endpoints exist would mean reworking all of them — which is why it lands in R0/R1 rather than when first needed.
- **Agents still cannot publish.** The migration writes into the draft; a human publishes version 1. The restriction from ADR-0019 is unchanged and unweakened by moving MCP earlier.

## Related

- [ADR-0007](0007-api-as-single-entry-point.md) — the API-first constraint this leans on entirely
- [ADR-0019](0019-ai-coding-agent-model.md) — agent write model, draft-only, no publication
- [ADR-0004](0004-immutable-internal-identifiers.md) — identity basis for idempotent upserts
- Supersedes specification §13's importer approach; §13's _scope_ decisions (no flow reconstruction, no history migration, no internal links) are unchanged
- Requirements: REQ-IMP-001 … REQ-IMP-009, REQ-API-002, REQ-API-003, REQ-API-004, REQ-API-009, REQ-VER-010

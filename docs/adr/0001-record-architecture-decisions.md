# ADR-0001: Record Architecture Decisions

## Status

Accepted

## Date

2026-08-11

## Context

The project needs a mechanism to record significant architectural decisions, their rationale, and their consequences. This mechanism must be discoverable by both human contributors and AI coding agents.

## Decision

Architecture Decision Records (ADRs) are stored in `docs/adr/`, using a lightweight numbered format:

```
docs/adr/0001-record-architecture-decisions.md
docs/adr/0002-multi-company-tenancy.md
docs/adr/0003-...
```

Each ADR contains:

- **Status:** Proposed | Accepted | Deprecated | Superseded (by ADR-NNNN)
- **Date:** when the decision was made
- **Context:** the problem, constraints, and forces
- **Decision:** what was decided
- **Alternatives considered:** and why they were rejected
- **Consequences:** what becomes easier, harder, or constrained

## Alternatives Considered

### No ADRs

Rejected: undocumented decisions are invisible to new contributors and AI agents, leading to repeated re-litigation.

### Centralised decision log in one document

Rejected: a single file grows unbounded and makes it hard to link decisions to specific components. Individual files allow targeted reading.

### Tool-generated ADRs (adr-tools, log4brains)

Rejected: adds tooling dependency for marginal benefit. Plain Markdown files are simple, portable, and understood by every agent.

## Consequences

- Every significant architectural decision must be recorded in an ADR.
- ADRs are linked from relevant documentation files.
- When a decision is reversed or superseded, the ADR is updated (status → Superseded) and a new ADR is created.
- ADRs for proposed (not yet made) decisions use status "Proposed" and list alternatives.

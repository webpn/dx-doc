# ADR-0019: AI Coding-Agent Interaction Model

## Status
Accepted

## Date
2026-08-11

## Context
The Platform will be developed substantially with AI coding agents (GitHub Copilot, Claude Code, and others). These agents need clear, discoverable instructions about how to work with this codebase. The instructions must work across different agents (not all agents support the same instruction formats) and must remain maintainable as the project evolves.

## Decision
A **layered instruction model** with three levels:

### Level 1: `AGENTS.md` (root)
- Concise, mandatory rules. Every agent must read this first.
- States the architecture, the non-negotiable rules, and the required validation commands.
- Points to deeper documentation.
- Compatible with the emerging `AGENTS.md` convention (OpenAI Codex, Claude Code, and others).

### Level 2: `AI_DEVELOPMENT_GUIDE.md`
- Detailed AI agent behavior: workflows, constraints, prohibited behaviors, change scope, validation.
- Specific to AI agents — human contributors read `CONTRIBUTING.md`.

### Level 3: Layer-specific documentation
- `ARCHITECTURE.md` — architectural model and boundaries.
- `ENGINEERING_GUIDE.md` — technical coding rules.
- `STYLE_GUIDE.md` — naming and formatting.
- `docs/adr/` — historical decisions and rationale.

### Nested `AGENTS.md` (future)
- Only for subdirectories with genuinely different rules. Currently, none exist.
- If added, they take precedence for files within their scope.

## Alternatives Considered

### Single monolithic agent instructions file
Rejected: grows unbounded, hard to navigate, agents waste context on irrelevant details.

### `.cursor/rules` or editor-specific instruction files
Rejected: ties the project to a specific editor/agent. The `AGENTS.md` convention is cross-platform.

### No agent-specific instructions — agents read human docs
Rejected: agents need explicit behavioral constraints (prohibited practices, validation requirements, change scope rules) that human docs don't typically spell out.

## Consequences
- Every AI agent interaction starts from `AGENTS.md`. The file must be kept concise and up-to-date.
- When architectural rules change, `AGENTS.md`, `ARCHITECTURE.md`, and `AI_DEVELOPMENT_GUIDE.md` must be checked for consistency.
- The layered model means agents read the right amount of context for their task — not the entire documentation system.
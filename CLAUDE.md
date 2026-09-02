# dx-doc

Before non-trivial work in this repo, load the `dx-doc-dev` skill — it condenses `AGENTS.md`,
`AI_DEVELOPMENT_GUIDE.md`, `ENGINEERING_GUIDE.md`, and `STYLE_GUIDE.md` into checklists (architecture
boundaries, validation gate, model tiering, delegation). Those four docs stay authoritative; open them
when the skill is ambiguous or before any judgment-call/ADR decision.

To delegate a pattern-following unit to a cheaper model, fill in
`.claude/skills/dx-doc-dev/references/delegation-brief.md` and dispatch it with the `Agent` tool.

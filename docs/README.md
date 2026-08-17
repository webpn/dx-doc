# Documentation

This tree (`docs/`) is the product and architecture record: ADRs, requirements, milestones, user stories, architecture views. It is heavily cross-referenced — a requirement points at the ADR that justifies it, a milestone points at the requirements it delivers, a user story points at both. Links used to be plain relative paths (`../../adr/0022-application-framework.md`), which meant every file rename or reorganisation required finding and hand-fixing every reference to it across the tree.

## Reference by stable ID, not by path

Every linkable thing in `docs/` has a stable ID that never changes even if the file moves or is renamed:

| ID form                     | Resolves to                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `ADR-0022`                  | `docs/adr/0022-*.md` (whole file)                                        |
| `REQ-IMP`                   | `docs/product/requirements/REQ-IMP.md` (whole file)                      |
| `REQ-IMP-003`               | the `### REQ-IMP-003 — ...` heading inside that file                     |
| `M1.2`                      | the `### M1.2 — ...` heading inside `docs/product/milestones.md`         |
| `US-ANL-01`                 | the `#### US-ANL-01 — ...` heading inside `docs/product/user-stories.md` |
| any other doc, e.g. `scope` | `docs/product/scope.md` — derived from the path (see below)              |

None of this is stored in a registry file. [`scripts/docs-links.mjs`](../scripts/docs-links.mjs) derives every ID by scanning filenames and headings each time it runs, so adding a new ADR or a new requirement row needs no bookkeeping — the ID exists as soon as the file or heading does.

**To write a cross-reference:** use the ID as the link text, with any href — the tooling rewrites the href for you:

```markdown
See [ADR-0022](x) for the framework decision.
[REQ-IMP-003](x) covers idempotent upsert.
Delivered in [M1.2](x).
```

Don't compute the relative path by hand. After editing, run:

```bash
npm run docs:sync-links
```

This rewrites every ID-tagged link to the correct current relative path (and adds a precise heading anchor where one exists, e.g. `REQ-IMP.md#req-imp-003--idempotent-upsert-keyed-on-custom_id` instead of just `REQ-IMP.md`). It is idempotent — safe to run any time, changes nothing if links are already correct.

`npm run docs:check-links` runs the same resolution in read-only mode and fails if anything is stale or unresolvable. It runs in CI on every PR.

### Descriptive links (no ID in the visible text)

A link whose text isn't an ID, e.g. `[functional specification](product/functional-specification.md)`, is only checked (target must exist) — it is not auto-fixed on move. To make one auto-fixable, tag it with the target's ID in the link title:

```markdown
[functional specification](x 'ref:functional-specification')
```

### Generic (non-ADR/REQ/M/US) doc IDs

For files that aren't an ADR, a requirement, a milestone, or a user story, the ID is derived from the path relative to `docs/`, with the `product/` prefix dropped (it's the default namespace) and `/README` collapsed to the parent directory:

- `docs/product/scope.md` → `scope`
- `docs/product/requirements/README.md` → `requirements`
- `docs/decisions/README.md` → `decisions`
- `docs/architecture/containers.md` → `architecture-containers`
- `docs/testing/strategy.md` → `testing-strategy`

### Scope

The ID system covers `docs/**/*.md` only. The root-level guide docs (`AGENTS.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, etc.) are flat and single-directory, so plain relative links between them don't suffer the same fragility and are left as-is. A link from inside `docs/` to one of those files is still validated (target must exist) but not ID-resolved.

## Finding what exists: docs/INDEX.md

[`INDEX.md`](INDEX.md) is a generated map of every ID in `docs/` — one line per ADR, requirement, milestone and user story, with its title and a link to where it lives. It carries no content, acceptance criteria, or status, only location — reading it is a fast way to answer "what exists, and in which file" without opening every file in the tree.

It's generated from the same scan `docs-links.mjs` uses, so it's never hand-maintained:

```bash
npm run docs:generate-index   # regenerate after adding/removing/renaming a doc
npm run docs:check-index      # verify it's current; runs in CI
```

## For AI coding agents

See [`AGENTS.md`](../AGENTS.md) — the short version is: start from `docs/INDEX.md` to see what exists, reference other docs by ID, then run `npm run docs:sync-links` (and `docs:generate-index` if you added/removed a doc or heading-level ID) instead of grepping the tree to fix paths by hand.

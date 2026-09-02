---
name: dx-doc-dev
description: Condensed dx-doc engineering rules (architecture boundaries, prohibited practices, validation, style, workflow). Load once at the start of dx-doc work as a fast-path instead of re-reading AGENTS.md/AI_DEVELOPMENT_GUIDE.md/ENGINEERING_GUIDE.md/STYLE_GUIDE.md from scratch. Those four docs remain authoritative — open them when this skill is ambiguous, when you need rationale/examples, or before any judgment-call/ADR decision.
---

# dx-doc Development Reference (condensed)

Source of truth: `AGENTS.md`, `AI_DEVELOPMENT_GUIDE.md`, `ENGINEERING_GUIDE.md`, `STYLE_GUIDE.md`. This
skill restates their non-negotiable content as checklists. If a rule here seems to conflict with a
source doc, the source doc wins — go read it.

## 1. Architecture boundaries (non-negotiable — never bypass "to make it easier")

| Layer / concern | Rule |
|---|---|
| `src/domain/`, `src/application/` | Pure TypeScript. No `react`/`react-dom`/any UI lib. No infrastructure imports — use port interfaces in `src/application/ports/`. |
| Fastify routes | Transport only: HTTP in → application-service call → HTTP out. Business rules live in domain/application (REQ-FDN-010, ADR-0007) so the MCP server also gets them. |
| Design system | Import only via `@project/design-system`. Never reach into a shadcn/ui component's own path. Never restyle a shadcn/ui component "to taste" — divergence from upstream must be deliberate and reviewed (ADR-0011). |
| Data fetching | React components never call `fetch`/`axios` directly. Go through `src/infrastructure/api-client/`; server state owned by TanStack Query — every read a query, every write a mutation that invalidates what it affects (ADR-0012). Never hand-copy server data into client state. |
| Multi-tenancy | Every query/command scoped to company (from the authenticated session, never request params) and project. No cross-project references — an entity only references entities in its own project. |
| Draft vs. published | All edits accumulate in one draft stream per project. Publish = immutable snapshot. No branches, no merge workflows. |
| Identifiers | Internal IDs are separate from name/slug and never change. Scheme must support stable IRIs from R0 even though IRIs are deferred. |
| General | No circular deps (enforced via `eslint-plugin-import`). No module-level mutable state. DI is explicit (constructor/params/composition) — no service locators/hidden globals. |

## 2. Prohibited practices (hard stops)

- `any` without a comment justifying why `unknown` + narrowing doesn't work.
- A second mechanism where an approved one exists (state lib, HTTP client, date lib, pattern).
- Silently weakening tests, types, or lint rules to make something pass.
- Deleting/rewriting working code purely for style.
- Inventing business requirements not in `docs/product/functional-specification.md`.
- Turning an open decision (spec §21, or an ADR `status: proposed`) into a decided one without explicit authorization.
- Introducing a dependency without justification (§6) or upgrading one outside the task's scope.
- Massive multi-concern PRs — decompose (see §4).
- Claiming a validation command passed without having run it.

## 3. When uncertain

Stop. Present alternatives + trade-offs. Never make an arbitrary architectural call. If the decision is
significant, draft a proposed ADR instead of choosing. Spec-unclear → check
`docs/product/functional-specification.md` first, then ask rather than invent.

## 4. Workflow: plan and batch by layer, per sub-milestone

1. **Before implementation**, write a short plan decomposing the sub-milestone's work by layer —
   domain → application → infrastructure/API → UI — naming the batches you intend to make.
2. **Execute each layer as one coherent batch**, not a file-by-file read→validate→commit loop.
3. The **sub-milestone is the PR unit** ("one concern per PR" from `CONTRIBUTING.md` applies at this
   granularity — the batched layer work together is the one concern, not each entity/file inside it).
4. Inspect the existing codebase for the pattern before writing anything new; do not invent an
   alternative pattern when an approved one already exists.

## 5. Validation cadence

**The workstation cannot run the full gate, and CI is what closes it.** The Docker-backed parts — the
Playwright suite, and the S3/SMTP integration suites — need MinIO, an SMTP catcher and a browser
running at once, which this machine does not have the headroom for. Pretending otherwise is what makes
this section unsatisfiable, and an unsatisfiable rule gets resolved by claiming it was met.

- **During iteration** inside a sub-milestone: run narrower/faster checks at your discretion — typecheck
  or lint scoped to touched files, a targeted test subset. Not required to be the full suite.
- **Before the sub-milestone-closing commit**: run the locally-runnable gate, and it must pass with
  **zero errors** before that commit is made:
  ```bash
  npm run lockfile:check && npm run typecheck && npm run lint && npm run format:check && npm test
  ```
  `lockfile:check` runs first because it is instant and catches the one failure this workstation
  causes by existing: npm writes the **configured** registry into `resolved`, and this machine's
  `~/.npmrc` points at an internal mirror, so any `npm install` here leaves URLs no runner and no
  outside contributor can reach. Run `npm run lockfile:normalize` and include the lockfile in the
  commit. Never "fix" the resulting CI failure by changing the Node version — the error npm reports
  (`Exit handler never called!`) names neither the cause nor the file.
  A second, wider guard runs as `.git/hooks/pre-commit`: it aborts any commit whose staged tree
  contains an internal hostname or organisation name, and refuses to track `.npmrc`/`.env`. It is
  **deliberately not versioned** — its denylist of internal hosts would itself be the leak, which is
  why the tracked `lockfile:check` is allowlist-based instead (only `registry.npmjs.org` passes, so it
  names nothing internal). A fresh clone therefore has **no** hook and nothing says so; reinstall with
  `cp ~/.dxdoc-pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`.
  Do **not** set `S3_TEST_ENDPOINT` locally and do **not** run `npm run test:e2e` — without that
  variable the S3 suite skips itself by design (`s3-storage.test.ts`), which is the intended local
  degradation, not a gap to work around by starting Docker.
- **The closing commit is provisional until its CI run is green.** `.github/workflows/ci.yml` runs on
  every branch and is the authority for the full gate: the locally-skipped integration suites, the
  Playwright acceptance suite, the reference image build, and coverage. A sub-milestone is not closed on
  the strength of the local subset.
- Push the closing commit, then check the run before treating the sub-milestone as done:
  ```bash
  gh run watch                      # or: gh run view --log-failed
  ```
  A failed E2E leaves a downloadable trace — open it locally with `npx playwright show-trace <file>`.
- **Reading a CI failure needs no repo admin rights — read it through check-run annotations, not
  logs.** `gh run view --log-failed` needs a permission this workstation's account may not have; the
  step summary (`$GITHUB_STEP_SUMMARY`) renders in the web UI but comes back `null` from the API for
  Actions jobs. The E2E job instead turns its failure tail and Playwright's aria page-snapshot
  (`error-context.md`) into `::error title=...::` workflow commands, which GitHub attaches to the
  check-run as annotations — and annotations *are* public through the API:
  ```bash
  gh api repos/webpn/dx-doc/check-runs/<check-run-id>/annotations
  ```
  Get `<check-run-id>` from `gh run view <run-id> --json jobs` (or the PR/commit checks UI). This is
  the primary loop for diagnosing a red run without touching the corporate network's constraints —
  only fall back to downloading the trace artifact when the annotation text isn't enough.
- **Never describe the local subset as "the full gate", and never claim any command passed without
  running it.** "Typecheck, lint, format and unit tests pass locally; CI has not run yet" is accurate.
  "The gate is green" before CI has reported is not. This project has twice closed work on verification
  that looked complete and was not (M1.10 assembly, M1.14 write integrity) — the same failure, one
  level up.
- **A green `npm test` summary is not proof every suite ran.** `vite.config.ts` documents a Vitest
  worker-startup timeout that aborts a file and reports the remainder as a pass. If the file count looks
  low, re-run the missing file on its own rather than trusting the total.
- Fold documentation obligations (§7) into the same closing commit rather than a separate pass.

## 6. Model tiering — route before you implement

Tiering means picking the right model per unit of delegated work: **sonnet for thinking, haiku for
execution.**

| Tier | Criteria | Route to |
|---|---|---|
| **Pattern-following** | An established pattern already exists elsewhere in the codebase and the new code should replicate it near-verbatim — a new entity's edit form mirroring an existing editor page, a new repository method mirroring a sibling, tests mirroring analogous existing tests, CRUD boilerplate. | `haiku`. **Name the exact existing file(s) to copy** — never let it infer the pattern from scratch. |
| **Judgment-required** | A new pattern, an architectural decision, an ambiguous/underspecified requirement, security-sensitive code, or anything AGENTS.md/AI_DEVELOPMENT_GUIDE.md says to "stop and present alternatives" for or create an ADR for. | `sonnet` (the session default) or `opus` for the highest-stakes calls. |

- Code volume/size is **not** a signal. A small but ambiguous or architecturally risky change stays on
  `sonnet`/`opus`.
- **Escalate** a Haiku task to `sonnet`/`opus` if: its output doesn't match the named pattern, it hits an
  architectural-boundary rule (§1), or the target has no clear existing pattern to copy. Never let Haiku
  guess past that point.
- Model tier changes nothing about review: architecture, domain-entity, and security-sensitive changes
  still require human review regardless of which model wrote them (`CONTRIBUTING.md`).

### Mechanism: pass `model` per `Agent` call — nothing to leave set

Dispatch tiered work with the `Agent` tool's `model` parameter, chosen per call:

- Pattern-following batch → `Agent({ prompt: "...", model: "haiku", ... })`. Name the exact file(s) to
  copy inside the prompt — see `references/delegation-brief.md` for the format that forces this.
- Judgment-required work → omit `model` (inherits the session default, `sonnet`) or pass `"opus"`
  explicitly for a specific highest-stakes call.

There is no shared state to restore afterward: each call carries its own `model`, so a Haiku-tier batch
and a Sonnet-tier call can run back to back without one leaking into the other.

## 7. Documentation obligations (fold into the closing commit)

- Update relevant docs in the same commit/PR as the behavior/architecture change.
- Architectural rule changed → update `ARCHITECTURE.md`. New pattern introduced → update
  `ENGINEERING_GUIDE.md`. Domain entity changed → update `docs/product/glossary.md`.
- Link the PR to the relevant ADR, or create one (proposed, if the decision was open).
- `REQ-*.md` status rows need Issue/PR links.
- Cross-references between `docs/` files use stable IDs (`ADR-0022`, `REQ-IMP-003`, `M1.2`, `US-ANL-01`)
  as link text — never hand-computed relative paths. Run `npm run docs:sync-links` after editing.

## 8. Style essentials

| Element | Convention | Example |
|---|---|---|
| Component files | PascalCase | `TrackingDetail.tsx` |
| Non-component files | kebab-case | `property-service.ts` |
| Hooks | camelCase, `use` prefix, single responsibility | `useTrackingForm` |
| Types/branded IDs | PascalCase, `Id` suffix | `ProjectId` |
| Domain errors | PascalCase, `Error` suffix, `{ _tag, message, ...fields }` | `PropertyNameNotUniqueError` |
| DB tables | snake_case, plural | `data_layer_properties` |
| API endpoints | kebab-case | `/projects/:id/data-layer-properties` |

- Prefer literal unions over enums. Discriminated unions for state/variant data.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals/Parameters` are all on — don't defeat them.
- Domain errors: `Result<T, E>`, never throw for expected/business-rule failures. Unexpected errors
  throw and are caught by boundaries/global handlers.
- Function components only; business logic out of presentational components; effects only for
  external-system sync, never derived data.
- One exported component per file; barrels (`index.ts`) list exports explicitly, no `export *`.
- Accessibility is a functional requirement checked in review (no CI gate): semantic HTML, full keyboard
  operability, managed focus, accessible names, WCAG AA contrast, live regions for dynamic content.
- Security: no secrets in-repo; validate all external input at the API boundary with a runtime validator
  (e.g. Zod) even though types exist; parameterized queries; sanitize user Markdown/output; auth on every
  endpoint except health checks and shared-password project views; authorization at API middleware, not
  just UI.

## 9. Dependency policy (before adding anything)

Necessary (stdlib/platform can't do it) · actively maintained · license-compatible (MIT-compatible) ·
complexity proportional to value · no security/supply-chain red flags · stable API (avoid 0.x for
foundational use) · doesn't duplicate an existing capability. Document the rationale in the PR
description. Never add "because the agent prefers it." Upgrades are their own PR, not bundled with
feature work.

## 10. Pre-work quick checklist

1. This skill covers it? If ambiguous, open the relevant source doc(s) (§ above) or `ARCHITECTURE.md`.
2. Skim `docs/INDEX.md` and `docs/adr/` for anything touching an existing decision in scope.
3. Inspect the existing code in the target layer for the pattern to follow.
4. Classify each unit of work Haiku vs. Sonnet/Opus (§6) before assigning it.
5. Write the layer-batch plan for the sub-milestone (§4) before touching files.
6. Iterate with narrow checks; run the full gate only at the sub-milestone-closing commit (§5).
7. Fold docs/ADR/`docs:sync-links` updates into that same closing commit (§7).
8. For a pattern-following unit you're delegating, fill `references/delegation-brief.md` before
   dispatching it (§11).

## 11. Research and large-output tooling

- Route open-ended searches ("where is X", "which files reference Y", multi-file navigation) through the
  `Explore` subagent instead of ad hoc `Glob`/`Grep`/`Read` in the main session — it's read-only and
  keeps large intermediate results out of the primary context.
- Route large command output (a full `npm test`/lint log, a big file dump, a CI annotations payload)
  through `mcp__headroom__headroom_compress` before reasoning over it, and
  `mcp__headroom__headroom_retrieve` only when the full text is actually needed.
- For a delegated pattern-following unit (§6), use `references/delegation-brief.md` as the prompt
  template — it forces every field a Haiku-tier call would otherwise have to invent.

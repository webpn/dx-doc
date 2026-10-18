# Apply Progress: auto-managed-slugs

- Attempt token: sha256:23ce582f04e12a5eb20ba437374446d52f4ff9ed38e0a20dab4547372a3c05b5
- Mode: Strict TDD (vitest via `npm test`)
- Delivery: single PR with maintainer-approved size:exception (review budget 800)
- Scope note: Phase 5 aligns the `src/app` frontend (project/page slug fields, payloads, displays, i18n keys removed; company/tracking/flow/free-page slugs untouched) — it talks through its own client types with mocked tests; backend input rejection is enforced in the shared layer for every entry point.
- Extra scope beyond tasks.md (required for green gates): slug-free fixture alignment in `src/api/access.test.ts`, `src/api/composition-root.test.ts`, `src/api/mcp/*`, `tests/integration/tracking-service.test.ts`, and port-signature alignment of fakes in `asset-service.test.ts` / `grant-service.test.ts`.

## Completed Tasks

- [x] 1.1 RED: `src/domain/slug.test.ts` (unicode, empty→`untitled`, truncate 120, suffix numbering)
- [x] 1.2 GREEN: `src/domain/slug.ts` (`slugify` + `resolveUniqueSlug`); exported from `src/domain/index.ts`
- [x] 2.1 RED: `validate.test.ts` rejects `slug` in project/page create+update, accepts company slug
- [x] 2.2 GREEN: `schemas.ts` project/page `slug: z.never()` reject field; company untouched
- [x] 2.3 RED: project/page service tests (generate on create, collision suffix, parent scoping, rename regenerates, self-hit keeps, no-rename keeps, upsert regenerates, slug-free returns, fixtures drop `slug`)
- [x] 2.4 GREEN: project/page services with `slugify`/`resolveUniqueSlug` loop via `getBySlug` (self-hit excluded)
- [x] 3.1 Ports: slug-free records; `create`/`update` take slug arg; `get…By…Slug` stays internal-only
- [x] 3.2 SQLite adapters: mappers strip slug, writes use slug arg (omitted slug leaves column untouched)
- [x] 3.3 Routes verified unchanged (UUID-addressed; `access`, `composition-root`, `mcp` suites green)
- [x] 4.1 Fixtures: sqlite repository tests + resources tests (UUID-only assertions, slug-rejection cases)
- [x] 4.2 Docs: REQ-FDN-003 + ADR-0004 reworded to system-generated
- [x] 4.3 Gates: typecheck pass, lint 0 errors, `npm test` 84 files / 624 passed; format:check clean on all touched files (4 pre-existing openspec table-padding warnings in proposal/design/exploration/tasks predate this phase — orchestrator-owned, left untouched)
- [x] 5.1 Inventory: `src/app` project/page slug touchpoints (2 client type files, 3 forms, 2 displays, 5 listed test files; queries slug-free; +4 fixture files added: page-tree-sidebar, tracking-create, free-page-create/editor/list tests)
- [x] 5.2 RED: slug-free payloads + no-slug-field assertions in project-create/page-create/page-editor/project-list tests (12 failures across 4 files, project-page fixture-only)
- [x] 5.3 GREEN: `slug` stripped from `src/app/api/projects.ts` + `src/app/api/pages.ts`, 3 forms (state/field/validation/payload), 2 displays (platform-only), `en.ts` project/page keys removed
- [x] 5.4 Grep-proof: target files zero-match; remaining `src/app` slug hits are company/tracking/flow/free-page only (+ absence-assertions in the new tests)
- [x] 5.5 Gates: typecheck pass, lint 0 errors, format:check clean, `npm test` 84 files / 625 passed

## TDD Cycle Evidence

| Task            | Test File                                          | Layer       | Safety Net        | RED                                                                                                   | GREEN                                   | TRIANGULATE                                                                                    | REFACTOR                                                                          |
| --------------- | -------------------------------------------------- | ----------- | ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1.1/1.2         | `src/domain/slug.test.ts`                          | Unit        | 52/52 baseline    | Import failure, no tests collected                                                                    | 8/8 pass                                | 8 cases (happy + unicode + empty + truncation + collapse + free + suffix + 120-fit)            | Import-order + async-callback lint fixes, tests still green                       |
| 2.1/2.2         | `src/application/validation/validate.test.ts`      | Unit        | 52/52 baseline    | 4 new failures (slug accepted / slug-less rejected)                                                   | 11/11 pass                              | 5 new cases (accept-without ×2, reject-create+update ×2, company-keeps)                        | None needed                                                                       |
| 2.3/2.4/3.1/3.2 | `project-service.test.ts` + `page-service.test.ts` | Unit        | 52/52 baseline    | 13 new-behavior failures + 2 stale-write collateral (fake signature shift, resolved by service GREEN) | 39/39 pass                              | 13 cases (generate, suffix, scoping, rename, self-hit, no-rename, upsert, slug-free ×2 suites) | `uniqueSlug` private helper extracted per service; conditional slug arg on update |
| 3.3             | `src/api/*` suites                                 | Integration | N/A (verify-only) | N/A                                                                                                   | 28/28 (access + composition-root + mcp) | N/A — no production change                                                                     | None                                                                              |
| 4.1             | sqlite repo tests + resources tests                | Integration | N/A (fixtures)    | Typecheck errors on old shape                                                                         | All green in full suite                 | UUID-only + slug-reject cases added                                                            | None                                                                              |
| 5.2/5.3         | 5 shell suites + page/tree/tracking/free fixtures  | Integration | 21/21 baseline    | 12 failures (slug still required/sent/rendered)                                                       | 48/48 pass                              | 6+ cases (slug-free create ×2, no-field ×3, slug-free update payload, platform-only display)   | None needed — pure deletion to the server-generated shape                         |

## Test Summary

- Total tests written: 26 new (8 domain + 5 validation + 7 project + 6 page) plus 3 new persistence/API cases (slug-untouched update, 2 slug-rejection API cases) plus Phase 5 net +1 (3 no-slug absence/payload cases added, 1 empty-slug validation case replaced)
- Full suite: 84 files passed, 625 tests passed, 6 skipped, 0 failed
- Layers used: Unit + Integration (vitest); E2E unavailable per config
- Approval tests: none — no pure refactoring tasks
- Pure functions created: 2 (`slugify`, `resolveUniqueSlug`)

## Work Unit Evidence

| Unit                                   | Commit               | Focused test command + result                                        | Runtime harness + result                                                                                                                  | Rollback boundary                                                                               |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Domain slug helpers                    | `feat(domain)`       | `npx vitest run src/domain/slug.test.ts` → 8/8                       | N/A — pure functions, no runtime boundary                                                                                                 | Revert commit; `src/domain/slug.*` + index export only                                          |
| Shared validation reject               | `feat(validation)`   | `npx vitest run src/application/validation/validate.test.ts` → 11/11 | N/A — schema-level; API/MCP enforce via shared layer (proven by resources 400-cases)                                                      | Revert commit; `schemas.ts` + `validate.test.ts` only                                           |
| Services + ports + adapters + fixtures | `feat(project,page)` | service suites → 39/39; sqlite suites green                          | `npx vitest run src/api/access.test.ts src/api/composition-root.test.ts src/api/mcp/routes.test.ts` → 28/28 against real Fastify + SQLite | Revert commit; single PR, no migration to roll back                                             |
| Client slug removal (Phase 5)          | pending (this batch) | 9 shell suites → 48/48 (12 RED failures before GREEN)                | N/A — no runtime process; verification via vitest + gates (typecheck, lint 0 errors, format clean, full `npm test` 625 passed)            | Revert commit; `src/app/api/*`, 5 shell screens, `en.ts` project/page keys, shell fixtures only |
| Docs + lint/format fixes               | pending (this batch) | Full `npm test` → 624 passed                                         | Same as above                                                                                                                             | Revert commit; docs + formatting only                                                           |

## Deviations from Design

- MCP `create_page` tool schema updated (slug property dropped, no longer required): the design mandates shared-layer rejection for every entry point, and the advertised required `slug` would make every MCP page create fail validation. Handler needed no change (straight pass-through).
- Fixture alignment beyond tasks.md's named files (access, composition-root, MCP test, tracking-service integration, asset/grant fakes): required for `typecheck` + `npm test` to pass; all shallow drops of `slug` from project/page inputs.
- `updateProject`/`updatePage` take `slug?: string` as second parameter (omitted = leave column untouched) rather than a separate options object: smallest signature delta, preserves positional `expectedUpdatedAt` at the end.
- Phase 5 fixture scope: stale project/page `slug` keys also dropped from `page-tree-sidebar.test.tsx`, `tracking-create-page.test.tsx`, `free-page-create-page.test.tsx`, `free-page-editor-page.test.tsx`, `free-page-list-page.test.tsx` (untyped `as unknown` mock literals; key removal only, no behavior change) so the 5.4 grep-proof holds; tracking/flow/free-page/company slug UI untouched.

## Issues Found

- `format:check` fails on 4 orchestrator-owned openspec files (table padding) that predate this phase; all files touched by apply are prettier-clean. Left untouched — orchestrator decision.
- Frontend (`src/app`) project/page slug fields removed in Phase 5 (this batch); those writes no longer send `slug` and the server generates it. Company/tracking/flow/free-page slug UI unchanged by design.
- Phase 5 diff: 17 `src/app` files + `en.ts`, 41 insertions / 106 deletions (net −65; deletions-only shape change, no new logic).

## Workload / PR Boundary

- Mode: single PR with size:exception (maintainer-approved for this run)
- Boundary: all 17 tasks (Phases 1–5), one deliverable scope, verification included
- Estimated review budget impact: Phase 5 adds ~220 lines of churn (mostly deletions); counted total now within the approved size:exception — review Phases 1–4 and 5 separately

## Phase 6 Remediation: docs-wording assertion (verify FAIL follow-up)

- Task: spec scenario "Docs state system-generated" had no automated covering test (verify-report PARTIAL). No product behavior touched.
- Completed: 6.1 (RED→GREEN `tests/docs-system-generated-slugs.test.ts`, 5 tests), 6.2 (four gates green: typecheck 0, lint 0 errors, format:check clean, `npm test` 85 files / 630 passed / 6 skipped).
- Scope note: no ledger operations — orchestrator decision: native attempt ledger cannot be settled in this repo state; progress recorded here only.

### TDD Cycle Evidence (Phase 6)

| Task | Test File                                   | Layer | RED                                                                                                                                                                                                                         | GREEN    | TRIANGULATE                                                                      | REFACTOR    |
| ---- | ------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ----------- |
| 6.1  | `tests/docs-system-generated-slugs.test.ts` | Unit  | Pre-change phrasing assertion failed as expected; first negative draft failed against current "never user-supplied" wording (design flaw caught); revised negation-aware negative failed on injected affirmative regression | 5/5 pass | 5 cases (positive wording ×2, negative instruction ×2, company-exception pin ×1) | None needed |

### Phase 6 Design Notes

- Positive assertions anchor on the actual reworded phrases from commit `5f3e8b9`: REQ-FDN-003 `system-generated from the name`, ADR-0004 `system-generated server-side`, plus `regenerated on rename` in both. No whole-file snapshots.
- Negative assertions flag only _affirmative_ user-supplied instructions: sentences matching user-supplied (or supplied/provided-by-user/client variants) without a negation (`never`/`not`/`no longer`/`n't`), excluding company sentences so the company slug exception cannot trip them. The exception itself is pinned (`company slug remains user-supplied`).
- Pre-change wording (commit `5f3e8b9^`: REQ listed `slug` among carried fields, ADR had no project/page slug-source statement) carries no affirmative token, so the negative targets genuine future regressions; a full revert is caught by the positives.

### Work Unit Evidence (Phase 6)

| Unit                   | Focused test command + result                                                         | Runtime harness + result                                 | Rollback boundary                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Docs-wording assertion | `npx vitest run tests/docs-system-generated-slugs.test.ts` → 5/5 (RED steps observed) | N/A — file-wording assertion, no runtime boundary exists | Revert commit; `tests/docs-system-generated-slugs.test.ts` + Phase 6 task/progress entries only |

# Apply Progress: auto-managed-slugs

- Attempt token: sha256:23ce582f04e12a5eb20ba437374446d52f4ff9ed38e0a20dab4547372a3c05b5
- Mode: Strict TDD (vitest via `npm test`)
- Delivery: single PR with maintainer-approved size:exception (review budget 800)
- Scope note: `src/app` frontend untouched — it talks through its own client types with mocked tests; backend input rejection is enforced in the shared layer for every entry point.
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

## TDD Cycle Evidence

| Task            | Test File                                          | Layer       | Safety Net        | RED                                                                                                   | GREEN                                   | TRIANGULATE                                                                                    | REFACTOR                                                                          |
| --------------- | -------------------------------------------------- | ----------- | ----------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1.1/1.2         | `src/domain/slug.test.ts`                          | Unit        | 52/52 baseline    | Import failure, no tests collected                                                                    | 8/8 pass                                | 8 cases (happy + unicode + empty + truncation + collapse + free + suffix + 120-fit)            | Import-order + async-callback lint fixes, tests still green                       |
| 2.1/2.2         | `src/application/validation/validate.test.ts`      | Unit        | 52/52 baseline    | 4 new failures (slug accepted / slug-less rejected)                                                   | 11/11 pass                              | 5 new cases (accept-without ×2, reject-create+update ×2, company-keeps)                        | None needed                                                                       |
| 2.3/2.4/3.1/3.2 | `project-service.test.ts` + `page-service.test.ts` | Unit        | 52/52 baseline    | 13 new-behavior failures + 2 stale-write collateral (fake signature shift, resolved by service GREEN) | 39/39 pass                              | 13 cases (generate, suffix, scoping, rename, self-hit, no-rename, upsert, slug-free ×2 suites) | `uniqueSlug` private helper extracted per service; conditional slug arg on update |
| 3.3             | `src/api/*` suites                                 | Integration | N/A (verify-only) | N/A                                                                                                   | 28/28 (access + composition-root + mcp) | N/A — no production change                                                                     | None                                                                              |
| 4.1             | sqlite repo tests + resources tests                | Integration | N/A (fixtures)    | Typecheck errors on old shape                                                                         | All green in full suite                 | UUID-only + slug-reject cases added                                                            | None                                                                              |

## Test Summary

- Total tests written: 26 new (8 domain + 5 validation + 7 project + 6 page) plus 3 new persistence/API cases (slug-untouched update, 2 slug-rejection API cases)
- Full suite: 84 files passed, 624 tests passed, 6 skipped, 0 failed
- Layers used: Unit + Integration (vitest); E2E unavailable per config
- Approval tests: none — no pure refactoring tasks
- Pure functions created: 2 (`slugify`, `resolveUniqueSlug`)

## Work Unit Evidence

| Unit                                   | Commit               | Focused test command + result                                        | Runtime harness + result                                                                                                                  | Rollback boundary                                      |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Domain slug helpers                    | `feat(domain)`       | `npx vitest run src/domain/slug.test.ts` → 8/8                       | N/A — pure functions, no runtime boundary                                                                                                 | Revert commit; `src/domain/slug.*` + index export only |
| Shared validation reject               | `feat(validation)`   | `npx vitest run src/application/validation/validate.test.ts` → 11/11 | N/A — schema-level; API/MCP enforce via shared layer (proven by resources 400-cases)                                                      | Revert commit; `schemas.ts` + `validate.test.ts` only  |
| Services + ports + adapters + fixtures | `feat(project,page)` | service suites → 39/39; sqlite suites green                          | `npx vitest run src/api/access.test.ts src/api/composition-root.test.ts src/api/mcp/routes.test.ts` → 28/28 against real Fastify + SQLite | Revert commit; single PR, no migration to roll back    |
| Docs + lint/format fixes               | pending (this batch) | Full `npm test` → 624 passed                                         | Same as above                                                                                                                             | Revert commit; docs + formatting only                  |

## Deviations from Design

- MCP `create_page` tool schema updated (slug property dropped, no longer required): the design mandates shared-layer rejection for every entry point, and the advertised required `slug` would make every MCP page create fail validation. Handler needed no change (straight pass-through).
- Fixture alignment beyond tasks.md's named files (access, composition-root, MCP test, tracking-service integration, asset/grant fakes): required for `typecheck` + `npm test` to pass; all shallow drops of `slug` from project/page inputs.
- `updateProject`/`updatePage` take `slug?: string` as second parameter (omitted = leave column untouched) rather than a separate options object: smallest signature delta, preserves positional `expectedUpdatedAt` at the end.

## Issues Found

- `format:check` fails on 4 orchestrator-owned openspec files (table padding) that predate this phase; all files touched by apply are prettier-clean. Left untouched — orchestrator decision.
- Frontend (`src/app`) still renders project/page slug fields and sends them; those writes now fail validation with a uniform issue. Frontend alignment is a separate change (not in tasks.md).

## Workload / PR Boundary

- Mode: single PR with size:exception (maintainer-approved for this run)
- Boundary: all 12 tasks, one deliverable scope, verification included
- Estimated review budget impact: within the ~660-line forecast; final count reported in result

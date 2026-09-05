# Tasks: auto-managed-slugs

## Review Workload Forecast

| Field                   | Value                         |
| ----------------------- | ----------------------------- |
| Estimated changed lines | ~1,100                        |
| 400-line budget risk    | High                          |
| Chained PRs recommended | No                            |
| Suggested split         | Single PR with size:exception |
| Delivery strategy       | single-pr                     |
| Chain strategy          | size-exception                |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Client delta ~220 → ~1,100 vs 800 budget (+300 over; size:exception holds; review 1–4 and 5 separately).

### Suggested Work Units

| Unit | Goal                                              | Likely PR                  | Focused test command | Runtime harness                                           | Rollback boundary                           |
| ---- | ------------------------------------------------- | -------------------------- | -------------------- | --------------------------------------------------------- | ------------------------------------------- |
| 1    | System-generated UUID-only slugs for project/page | Single PR (size:exception) | `npm test`           | N/A — no runtime process; verification via vitest + gates | Revert single PR; no migration to roll back |

## Phase 1: Foundation (domain helper)

- [x] 1.1 RED: add failing `src/domain/slug.test.ts` for `slugify` (unicode, empty→`untitled`, truncate 120) and `resolveUniqueSlug` suffix numbering
- [x] 1.2 GREEN: create `src/domain/slug.ts` with `slugify` + `resolveUniqueSlug` to pass 1.1; Test-first: `npx vitest run src/domain/slug.test.ts`

## Phase 2: Core (schemas + services)

- [x] 2.1 RED: extend `src/application/validation/validate.test.ts` to reject `slug` in project/page create+update, accept company slug; Test-first: `npx vitest run src/application/validation/validate.test.ts`
- [x] 2.2 GREEN: modify `src/application/validation/schemas.ts` (project/page `slug: z.never()`, company untouched) to pass 2.1
- [x] 2.3 RED: extend `src/application/project/project-service.test.ts` + `src/application/page/page-service.test.ts` (generate on create, collision suffix, parent scoping, rename regenerates, no-rename keeps, upsert regenerates, slug-free returns, fixtures drop `slug`)
- [x] 2.4 GREEN: modify `src/application/project/project-service.ts` + `src/application/page/page-service.ts` with `slugify`/`resolveUniqueSlug` loop via `getBySlug` to pass 2.3

## Phase 3: Integration (ports + adapters)

- [x] 3.1 Modify `src/application/ports/project-repository.ts` + `src/application/ports/page-repository.ts` (slug-free records; `create`/`update` take slug arg; `get…By…Slug` stays internal-only); Test-first: service tests in 2.3 fail until done
- [x] 3.2 Modify `src/infrastructure/persistence/sqlite-project-repository.ts` + `src/infrastructure/persistence/sqlite-page-repository.ts` (mappers strip slug, writes use slug arg); Test-first: `npx vitest run src/infrastructure/persistence`
- [x] 3.3 Verify `src/api/projects/routes.ts` + `src/api/pages/routes.ts` need no changes (UUID-addressed); Test-first: `npx vitest run src/api` resources show no `slug`

## Phase 4: Verification + docs

- [x] 4.1 Update `sqlite-*-repository.test.ts` + `resources.test.ts` fixtures (drop `slug`, assert UUID-only responses, live-only collision check); Test-first: `npm test`
- [x] 4.2 Reword `docs/product/requirements/REQ-FDN.md` (REQ-FDN-003) + `docs/adr/0004-immutable-internal-identifiers.md` to system-generated; Test-first: manual read asserts wording
- [x] 4.3 Run gates `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`; all MUST pass

## Phase 5: Client alignment (project/page slug removal)

- [x] 5.1 Inventory `src/app` forms, client functions, types, and tests touching project/page `slug` (company/tracking/flow/free-page slugs excluded)
- [x] 5.2 RED: extend `src/app/shell/project-create-page.test.tsx` + `src/app/shell/page-create-page.test.tsx` + `src/app/shell/page-editor-page.test.tsx` + `src/app/shell/project-list-page.test.tsx` for slug-free payloads, no slug field/validation/display; Test-first: `npx vitest run src/app/shell`
- [x] 5.3 GREEN: strip `slug` from `src/app/api/projects.ts` + `src/app/api/pages.ts` (records/inputs), `src/app/shell/project-create-page.tsx` + `src/app/shell/page-create-page.tsx` + `src/app/shell/page-editor-page.tsx` (state/field/payload), `src/app/shell/project-list-page.tsx` + `src/app/shell/project-page.tsx`, `src/app/i18n/messages/en.ts` (project/page keys) to pass 5.2
- [x] 5.4 Grep-proof: `rg -n slug src/app/api src/app/shell` shows project/page slug-free (company keys only)
- [x] 5.5 Run gates `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`; all MUST pass

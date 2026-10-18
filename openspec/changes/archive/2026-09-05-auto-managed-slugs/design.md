# Design: auto-managed-slugs

## Technical Approach

Slugs become server-generated while UUID addressing stays untouched (routes already use `:id`). A pure `src/domain/slug.ts` helper derives the base slug from the name; each service runs a scoped collision-suffix loop over the existing internal `get…By…Slug` lookups, with DB unique constraints as the race backstop. `slug` leaves project/page Zod inputs (reject-if-present in the shared layer), port records, and API responses; DB columns stay internal-only with no migration. Company slug is unchanged.

## Architecture Decisions

| Option                                             | Tradeoff                                                                                   | Decision                                                                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slugify` in `src/domain/` vs per-service inline   | Inline drifts; domain keeps it pure, dependency-free, reusable for future REQ-DOM entities | New `src/domain/slug.ts`: `slugify(name)` + `resolveUniqueSlug(base, exists)`; services supply scope via callback                                   |
| Reject `slug` via `z.never()` vs `.strict()`       | `.strict()` would newly reject all unknown keys; targeted field rejects only `slug`        | `slug: z.never({ message })` (optional) on project/page create schemas; `.partial()` updates inherit it; shared `slug` rule stays for company       |
| Loop as shared helper vs inline                    | Inline duplicates retry logic                                                              | `resolveUniqueSlug` takes `exists(slug)`; project scopes by `companyId`, page by `projectId`                                                        |
| Strip `slug` from port records vs at serialization | Spec REQUIRES slug-free records and repository shapes                                      | Drop `slug` from `ProjectRecord`/`PageRecord`; pass slug as a separate arg on existing `create`/`update` (signatures change, method count does not) |
| New ADR vs amend ADR-0004                          | New file costs budget and reopens a closed decision                                        | No new ADR; reword ADR-0004 + REQ-FDN-003 to "system-generated" in the same PR                                                                      |
| New `duplicate_slug` kind vs constraint backstop   | New kind is nicer but widens scope                                                         | Keep backstop as-is; the loop prevents the common case                                                                                              |

## Data Flow

Create: `validate (rejects slug) → slugify(name) → resolveUniqueSlug (live-only checks) → repo.create(record, slug)`. Rename regenerates (self-hit keeps slug); non-rename updates skip; custom-id upsert regenerates from the new name.

```
validate() ──slug present──→ 400 validation issue (HTTP, MCP, direct calls)
   ▼
slugify(name) → resolveUniqueSlug(base, exists via getBySlug)
   │ hit → base-2, base-3… (race → UNIQUE constraint backstop)
   ▼
repo.create/update(record, slug) → UUID-only response
```

## File Changes

| File                                                    | Action | Description                                                                                                     |
| ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `src/domain/slug.ts` (+ `slug.test.ts`)                 | Create | `slugify` + `resolveUniqueSlug` pure helpers and tests                                                          |
| `src/application/validation/schemas.ts`                 | Modify | Drop `slug` from project/page schemas; add `z.never()` reject field; company untouched                          |
| `src/application/project/project-service.ts`            | Modify | Generate on create, regenerate on rename, upsert regenerates; slug-free returns                                 |
| `src/application/page/page-service.ts`                  | Modify | Same, scoped to `projectId`                                                                                     |
| `src/application/ports/project-repository.ts`           | Modify | Slug-free record; `create`/`update` take slug arg; `getProjectByCompanyAndSlug` stays, returns slug-free record |
| `src/application/ports/page-repository.ts`              | Modify | Same as project port                                                                                            |
| `src/infrastructure/persistence/sqlite-*-repository.ts` | Modify | Mappers strip slug from returns; writes use slug arg for the internal column                                    |
| `REQ-FDN.md`, `0004-*.md`                               | Modify | Reword REQ-FDN-003 + ADR-0004 to system-generated                                                               |

Routes need no changes (UUID-addressed; responses follow service records). `freePage`/`tracking`/`flow` slugs are out of scope.

## Interfaces / Contracts

```ts
slugify(name: string): string; // NFKD → strip diacritics → lowercase → non-alnum→hyphen → collapse/trim → truncate 120 → fallback "untitled"
resolveUniqueSlug(base: string, exists: (slug: string) => Promise<unknown>): Promise<string>; // base, base-2…; reserves suffix room within 120
// schemas.ts: slug: z.never({ message: 'slug is system-generated and must not be supplied' }).optional()
```

Edge cases: empty/unicode-only input → `"untitled"`; `"Café Münchén"` → `cafe-munchen`; over-long bases truncate so `base-N` fits 120; rename self-hit keeps the slug.

## Testing Strategy

| Layer       | What to Test                                                                                                     | Approach                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Unit        | `slugify` (unicode, empty→`untitled`, truncation); suffix numbering                                              | New `src/domain/slug.test.ts`                                                   |
| Unit        | Reject-if-present on project/page create+update; company still accepts slug                                      | Extend `validate.test.ts` / service tests                                       |
| Unit        | Generate on create, suffix on collision, parent scoping, rename regenerates, no-rename keeps, upsert regenerates | Extend `project-service.test.ts`, `page-service.test.ts` (fixtures drop `slug`) |
| Integration | Live-only check via `getBySlug`; responses carry no `slug`; UUID routes unchanged                                | Extend `sqlite-*-repository.test.ts`, `resources.test.ts`                       |
| Gates       | `typecheck`, `lint`, `format:check`, `npm test`                                                                  | All must pass per spec                                                          |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. No URL or redirect logic is added.

## Migration / Rollout

No migration required. Columns and constraints are unchanged; existing slugs are already valid system slugs. Single-PR revert restores input/record/response shapes.

## Open Questions

None — product decisions were fixed at proposal review (regenerate without redirect, UUID-only shapes, company exception).

## Line-Count Forecast (budget: 800)

| Area                                | Est. lines               |
| ----------------------------------- | ------------------------ |
| `src/domain/slug.ts` + test         | ~90                      |
| Schemas + services + loop wiring    | ~150                     |
| Ports + SQLite adapters             | ~80                      |
| Test churn (fixtures, suites above) | ~300                     |
| Docs (REQ-FDN-003, ADR-0004)        | ~40                      |
| **Total**                           | **~660 — within budget** |

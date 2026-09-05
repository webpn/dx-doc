## Exploration: auto-managed slugs (UUIDs as identifiers, company slug excepted)

Branch verified: `main` (the init artifact's claim of `main` is correct; no `r1` branch is checked out).
Repo root verified: `/Users/stefanotoffolo/websites/dx-doc`.

### Current State

**Slug inventory: exactly 3 entities carry a slug today — company, project, page.**
There are no trackings, flows, modules, or properties tables yet; those are future
REQ-DOM entities with no code or migrations behind them. Any rule established now
becomes the going-forward convention for them.

| Entity  | DB column + constraint (`db/migrations/001_create_schema.ts`) | Zod schema (`src/application/validation/schemas.ts`)                                                            | Service write path                                                                                                    | REST lookup                                                                                     |
| ------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Company | `company.slug TEXT NOT NULL UNIQUE` (globally unique)         | `companyCreateSchema` — required `slug` (shared `slug` rule: lowercase-hyphen regex, max 120)                   | `CompanyService.createCompany` — manual `trim()` + empty check, no Zod, no update method at all                       | No company routes exist (`src/api/` has only auth, projects, pages routes)                      |
| Project | `projects.slug TEXT NOT NULL`, unique on `(company_id, slug)` | `projectCreateSchema` requires `slug`; `projectUpdateSchema` is `.partial()` so slug is user-editable on update | `ProjectService.create` / `.update` copy `data.slug` verbatim; custom_id upsert overwrites `existing.slug` from input | `POST /api/projects`, `GET/PATCH /api/projects/:id` — all addressed by UUID `:id`               |
| Page    | `pages.slug TEXT NOT NULL`, unique on `(project_id, slug)`    | `pageCreateSchema` requires `slug`; `pageUpdateSchema` `.partial()` (editable on update)                        | `PageService.create` / `.update` copy `data.slug` verbatim; custom_id upsert overwrites `existing.slug`               | `POST /api/projects/:projectId/pages`, `GET/PATCH /api/pages/:id` — all addressed by UUID `:id` |

**How slugs are created, edited, validated, uniquified today:**

- Creation: user supplies `slug` in the request body (required field). No derivation
  from `name` exists anywhere — ADR-0004 says the slug is "derived from the name"
  but no `slugify` helper exists in the codebase (verified by search).
- Editing: `PATCH` accepts a new `slug` via the partial update schemas; rename does
  not touch the slug automatically.
- Validation: single shared Zod `slug` rule (trim, min 1, max 120,
  `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), applied identically over HTTP and direct calls
  (REQ-FDN-010). Company creation bypasses Zod with a hand-rolled empty check.
- Uniquification: **none in application code.** Uniqueness is enforced solely by the
  three DB unique constraints, and there is no `duplicate_slug` error kind — a
  colliding slug surfaces as a raw DB constraint error, not a shaped validation
  issue (contrast `duplicate_custom_id`, which is handled). A generation strategy
  will need to decide collision handling from scratch.

**Current identifier story (UUIDs vs slugs):**

- UUIDs already are the canonical identifiers: `id` is the PK on every table,
  application-generated via `randomUUID()` (ADR-0004, REQ-FDN-004), and every REST
  route addresses entities by UUID (`:id`, `:projectId`). No FK references a slug.
- Slug-lookup repository methods (`getProjectByCompanyAndSlug`,
  `getPageByProjectAndSlug`) exist in the ports and SQLite adapters but have **no
  production callers** — they are exercised only by repository tests and service-test
  stubs. Slugs are written and returned but never used to resolve anything at
  runtime. There are no frontend forms at all (`src/app/App.tsx` is R0 scaffolding
  with a single static route), so no UI work exists to undo.
- API responses return full records including `slug` (e.g. `GET /api/projects/:id`
  returns the `ProjectRecord` with `slug`).

**Company exception (stays as-is):**

- `company.slug`: globally unique, user-supplied at creation through
  `CompanyService.createCompany({ name, slug })`, instance-admin only. There is no
  company update path and no company REST route, so "keeps its slug behavior" means:
  keep the required user-supplied slug on creation, keep the global unique
  constraint, keep returning it. The hand-rolled validation should preferably be
  migrated onto the shared Zod `slug` rule for consistency, without changing behavior.

### Affected Areas

- `src/application/validation/schemas.ts` — remove `slug` from project/page create + update schemas (keep shared rule for company, or move it to a company schema)
- `src/application/project/project-service.ts` — generate slug server-side on create; decide rename behavior on update/upsert
- `src/application/page/page-service.ts` — same as above
- `src/application/company/company-service.ts` — untouched behavior (possible Zod alignment)
- `src/application/ports/project-repository.ts`, `src/application/ports/page-repository.ts` — slug stays on records; slug-lookup methods stay or go (decision below)
- `src/infrastructure/persistence/*` — SQLite repositories, `db-schema.ts`; new migration only if columns change (approach-dependent)
- `src/api/projects/routes.ts`, `src/api/pages/routes.ts` — request shapes change (no `slug` in body); no URL changes (already UUID-based)
- Tests: `project-service.test.ts`, `page-service.test.ts`, `validate.test.ts`, `resources.test.ts`, `sqlite-*-repository.test.ts` — nearly all ~100 `slug` matches are test fixtures/inputs
- Docs: `docs/product/requirements/REQ-FDN.md` (REQ-FDN-003 "Projects carry name, slug"), `docs/adr/0004-immutable-internal-identifiers.md` (slug derived from name, mutable), functional specification §6.4

### Approaches

1. **Server-generated slug from name, collision-suffixed; slug removed from inputs, kept in storage and responses** — on create, `slugify(name)` + `-2`, `-3`… loop against the scoped lookup (the existing `get…By…Slug` methods finally get a production caller); slug omitted from update inputs entirely (frozen at creation) or regenerated on rename.
   - Pros: smallest blast radius — no migration (columns + constraints unchanged), ADR-0004 consequences still hold verbatim, human-friendly URLs/exports keep working, backfill unnecessary (existing slugs already valid)
   - Cons: requires a new slugify + uniqueness-loop helper owned by the application layer; rename-vs-freeze decision still needed
   - Effort: Medium

2. **Drop slug columns for project/page; UUID-only plus display name** — forward-only migration removing the columns (table rebuild per REQ-FDN-009/020), slug removed from records, responses, and lookups.
   - Pros: codebase matches the "prefer UUID" intent literally; no slug maintenance code ever again
   - Cons: largest blast radius — data migration, contradicts ADR-0004 consequences and REQ-FDN-003 text (both need updates), kills human-readable URL/export-path options the architecture explicitly reserved, all fixtures and repository layers churn
   - Effort: High

3. **Opaque auto slug decoupled from name (e.g. short random token)** — generation is trivially collision-free, never changes on rename.
   - Pros: no slugify edge cases (unicode names, empty results), stable by construction
   - Cons: slugs become unreadable noise, defeating their only purpose (human-friendly URLs/paths); worst of both worlds — keeps the column while destroying its value
   - Effort: Low

### Recommendation

Approach 1. It is the only option that removes the user-editable field without
invalidating ADR-0004, REQ-FDN-003/004, or the reserved human-friendly URL story,
and it needs no data migration: existing slugs are already valid system slugs.
The dead slug-lookup methods become the collision-check primitive for generation.
Freeze the slug at creation (do not regenerate on rename) unless product says
otherwise — frozen slugs are stable identifiers in practice and avoid breaking any
URL/export path that embeds them.

### Risks

- Slug collisions today raise raw DB errors (no `duplicate_slug` shaping); the new generation loop must handle check-then-insert races or keep relying on the constraint as backstop
- Rename behavior is unspecified: frozen slug vs regenerate-on-rename changes URL stability guarantees — product decision required
- Whether `slug` stays in API responses (read-only display) or is hidden affects API/MCP consumers — product decision required
- Whether to keep or remove the now-redundant slug-lookup port methods if generation moves elsewhere
- Test churn is broad but shallow: ~100 `slug` matches, mostly fixtures sending `slug` in create payloads
- Docs drift: REQ-FDN-003 ("Projects carry name, slug") and ADR-0004 ("slug derived from name") need wording updates to "system-generated"
- Future REQ-DOM entities (trackings, flows, modules, properties) must follow the same rule from birth; the delta spec should state the convention explicitly
- No migration needed under approach 1, but any approach-2-style column removal must use the create-copy-drop-rename rebuild (REQ-FDN-009, portable-subset REQ-FDN-020)

### Ready for Proposal

Yes, modulo two product decisions: (1) slug frozen at creation vs regenerated on
rename (recommended: frozen); (2) slug remains in API responses as read-only vs
removed entirely (recommended: keep as read-only). Everything else is engineering.

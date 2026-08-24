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

- **During iteration** inside a sub-milestone: run narrower/faster checks at your discretion — typecheck
  or lint scoped to touched files, a targeted test subset. Not required to be the full suite.
- **Before the sub-milestone-closing commit**: run the full gate and it must pass with **zero errors**
  before that commit is made:
  ```bash
  npm run typecheck && npm run lint && npm run format:check && npm test
  ```
- This changes *when* the gate is checked, not the bar. Never commit the closing commit without having
  actually run and verified the full suite green.
- Never claim any command passed without running it.
- Fold documentation obligations (§7) into the same closing commit rather than a separate pass.

## 6. Model tiering — route before you implement

| Tier | Criteria | Route to |
|---|---|---|
| **Pattern-following** | An established pattern already exists elsewhere in the codebase and the new code should replicate it near-verbatim — a new entity's edit form mirroring an existing editor page, a new repository method mirroring a sibling, tests mirroring analogous existing tests, CRUD boilerplate. | Haiku subagent. **Name the exact existing file(s) to copy** — never let it infer the pattern from scratch. |
| **Judgment-required** | A new pattern, an architectural decision, an ambiguous/underspecified requirement, security-sensitive code, or anything AGENTS.md/AI_DEVELOPMENT_GUIDE.md says to "stop and present alternatives" for or create an ADR for. | Sonnet/Opus. |

- Code volume/size is **not** a signal. A small but ambiguous or architecturally risky change stays on
  Sonnet/Opus.
- **Escalate** a Haiku task to Sonnet/Opus if: its output doesn't match the named pattern, it hits an
  architectural-boundary rule (§1), or the target has no clear existing pattern to copy. Never let Haiku
  guess past that point.
- Model tier changes nothing about review: architecture, domain-entity, and security-sensitive changes
  still require human review regardless of which model wrote them (`CONTRIBUTING.md`).

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

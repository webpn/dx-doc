# Apply Progress: ladle-workbench

**Change**: ladle-workbench · **Mode**: Strict TDD (resolved: `strict_tdd: true` + vitest runner present; TDD cycle applied where behavior exists, structural tasks documented as skipped per strict-tdd.md triangulation criteria) · **Store**: openspec · **Batch**: all tasks 1.1–4.3 (single work unit, single PR)

## Implementation Progress

### Completed Tasks

- [x] 1.1 `@ladle/react@5.1.1` in devDependencies via `npm install -D` (lockfile updated, `lockfile:check` green, no normalize needed)
- [x] 1.2 `mockup: ladle serve --port 61000` script in package.json
- [x] 1.3 `.ladle/config.mjs` (stories glob, a11y + width addons, plus `viteConfig` fallback key — see deviations)
- [x] 2.1 `.ladle/components.tsx` (theme.css + `I18nProvider`, NAMED `Provider` export — see deviations)
- [x] 2.2 `src/design-system/button.stories.tsx` (barrel-only import; `Primary`, `Secondary` stories; full RED→GREEN cycle)
- [x] 3.1 Serve proof (a): story graph transforms with zero `@project/*` resolve errors
- [x] 3.2 Serve proof (b): served stylesheet emits `--color-primary: #2454ff` + `bg-[var(--color-primary)]` rule
- [x] 3.3 tsconfig include extended (lint tripped `projectService` exactly as anticipated — trip proven first)
- [x] 4.1 Gates: typecheck ✓, lint 0 errors ✓, prettier clean on all change files ✓, `npm test` = baseline (83 files / 595 passed / 6 skipped) ✓
- [x] 4.2 `npm run build` ✓, `dist/` contains zero story/ladle modules ✓
- [x] 4.3 `Dockerfile` + `.github/workflows/ci.yml` untouched, zero Ladle/`mockup` references ✓

### Files Changed

| File                                                                     | Action    | What Was Done                                                                      |
| ------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------- |
| `package.json`                                                           | Modified  | `@ladle/react ^5.1.1` devDep + `mockup` script                                     |
| `package-lock.json`                                                      | Modified  | InstallSide-effect of 1.1 (public registry, check green)                           |
| `.ladle/config.mjs`                                                      | Created   | Stories glob, a11y + width addons, `viteConfig` fallback key                       |
| `.ladle/vite.config.mjs`                                                 | Created   | Fallback Vite config: alias table + tailwind + `@source` injector (see deviations) |
| `.ladle/components.tsx`                                                  | Created   | Token import + `I18nProvider` wrapper, named `Provider` export                     |
| `src/design-system/button.stories.tsx`                                   | Created   | Barrel-only `Button` story, `Primary` + `Secondary`                                |
| `tsconfig.json`                                                          | Modified  | Added `.ladle/**/*.tsx` to include (task 3.3 trip proven)                          |
| `openspec/changes/ladle-workbench/tasks.md`                              | Modified  | All boxes marked `[x]`                                                             |
| `Dockerfile`, `.github/workflows/ci.yml`, `vite.config.ts`, product code | Untouched | Verified by diff                                                                   |

### TDD Cycle Evidence

| Task         | Test File                                                                                                           | Layer                     | Safety Net                                               | RED                                                                | GREEN                             | TRIANGULATE                                                                                                            | REFACTOR                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1.1–1.3, 2.1 | — (structural)                                                                                                      | —                         | `npm test` baseline 83/595/6-skipped captured pre-change | ➖ N/A                                                             | ➖ N/A                            | ➖ Skipped: purely structural config/wiring, one possible output each                                                  | ➖ None needed                               |
| 2.2          | `src/design-system/button.stories.test.tsx` (temporary scaffold, deleted after GREEN per design "no product tests") | Integration (jsdom + RTL) | N/A (new file)                                           | ✅ import of non-existent `./button.stories` failed, 1 file failed | ✅ 2/2 passed after story written | ✅ 2 cases: default-variant Primary + secondary-variant Secondary, both real render + role/name assertions, zero mocks | ➖ None needed: 4-line story, no duplication |

### Test Summary

- **Total tests written**: 2 (temporary TDD scaffold, removed after GREEN to honor the design's fixed file list)
- **Total tests passing**: 2/2 at GREEN; full suite before/after identical (83 files, 595 passed, 6 skipped)
- **Layers used**: Integration (2)
- **Approval tests** (refactoring): None — no refactoring tasks
- **Pure functions created**: 0 (no logic in scope)

### Work Unit Evidence

| Evidence                                          | Value                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npx vitest run src/design-system/button.stories.test.tsx --project ui` → RED: 1 failed (no tests, import error); GREEN: 1 passed, 2/2 tests                                                                                                                                                                     |
| Runtime harness command/scenario and exact result | `npm run mockup` on :61000 → shell 200, meta.json lists `button--primary`/`button--secondary`, story/barrel/button/cn/provider/i18n modules all HTTP 200, server log zero errors; served theme.css contains `--color-primary: #2454ff` + `.bg-[var(--color-primary)] { background-color: var(--color-primary) }` |
| Rollback boundary                                 | Delete `.ladle/`, `src/design-system/button.stories.tsx`, `mockup` script; remove `@ladle/react`, reinstall; revert tsconfig include. No product code touched.                                                                                                                                                   |

### Deviations from Design

1. **Named (not default) `Provider` export in `.ladle/components.tsx`.** Ladle's `get-components-import.js` AST-scans for a NAMED `Provider` export; a default export is silently ignored (default provider used instead). Proven from installed source + Ladle docs. The provider works (served transform verified).
2. **Explicit `viteConfig` fallback implemented** (`.ladle/vite.config.mjs`, wired via `viteConfig` key). Root-config autodetect FAILS with evidence: Ladle's nested Vite 6 aborts the dev module pipeline on the Vite 8-authored root config (`builtin:vite-react-refresh-wrapper` → `Missing field 'moduleType'`; `/@vite/client` 404). Control experiment: empty `--viteConfig` serves `/@vite/client` 200 with zero errors. Per design approach 2 and orchestrator authorization; alias table duplicated with sync comment (accepted drift, documented).
3. **`workbench-tailwind-sources` pre-transform plugin in the fallback config** injects `@source "<abs>/src";` into theme.css at serve time (product theme.css untouched). Without it, Tailwind v4 auto-detection (scoped to Ladle's Vite root = its own package dir) generates ZERO utilities and drops `--color-primary`; with it, served CSS emits `--color-primary: #2454ff` and all Button utilities. Second half of the same discovery as (2).
4. **Line forecast ~60 → ~95 added** (fallback config + injector). Still single PR, far under the 800-line budget.
5. **`import/order` learning**: `import type` from external + named `@project/*` imports share one group (no blank line); side-effect `@project/*.css` stays in its own separated group (main.tsx pattern). Cosmetic only.

### Issues Found

- Port 61000 was held by a foreign node process at first serve (Ladle auto-moved to 61001); squatter later gone, final proofs run on pinned :61000.
- One silent server exit from a pkill/start race during diagnostics; clean restart stable for all proofs.
- Full-tree `format:check` flags 3 pre-existing openspec md files (table padding, prior phases) — deliberately untouched (not my artifacts); every change file passes `prettier --check`.
- Proof (b) is served-stylesheet evidence, not a literal computed-style read: no browser/playwright on this machine. Chain is airtight (`:root` token + generated utility + rendered class from served transforms).
- Temp TDD scaffold test deleted after GREEN (design fixes the file list and mandates no product tests); evidence recorded above.

### Status

12/12 tasks complete. Ready for verify.

### Workload / PR Boundary

- Mode: single PR (no chain; forecast held, final ~95 added lines + lockfile)
- Current work unit: local-only Ladle workbench + Button story, serve-proven
- Boundary: package.json/lockfile/tsconfig deltas + `.ladle/` (3 files) + one story + SDD tracking
- Estimated review budget impact: ~95 lines, well under budget; no `size:exception` needed

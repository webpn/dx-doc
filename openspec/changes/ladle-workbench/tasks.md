# Tasks: ladle-workbench

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60 added (+ lockfile) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Local-only Ladle workbench + Button story, serve-proven | PR 1 | `npm run typecheck && npm run lint && npm run format:check && npm test` | `npm run mockup` serve on 61000, open Button story, confirm render + token color | Delete `.ladle/`, story, `mockup` script; remove dep, reinstall |

## Phase 1: Foundation (tooling setup)

- [x] 1.1 Add `"@ladle/react": "^5.1.1"` to `devDependencies` in `package.json` via `npm install -D`, commit lockfile update
- [x] 1.2 Add `"mockup": "ladle serve --port 61000"` script to `package.json` (avoid 5173/3001)
- [x] 1.3 Create `.ladle/config.mjs` with `stories: "src/**/*.stories.{js,jsx,ts,tsx,mdx}"`, a11y + width addons enabled

## Phase 2: Core Implementation (provider + story)

- [x] 2.1 Create `.ladle/components.tsx` importing `@project/design-system/theme.css`, wrapping `{children}` in `I18nProvider` default export
- [x] 2.2 Create `src/design-system/button.stories.tsx` with barrel-only `Button` import; `Primary`, `Secondary` named `Story` exports

## Phase 3: Integration Proofs (serve-time, verification-first)

- [x] 3.1 Serve proof (a): run `npm run mockup`, open Button story, confirm render with zero `@project/*` resolve errors
- [x] 3.2 Serve proof (b): confirm Primary Button computed `background-color` is `rgb(36, 84, 255)` (`--color-primary`) in served DOM
- [x] 3.3 Fix `tsconfig.json` include with `".ladle/**/*.tsx"` ONLY if `npm run lint` trips `projectService` on `.ladle/components.tsx`

## Phase 4: Verification (local-only + gates)

- [x] 4.1 Run `npm run typecheck && npm run lint && npm run format:check && npm test`, all green with no new exclusions
- [x] 4.2 Run `npm run build`, grep `dist/` for `stories` to confirm story-free bundle
- [x] 4.3 Inspect diff to confirm `Dockerfile` and `ci.yml` untouched (no Ladle/`mockup` references)

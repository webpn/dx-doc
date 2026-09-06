# Design: ladle-workbench

Local-only Ladle workbench (DX tooling, no product change). Strategy: Ladle 5 autodetects the root `vite.config.ts` so `@project/*` aliases and the Tailwind v4 plugin apply unchanged; explicit `viteConfig` fallback only on proven serve failure. One co-located `Button` story proves the pattern via two serve-time gates.

## Technical Approach

Add `@ladle/react` as devDependency plus a `mockup` script; add `.ladle/config.mjs` (stories glob, a11y + width addons) and `.ladle/components.tsx` (tokens + `I18nProvider`); add one barrel-only `Button` story under `src/`. No product, API, Dockerfile, CI, or `vite.config.ts` changes.

```
Story (*.stories.tsx) ──→ Ladle runtime (Vite 6, nested dep) ──→ root vite.config.ts (autodetect)
   │ barrel import only              │ .ladle/components.tsx wraps                      │ aliases + tailwindcss()
   └──────── real Button ◄───────────┴── theme.css tokens + I18nProvider ───────────────┘
```

No sequence diagram: no async flow, no cross-layer calls. No ADR: no product/architecture decision (local tooling only).

## Architecture Decisions

| Option                                          | Tradeoff                                                                                                                                                                           | Decision                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Root-config autodetect vs explicit `viteConfig` | Autodetect: zero alias duplication, single source of truth; risk Ladle Vite 6 chokes on Vite 8-authored config. Explicit: isolated but second alias table (drift across 3 sources) | Autodetect first; fallback only if serve proof (a) fails                                |
| Co-located `src/` stories vs top-level dir      | Co-located: covered by `tsconfig` include `src` + type-aware lint with zero config; broken story fails gates (desired). Top-level: needs tsconfig/eslint work                      | Co-located `src/design-system/button.stories.tsx`                                       |
| Provider scope: theme.css + I18nProvider only   | `main.tsx` also has QueryClientProvider + router; example story needs neither. Adding them now is speculative                                                                      | Minimal provider; document QueryClient/router as follow-up need for data-driven stories |

## File Changes

| File                                   | Action            | Description                                                                                                                                                                                                                                            |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                         | Modify            | Add `"@ladle/react": "^5.1.1"` to `devDependencies`; add `"mockup": "ladle serve --port 61000"` (avoids 5173/3001)                                                                                                                                     |
| `.ladle/config.mjs`                    | Create            | `stories: "src/**/*.stories.{js,jsx,ts,tsx,mdx}"`; `addons: { a11y: { enabled: true }, width: { enabled: true } }`. Plain `.mjs` → non-type-aware eslint block, no tsconfig impact                                                                     |
| `.ladle/components.tsx`                | Create            | `import '@project/design-system/theme.css'` (token layer) + `import { I18nProvider } from '@project/app/i18n'`; export default `Provider` wrapping `{children}` in `<I18nProvider>`. Outside `src/`, so `no-restricted-imports` blocks do not match it |
| `src/design-system/button.stories.tsx` | Create            | Barrel-only `import { Button } from '@project/design-system'`; stories `Primary`, `Secondary` ( Ladle `Story` named exports). Inside design-system so boundary rule is off, but barrel-only by convention                                              |
| `tsconfig.json`                        | Modify iff needed | If `npm run lint` trips `projectService` on `.ladle/components.tsx` (file outside any project), add `".ladle/**/*.tsx"` to `include`. Prefer over weakening lint; no change otherwise                                                                  |

## Interfaces / Contracts

No product interfaces. Ladle convention only: default-exported provider in `.ladle/components.tsx`; named `Story` exports in the story. Peer contract: `@ladle/react` 5.1.1 needs `react >= 18`, repo has 19.2.8; nested Vite 6 leaves product Vite 8 alone.

## Testing Strategy

| Layer                           | What to test                                                                                                  | Approach                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serve proof (a): alias resolve  | `npm run mockup` serves; `Button` story renders, zero `@project/*` resolve errors                             | Manual local gate; on failure → explicit `viteConfig` fallback (new task, not silent fix)                                                                             |
| Serve proof (b): tokens applied | Primary `Button` computed `background-color` = `rgb(36, 84, 255)` (`--color-primary` `#2454ff`) in served DOM | Manual local gate via devtools; never config inspection alone                                                                                                         |
| Gates                           | `typecheck`, `lint`, `format:check`, `test` green, no new exclusions                                          | `npm run typecheck && npm run lint && npm run format:check && npm test`; stories implicitly typechecked/linted, implicitly excluded from Vitest (no `*.test.*` match) |
| Local-only                      | `dist/` story-free; `Dockerfile`/`ci.yml` untouched                                                           | `npm run build` (= `typecheck && vite build`), then grep `dist/` for `stories`; inspect diff to confirm neither file references Ladle/`mockup`                        |

No product tests needed: no behavior change; gates above are the full plan.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollback: delete `.ladle/`, the story, and the `mockup` script; remove `@ladle/react`, reinstall; revert `tsconfig.json` include if touched.

## Open Questions

None — proposal fixed story (`Button`), port (`61000`), location (co-located `src/`), implicit test exclusion.

## Forecast

~60 added lines (config ~8, provider ~12, story ~25, package.json ~2 + lockfile). Decision needed before apply: No. Chained PRs recommended: No. 400-line budget risk: Low (single PR, well under 800-line budget). Docs: none.

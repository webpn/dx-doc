# Exploration: ladle-workbench

Local-only Ladle workbench for iterating on product UI with real design-system
primitives. Setup + one example story only; real screen mockups are follow-up work.

## Current State

- No workbench exists: no `.ladle/` directory, no `*.stories.*` files, no
  `stories` references in `vite.config.ts`, `package.json`, or `eslint.config.mjs`
  (verified 2026-09-06, branch `r1`).
- UI stack (verified): React 19.2.8 + react-dom 19.2.8, Vite 8.2.1,
  `@vitejs/plugin-react` ^6.0.5, Tailwind v4 via `@tailwindcss/vite` ^4.3.3.
  Tokens live in `src/design-system/theme.css` (`@import 'tailwindcss'` +
  `@theme`); the app entry `src/app/main.tsx` imports that stylesheet once plus
  `I18nProvider` (locale context, defaults to English) inside
  `QueryClientProvider` + `BrowserRouter`.
- Public UI surface is the `@project/design-system` barrel
  (`src/design-system/index.ts`); eslint `no-restricted-imports` forbids every
  deeper `@project/design-system/*` path (except `*.css`) everywhere outside
  `src/design-system/` itself.
- `@project/*` aliases are defined twice and must stay in sync: `projectAliases`
  in `vite.config.ts` (Vite/Vitest) and `paths` in `tsconfig.json` (tsc).
- Prod bundle path: `npm run build` = `tsc --noEmit && vite build` from
  `index.html` → `src/app/main.tsx`. `Dockerfile` runs only `npm run build`
  and Fastify serves `dist/` only if it exists (`composition-root.ts`:
  `existsSync(distDir)` guard + SPA fallback). CI (`ci.yml`) runs
  typecheck → lint → format:check → docs checks → `test:coverage` → `build`;
  no step invokes Ladle or any `mockup` script.

## Affected Areas

- `package.json` — add `@ladle/react ^5.1.1` to `devDependencies` only + a
  `mockup` script with a pinned port (e.g. `ladle serve --port 61000`);
  port must avoid 5173 (`dev:web`) and 3001 (API).
- `.ladle/config.mjs` (new) — `stories: "src/**/*.stories.{js,jsx,ts,tsx,mdx}"`,
  addons with a11y + width kept enabled. Plain `.mjs`: covered by the
  non-type-aware eslint JS block, no tsconfig impact.
- `.ladle/components.tsx` (new) — global provider: MUST import
  `@project/design-system/theme.css` (Tailwind v4 tokens) and wrap stories in
  `I18nProvider` (any story touching `useTranslate`/`useFormatters` throws
  outside it). `QueryClientProvider`/router are NOT needed for the example
  story; document them as a follow-up need for data-driven stories.
- `src/design-system/**/*.stories.tsx` (one example story, e.g. `button`) —
  co-located under `src/` so `tsc --noEmit` (include: `src`) and eslint
  type-aware rules cover it with zero config changes. Must import only the
  `@project/design-system` barrel to respect the design-system boundary.
- `tsconfig.json` — include strategy: NO change if stories live under `src/`;
  if `.ladle/components.tsx` trips `typescript-eslint` `projectService`
  (file outside any tsconfig project), prefer adding `.ladle/**/*.tsx` to
  `include` over weakening lint. Apply phase proves with `npm run lint`.
- No changes to `vite.config.ts`, `Dockerfile`, `ci.yml`, product layers,
  or `src/api/`.

## Approaches

1. **Ladle with root-config autodetect (recommended)** — rely on Ladle
   auto-loading root `vite.config.ts` so `projectAliases` + the Tailwind v4
   plugin apply to stories unchanged.
   - Pros: zero duplication of alias/plugin config; stories resolve
     `@project/*` exactly like the product; single source of truth preserved.
   - Cons: unproven merge — Ladle 5.1.1 bundles Vite ^6 (own nested dep,
     does not disturb product Vite 8) and will load a config authored for
     Vite 8 + `vitest/config`; plugin instances must tolerate Vite 6.
   - Effort: Low.
2. **Ladle with explicit `viteConfig` override** — point Ladle at a minimal
   workbench-only Vite config (aliases + Tailwind plugin only).
   - Pros: isolates the workbench from product config churn; sidesteps any
     Vite 6-vs-8 plugin incompatibility.
   - Cons: second alias table to keep in sync with `vite.config.ts` +
     `tsconfig.json` (now three sources); drift risk on every alias change.
   - Effort: Low-Medium.
3. **Storybook instead of Ladle** — rejected for this change: heavier
   install, own builder config, duplicates what Ladle gives for free
   (Vite-native, devDependency-only). Note: sibling folder
   `openspec/changes/design-review-app/` exists but is empty (no files, no
   history) — no conflict, but the propose phase should acknowledge it.

Recommendation: start with approach 1; fall back to 2 only if the apply-phase
smoke test proves autodetect fails. Decision rule is evidence, not preference:
a served story importing `@project/design-system` with Tailwind v4 styles
visibly applied.

## Integration risks and how apply PROVES each (not assumes)

- (a) **`@project/*` alias resolution inside stories.** Risk: Ladle's Vite 6
  runtime may fail to merge/load the Vite 8-authored root config
  (`defineConfig` from `vitest/config`, `@vitejs/plugin-react` 6,
  `@tailwindcss/vite` 4). Proof: `npm run mockup` serves and a story doing
  `import { Button } from '@project/design-system'` renders without resolve
  errors. If it fails, fall back to approach 2 (`viteConfig` override).
- (b) **Tailwind v4 styles actually applying.** Risk: Ladle docs examples are
  Tailwind v3-style (postcss); this repo's styling flows through the
  `@tailwindcss/vite` plugin + `theme.css` `@theme` tokens, which may not run
  in Ladle's pipeline. Proof: rendered-DOM evidence in the served story —
  e.g. computed `background-color` of the primary `Button` resolves to
  `--color-primary` (`#2454ff`) — never config inspection alone.

## Local-only guarantee mechanics

- **Bundle:** Vite bundles only the import graph reachable from `index.html`.
  Stories are reachable only from Ladle's own runtime, never imported by
  product code (enforced by convention + review; nothing in `src/` may import
  `*.stories.*`). Therefore `vite build` output (`dist/`) cannot contain them.
- **Image:** `Dockerfile` runs `npm ci` + `npm run build` only; devDependencies
  (including `@ladle/react`) are never executed inside the image and no Ladle
  file is copied into a served path.
- **CI:** `ci.yml` has no Ladle step; the workbench cannot run there. Note the
  deliberate side effect: stories under `src/` ARE typechecked, linted,
  formatted, and (by default include rules) NOT executed by Vitest (only
  `*.test.*`/`*.spec.*` match; the `ui` project include lists test paths
  only). A broken story fails `typecheck`/`lint` — transparent and desired,
  not a leak.
- **Dependency Policy justification (ENGINEERING_GUIDE.md, 7 questions):**
  (1) Necessary — no stdlib/platform alternative to a component workbench;
  (2) Maintained — Ladle 5.x active, MIT license (3) compatible;
  (4) Zero runtime/bundle cost — devDependency + never bundled;
  (5) Supply-chain surface limited to local dev tooling;
  (6) Stable API — v5 major, not 0.x;
  (7) No duplication — no existing mockup capability in the repo.

## Peer-compat check (verified via `npm view`, no install)

- `@ladle/react` 5.1.1 peerDeps: `react >=18.0.0`, `react-dom >=18.0.0` →
  installed React 19.2.8 SATISFIES.
- `@ladle/react` 5.1.1 bundles its own `vite ^6.0.5` (nested dep) vs product
  Vite 8.2.1 → no version conflict at install (separate binary), but it is
  exactly why risk (a) needs a serve-time proof. Verdict: compatible on paper,
  serve smoke test is the admission gate.

## Effort / blast radius

Effort: Low (one devDependency, two `.ladle/` files, one story, one script;
no product code touched). Blast radius: local DX only; prod bundle, image,
and CI behavior unchanged by construction (see above). Review-budget risk:
Low (well under the 400-line guard; `single-pr` delivery fits).

Explicitly OUT: real screen mockups (follow-up changes), visual-regression
tooling (screenshots/diffing), publishing or deploying the workbench, a CI
job for stories, and any change to product layers or the design-system
boundary rule.

## Open questions (flagged, not guessed)

1. Which component should the single example story showcase? (Default
   assumption: `Button` — confirm in propose.)
2. Fixed `ladle serve` port — is Ladle's default (61000) acceptable, or is a
   project-reserved port wanted? Only constraint verified: avoid 5173/3001.
3. Story location convention: co-located `src/**/*.stories.tsx` (recommended,
   zero config) vs a separate top-level dir (needs tsconfig/eslint work)?
4. Should `npm test` / CI explicitly ignore `*.stories.*`, or is the current
   implicit exclusion (no test/spec match) sufficient by convention?

## Ready for Proposal

Yes — proceed to `sdd-propose` with approach 1 (autodetect, fallback to
explicit `viteConfig`), the two serve-time proofs as acceptance gates, and
answers to open questions 1–4 recorded in the proposal.

# Proposal: ladle-workbench

## Intent

Iterate on product UI against real design-system primitives without touching product code. No workbench exists; add local-only Ladle setup plus one example story as the follow-up pattern.

GitHub Issue: none provided by orchestrator; no link invented. Base branch: `r1`. Delivery: single PR.

## Scope

### In Scope

- `@ladle/react ^5.1.1` devDep only + `mockup` script (`ladle serve --port 61000`)
- `.ladle/config.mjs` (stories glob, a11y + width addons) and `.ladle/components.tsx` (tokens + `I18nProvider`)
- One co-located example story (`src/design-system/*.stories.tsx`)
- Two serve-time proofs as acceptance gates (alias resolve + token-applied render)

### Out of Scope

- Real screen mockups (follow-ups), visual regression, workbench deploy, CI story job, product-layer or boundary changes

## Capabilities

### New Capabilities

None — local-only DX tooling, no product behavior change.

### Modified Capabilities

None — `openspec/specs/` is empty (`.gitkeep` only); nothing to modify.

## Approach

Approach 1: root-config autodetect (Ladle auto-loads `vite.config.ts`, preserving aliases + Tailwind v4). Fallback to explicit `viteConfig` only if the serve proof fails. Gates: (a) story importing the barrel renders with no resolve errors; (b) rendered DOM proves tokens applied (primary Button `background-color` = `--color-primary` `#2454ff`). Sibling `design-review-app/` is empty — no conflict.

### Decided with default (exploration micro-questions)

1. Story: `Button`. 2. Port: `61000`. 3. Location: co-located `src/`. 4. Test exclusion: implicit sufficient.

## Affected Areas

| Area                              | Impact              | Description                                            |
| --------------------------------- | ------------------- | ------------------------------------------------------ |
| `package.json`                    | Modified            | devDep + script only                                   |
| `.ladle/config.mjs`               | New                 | Stories glob, addons                                   |
| `.ladle/components.tsx`           | New                 | Tokens import, `I18nProvider` wrapper                  |
| `src/design-system/*.stories.tsx` | New                 | One `Button` story (barrel import only)                |
| `tsconfig.json`                   | Modified iff needed | Add `.ladle/**` include only if `projectService` trips |

## Risks

| Risk                                           | Likelihood | Mitigation                                         |
| ---------------------------------------------- | ---------- | -------------------------------------------------- |
| Ladle Vite 6 fails to load Vite 8 root config  | Med        | Serve proof (a); fallback to explicit `viteConfig` |
| Tailwind v4 tokens not applied in Ladle        | Med        | DOM proof (b), not config inspection               |
| Alias drift if fallback duplicates alias table | Low        | Fallback only on proven failure; prefer autodetect |

## Rollback Plan

Delete `.ladle/`, the example story, and the `mockup` script; remove `@ladle/react` and reinstall. Revert `tsconfig.json` include if touched. No product code changes, so no data or bundle rollback applies.

## Dependencies

- `@ladle/react ^5.1.1` (devDep; peers satisfied by React 19.2.8; nested Vite 6, no product conflict). Policy justification per exploration. No other prerequisites.

## Success Criteria

- [ ] Served story renders real `Button` with tokens applied (proof b)
- [ ] `mockup` serves with no resolve errors (proof a)
- [ ] `typecheck`, `lint`, `format:check`, `test` green; `npm run build` output story-free

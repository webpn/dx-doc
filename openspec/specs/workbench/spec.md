# Workbench Specification

## Purpose

Local-only Ladle workbench for iterating on product UI against real design-system primitives. DX tooling only; no product behavior change.

## Requirements

### Requirement: Example story renders real primitive with tokens applied

The workbench MUST provide one co-located example story that renders the real `Button` primitive with design tokens applied.

#### Scenario: Served story shows token-styled Button

- GIVEN the workbench is served locally
- WHEN the reviewer opens the example `Button` story
- THEN the rendered DOM shows the real `Button` primitive
- AND the primary `Button` computed `background-color` resolves to `--color-primary` (`#2454ff`)

### Requirement: Mockup command serves without resolve errors

The `mockup` script MUST serve the workbench on the pinned port with no module-resolution errors for barrel imports.

#### Scenario: Barrel import resolves at serve time

- GIVEN the example story imports only the `@project/design-system` barrel
- WHEN `npm run mockup` serves the workbench
- THEN the story renders with no `@project/*` resolve errors

### Requirement: Workbench stays local-only

The workbench MUST NOT leak into the production bundle, image, or CI.

#### Scenario: Prod bundle is story-free

- GIVEN no product code imports `*.stories.*`
- WHEN `npm run build` completes
- THEN `dist/` contains no story modules

#### Scenario: Image and CI untouched

- GIVEN the change is applied
- WHEN the reviewer inspects `Dockerfile` and `ci.yml`
- THEN neither file references Ladle nor the `mockup` script

### Requirement: Quality gates stay green

The change MUST keep `typecheck`, `lint`, `format:check`, and `npm test` green without weakening checks.

#### Scenario: Gates pass on the change

- GIVEN the workbench files are added
- WHEN `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` run
- THEN each gate passes with no new exclusions or suppressions

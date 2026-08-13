# Style Guide

## Naming

| Element                | Convention                                   | Example                                        |
| ---------------------- | -------------------------------------------- | ---------------------------------------------- |
| Files (components)     | PascalCase                                   | `TrackingDetail.tsx`                           |
| Files (non-components) | kebab-case                                   | `property-service.ts`, `use-project-search.ts` |
| Directories            | kebab-case                                   | `data-layer-property/`                         |
| React components       | PascalCase                                   | `TrackingDetail`, `PropertyForm`               |
| Hooks                  | camelCase, `use` prefix                      | `useTrackingForm`, `useProjectVersions`        |
| Functions              | camelCase                                    | `buildChangeLog`, `validatePropertyName`       |
| Constants              | UPPER_SNAKE_CASE                             | `MAX_IMAGE_DIMENSION`, `DEFAULT_LOCALE`        |
| Types/Interfaces       | PascalCase                                   | `DataLayerProperty`, `VersionSnapshot`         |
| Type parameters        | PascalCase, single letter where conventional | `T`, `TEntity`                                 |
| Enums (if used)        | PascalCase                                   | — (literal unions preferred)                   |
| Branded types          | PascalCase, `Id` suffix                      | `ProjectId`, `PropertyId`                      |
| Domain errors          | PascalCase, `Error` suffix                   | `PropertyNameNotUniqueError`                   |
| Database tables        | snake_case, plural                           | `data_layer_properties`                        |
| API endpoints          | kebab-case                                   | `/projects/:id/data-layer-properties`          |
| Environment variables  | UPPER_SNAKE_CASE                             | `DB_HOST`, `SEARCH_DRIVER`                     |

## File Naming

- One exported component per file. The file name matches the component name.
- Test files: co-located with the source or in a parallel `__tests__/` directory. Suffix `.test.ts` or `.test.tsx`.
- Type definition files: `.types.ts` when shared across multiple files in the same module.
- Index files (`index.ts`) are used only for public API surface of a module — they re-export the module's public symbols. Do not use barrel files that re-export everything.

## Import Ordering

Enforced automatically by ESLint. The conceptual order:

1. External library imports (react, third-party libraries)
2. Internal absolute imports (`@project/domain`, `@project/design-system`, `@project/shared`)
3. Relative imports from parent/sibling directories
4. Relative imports from the same directory

Within each group: alphabetical.

## Formatting

Enforced automatically by Prettier. Project-wide configuration in `prettier.config.*`. No per-file overrides without documented justification.

Key settings:

- Semicolons: always
- Quotes: single
- Trailing commas: all
- Tab width: 2 spaces
- Print width: 100

## Type Definitions

- Prefer `interface` for object shapes that will be extended or implemented. Prefer `type` for unions, intersections, and mapped types. This is a convention, not a rule.
- Export types that are part of a module's public API. Keep types that are implementation details private.
- Type imports use `import type` syntax when the import is only used as a type (helps bundlers and clarity):
  ```typescript
  import type { DataLayerProperty } from '../domain/data-layer-property.types';
  ```
- One type per file unless the types are tightly coupled (e.g., a discriminated union and its variants).

## Function Conventions

- Prefer named exports over default exports for functions and utilities.
- Default exports are acceptable for page-level React components (for lazy loading).
- Functions should do one thing. If a function needs "and" in its name, it does too much.
- Prefer pure functions where practical. Side effects (network, storage, DOM) should be at the edges.
- Use arrow functions for inline callbacks and short function expressions. Use `function` declarations for top-level functions (hoisting, stack traces).
- Avoid functions with more than 4 parameters. Use an options object:
  ```typescript
  function createTracking(params: {
    projectId: ProjectId;
    name: string;
    pageId: PageId;
    modules?: ModuleId[];
  }): Result<Tracking, CreateTrackingError> { ... }
  ```

## React JSX Conventions

- Self-close tags when there are no children: `<TrackingIcon />`
- Wrap multi-line JSX in parentheses.
- Use fragments (`<>...</>`) when a wrapper div would be semantically meaningless.
- Props: one prop per line when there are more than two, or when any prop value is multi-line:
  ```tsx
  <TrackingDetail tracking={tracking} onSave={handleSave} readOnly={isPublished} />
  ```
- Boolean props: omit the value when true: `<Button disabled>` not `<Button disabled={true}>`
- String props: use double quotes: `name="homepage"`

## Comments / Docstrings

- Comments explain **why**, not **what**. The code should explain what.
- JSDoc for public API functions: description, parameters, return value, thrown errors.
- TODO comments include a reference to a GitHub issue: `// TODO(#1234): implement bulk operations`
- Do not leave commented-out code in the repository. Delete it; it's in git history.

## Error Conventions

- Domain errors are objects with a `code` and `message`:
  ```typescript
  type DuplicatePropertyNameError = {
    _tag: 'DuplicatePropertyNameError';
    propertyName: string;
    message: string;
  };
  ```
- Result type for fallible operations:
  ```typescript
  type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
  ```
- Async operations that can fail return `Promise<Result<T, E>>`. Do not throw for expected errors.
- Unexpected/unrecoverable errors are thrown and caught by error boundaries or global handlers.

## Export Conventions

- Module public API is exported from an `index.ts` barrel file at the module root.
- Internal types and utilities are not exported from the barrel — they stay in their files.
- Avoid `export *` — it leaks implementation details. List exports explicitly.

## Test Naming

- Test files: `*.test.ts` or `*.test.tsx`, co-located or in `__tests__/` alongside the source.
- Test descriptions: `describe('TrackingService', () => { it('detaches module when all its properties are removed', () => { ... }) })`
- Test structure: Arrange → Act → Assert, separated by blank lines.
- Test behavior, not implementation. A test titled "calls the repository" is about implementation. A test titled "returns the tracking with the added property" is about behavior.

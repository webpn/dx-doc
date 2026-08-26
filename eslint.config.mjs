import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

/**
 * Shared restricted-import groups, spread into each per-layer block below.
 * They exist as constants because flat config replaces rather than merges a
 * repeated rule — see the comment above the boundary blocks.
 */

/** Direct external UI-library imports: everything outside src/design-system/. */
const uiLibraryPatterns = [
  {
    group: ['@radix-ui/*'],
    message: 'Use @project/design-system instead of importing Radix directly.',
  },
  {
    group: ['@mui/*'],
    message: 'Use @project/design-system instead of importing MUI directly.',
  },
  {
    group: ['@mantine/*'],
    message: 'Use @project/design-system instead of importing Mantine directly.',
  },
  {
    group: ['antd', 'antd/*'],
    message: 'Use @project/design-system instead of importing Ant Design directly.',
  },
];

/**
 * The design-system boundary itself (ADR-0008, AGENTS.md, and M1.15's exit
 * criterion: "a component imported from a shadcn path outside
 * @project/design-system fails lint"). The design system is copy-paste source
 * in this repository, which is exactly what makes reaching past the barrel
 * file easy and is why it needs a lint rule rather than a convention.
 *
 * `@project/design-system` — the barrel — stays allowed; every deeper path is
 * not, whether it is spelled as an alias or as a relative path. Stylesheets are
 * the one exception: `theme.css` is the design system's token layer and has to
 * be imported once at the app entry point, and a barrel of JS exports cannot
 * carry a CSS side-effect import. The rule targets components and lib helpers,
 * which is where the boundary actually matters.
 */
const designSystemPatterns = [
  {
    group: [
      // Every deeper alias path except a stylesheet: `theme.css` is the token
      // layer, must be imported once at the app entry, and cannot be re-exported
      // through a barrel of JS exports.
      '@project/design-system/*',
      '!@project/design-system/*.css',
      '**/design-system/components',
      '**/design-system/components/*',
      '**/design-system/lib',
      '**/design-system/lib/*',
    ],
    message:
      'Import design-system components from the "@project/design-system" barrel only (ADR-0008). Reaching into a component or lib path bypasses the boundary; if something is missing, export it from src/design-system/index.ts.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist/', 'build/', 'coverage/', 'node_modules/', '.next/'],
  },
  js.configs.recommended,
  {
    // TypeScript source: type-aware rules in force, scoped here so they never
    // run against config/JS files that have no tsconfig project.
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Import order
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Config and plain JS files: no type-aware rules (no tsconfig project).
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      // Listed by hand rather than pulled from the `globals` package, which is
      // only a transitive dependency of eslint here — importing it directly
      // would be relying on something the lockfile does not promise. The cost
      // is that a script using a Node global not listed here fails `no-undef`
      // with a confusing message; add the global, do not disable the rule.
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
      },
    },
  },
  // ---------------------------------------------------------------------------
  // Architectural boundaries (AGENTS.md, ADR-0008).
  //
  // `no-restricted-imports` takes a SINGLE options object, and in flat config a
  // later block that sets the same rule REPLACES the earlier one rather than
  // merging with it. Overlapping per-layer blocks therefore silently disable
  // each other: a block scoped to `src/**` would wipe the domain and app rules
  // for every file it also matches. So each scope below gets one block that
  // spells out every pattern that applies to it, including the shared ones.
  // Keep the shared groups in `uiLibraryPatterns` / `designSystemPatterns` and
  // spread them — do not add a second `no-restricted-imports` block for a
  // scope that an existing block already matches.
  // ---------------------------------------------------------------------------
  {
    // Domain and Application layers: no React, no browser APIs, no UI at all.
    files: ['src/domain/**/*.{ts,tsx}', 'src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*'],
              message: 'Domain and Application layers must not depend on React.',
            },
            {
              group: [
                '@project/infrastructure',
                '@project/infrastructure/*',
                '**/infrastructure/**',
              ],
              message:
                'Domain and Application layers must not import Infrastructure directly. Use port interfaces.',
            },
            ...uiLibraryPatterns,
            ...designSystemPatterns,
          ],
        },
      ],
    },
  },
  {
    // UI layer: no direct infrastructure imports, and the design-system boundary.
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@project/infrastructure', '@project/infrastructure/*'],
              message:
                'UI layer must not import Infrastructure directly. Use API client or Application layer.',
            },
            ...uiLibraryPatterns,
            ...designSystemPatterns,
          ],
        },
      ],
    },
  },
  {
    // Everything else outside the design system (api/, shared/, scripts in src/).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/design-system/**', 'src/domain/**', 'src/application/**', 'src/app/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [...uiLibraryPatterns, ...designSystemPatterns],
        },
      ],
    },
  },
  {
    // Inside the design system the UI library IS the implementation (ADR-0008,
    // ADR-0011), so the restrictions above must not apply to it. This block
    // matches only design-system files and clears the rule for them.
    files: ['src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);

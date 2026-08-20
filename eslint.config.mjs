import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

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
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // Domain and Application layers: no React, no browser APIs
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
              group: ['@project/infrastructure', '@project/infrastructure/*', '**/infrastructure/**'],
              message:
                'Domain and Application layers must not import Infrastructure directly. Use port interfaces.',
            },
          ],
        },
      ],
    },
  },
  {
    // UI layer: no direct infrastructure imports
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
          ],
        },
      ],
    },
  },
  {
    // Outside design-system: no direct external UI library imports
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/design-system/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
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
          ],
        },
      ],
    },
  },
);

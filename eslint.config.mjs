import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
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
    // Domain and Application layers: no React, no browser APIs
    files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react-dom/*'], message: 'Domain and Application layers must not depend on React.' },
            { group: ['@project/infrastructure', '@project/infrastructure/*'], message: 'Domain and Application layers must not import Infrastructure directly. Use port interfaces.' },
          ],
        },
      ],
    },
  },
  {
    // UI layer: no direct infrastructure imports
    files: ['src/app/**/*.ts', 'src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@project/infrastructure', '@project/infrastructure/*'], message: 'UI layer must not import Infrastructure directly. Use API client or Application layer.' },
          ],
        },
      ],
    },
  },
  {
    // Outside design-system: no direct external UI library imports
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/design-system/**'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            { group: ['@radix-ui/*'], message: 'Use @project/design-system instead of importing Radix directly.' },
            { group: ['@mui/*'], message: 'Use @project/design-system instead of importing MUI directly.' },
            { group: ['@mantine/*'], message: 'Use @project/design-system instead of importing Mantine directly.' },
            { group: ['antd', 'antd/*'], message: 'Use @project/design-system instead of importing Ant Design directly.' },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/', 'build/', 'coverage/', 'node_modules/', '.next/'],
  },
);
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 scans only files under the Vite root, which is Ladle's own
// package dir — project sources arrive via /@fs and are never detected, so
// zero utilities are generated. Injecting `@source` (workbench side only,
// product theme.css untouched) points the scanner at the real sources.
const workbenchTailwindSources = {
  name: 'workbench-tailwind-sources',
  enforce: 'pre',
  transform(code, id) {
    const filePath = id.split('?')[0];
    if (filePath.endsWith('src/design-system/theme.css')) {
      const sources = path.resolve(import.meta.dirname, '../src');
      return `@source "${sources}";\n${code}`;
    }
    return null;
  },
};

// Workbench-only Vite config (fallback: Ladle 5 bundles Vite 6, which cannot
// load the Vite 8-authored root vite.config.ts — its Rolldown-era plugin
// instances abort the dev module pipeline with
// "Missing field `moduleType`", so autodetect was abandoned with evidence).
// Keep resolve.alias in sync with vite.config.ts projectAliases (the single
// source of truth) and tsconfig.json paths. No react plugin here on purpose:
// Ladle supplies its own Vite 6-compatible one when the user config omits it.
export default {
  plugins: [workbenchTailwindSources, tailwindcss()],
  resolve: {
    alias: {
      '@project/domain': path.resolve(import.meta.dirname, '../src/domain'),
      '@project/application': path.resolve(import.meta.dirname, '../src/application'),
      '@project/infrastructure': path.resolve(import.meta.dirname, '../src/infrastructure'),
      '@project/design-system': path.resolve(import.meta.dirname, '../src/design-system'),
      '@project/shared': path.resolve(import.meta.dirname, '../src/shared'),
      '@project/api': path.resolve(import.meta.dirname, '../src/api'),
      '@project/app': path.resolve(import.meta.dirname, '../src/app'),
    },
  },
};

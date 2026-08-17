#!/usr/bin/env node
// Generates docs/INDEX.md: a single-file map of every ID in docs/**/*.md
// (ADRs, requirements, milestones, user stories, and everything else),
// grouped by source file, so an agent or reviewer can see what exists and
// where without opening every file.
//
// Usage:
//   node scripts/docs-index.mjs generate   — write docs/INDEX.md
//   node scripts/docs-index.mjs check      — fail if docs/INDEX.md is stale
//
// See docs/README.md for the authoring convention this reflects.

import fs from 'node:fs';
import path from 'node:path';

import { buildHref, buildRegistry, naturalCompare } from './docs-registry.mjs';

const MODE = process.argv[2];
if (MODE !== 'generate' && MODE !== 'check') {
  console.error('Usage: node scripts/docs-index.mjs <generate|check>');
  process.exit(2);
}

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, 'docs');
const indexFile = path.join(docsRoot, 'INDEX.md');

const { registry } = buildRegistry(docsRoot);

// Group entries by source file: each file has exactly one file-level id
// (anchor: null) and zero or more item-level ids (anchor set).
const byFile = new Map();
for (const [id, entry] of registry) {
  if (!byFile.has(entry.file)) byFile.set(entry.file, { fileId: null, fileTitle: null, items: [] });
  const group = byFile.get(entry.file);
  if (entry.anchor === null) {
    group.fileId = id;
    group.fileTitle = entry.title;
  } else {
    group.items.push({ id, title: entry.title, anchor: entry.anchor });
  }
}

const orderedFiles = [...byFile.keys()].sort((a, b) =>
  path.relative(docsRoot, a).localeCompare(path.relative(docsRoot, b)),
);

const lines = [];
lines.push('# Documentation Index');
lines.push('');
lines.push(
  '**Generated — do not edit by hand.** Run `npm run docs:generate-index` after changing docs/, ' +
    'or `npm run docs:check-index` to verify this file is current (both run from the repo root; ' +
    'CI runs the check). See [`README.md`](README.md) for the ID convention this reflects.',
);
lines.push('');
lines.push(
  'One entry per file. Use this to find _what exists and where_ before opening full files — it ' +
    'carries titles and locations only, not content, acceptance criteria, or status.',
);
lines.push('');

for (const file of orderedFiles) {
  const group = byFile.get(file);
  const href = buildHref(indexFile, file, null);
  lines.push(`## [${group.fileId}](${href}) — ${group.fileTitle}`);
  lines.push('');
  const items = [...group.items].sort((a, b) => naturalCompare(a.id, b.id));
  for (const item of items) {
    const itemHref = buildHref(indexFile, file, item.anchor);
    lines.push(`- [${item.id}](${itemHref}) — ${item.title}`);
  }
  if (items.length > 0) lines.push('');
}

const content = lines.join('\n').replace(/\n+$/, '\n');

if (MODE === 'generate') {
  fs.writeFileSync(indexFile, content);
  console.log(`docs-index generate: wrote ${path.relative(repoRoot, indexFile)}.`);
} else {
  const current = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
  if (current !== content) {
    console.error('docs-index check: docs/INDEX.md is stale. Run "npm run docs:generate-index".');
    process.exit(1);
  }
  console.log('docs-index check: docs/INDEX.md is current.');
}

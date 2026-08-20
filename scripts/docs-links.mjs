#!/usr/bin/env node
// Cross-reference checker/fixer for docs/**/*.md.
//
// Problem: links between docs are plain relative paths (`../../adr/0022-x.md`).
// Every rename or move requires finding and rewriting every reference by hand.
//
// Fix: stable IDs (ADR-0022, REQ-IMP-003, M1.2, US-ANL-01) are derived from
// filenames and headings by scripts/docs-registry.mjs — no ID is stored
// anywhere by hand. A link written as `[ADR-0022](anything)` or annotated
// with a `"ref:ID"` title is resolved to its current relative path
// automatically.
//
// Usage:
//   node scripts/docs-links.mjs check   — report broken/stale links, exit 1 if any
//   node scripts/docs-links.mjs sync    — rewrite ID-based links to their current path
//
// See docs/README.md for the authoring convention.

import fs from 'node:fs';
import path from 'node:path';

import {
  buildHref,
  buildRegistry,
  looksLikeId,
  stripCodeFences,
  stripInlineCode,
} from './docs-registry.mjs';

const MODE = process.argv[2];
if (MODE !== 'check' && MODE !== 'sync') {
  console.error('Usage: node scripts/docs-links.mjs <check|sync>');
  process.exit(2);
}

const repoRoot = process.cwd();
const docsRoot = path.join(repoRoot, 'docs');

const { files, registry, getHeadingSlugs } = buildRegistry(docsRoot);

function parseLinkInner(inner) {
  const trimmed = inner.trim();
  const withTitle = trimmed.match(/^(\S+)\s+"([^"]*)"$/) || trimmed.match(/^(\S+)\s+'([^']*)'$/);
  let href = withTitle ? withTitle[1] : trimmed;
  const title = withTitle ? withTitle[2] : undefined;
  if (href.startsWith('<') && href.endsWith('>')) href = href.slice(1, -1);
  return { href, title };
}

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

let problems = 0;
let fixedLinks = 0;
let fixedFiles = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');
  const strippedForScan = stripCodeFences(lines).map(stripInlineCode);
  let changed = false;
  const relFile = path.relative(repoRoot, file);

  for (let i = 0; i < lines.length; i++) {
    const scanLine = strippedForScan[i];
    if (!scanLine) continue;

    lines[i] = lines[i].replace(LINK_RE, (whole, text, inner, offset) => {
      // Only rewrite if this exact match also exists (unmodified) in the
      // fence-stripped scan line, i.e. it's a real link, not inside a fence.
      if (scanLine.slice(offset, offset + whole.length) !== whole) return whole;

      const { href, title } = parseLinkInner(inner);
      if (/^(https?:|mailto:)/.test(href)) return whole;

      // Same-file anchor link, not part of the ID system.
      if (href.startsWith('#')) {
        const anchor = href.slice(1);
        if (anchor && !getHeadingSlugs(file)?.has(anchor)) {
          console.error(`${relFile}: broken anchor "${href}" (heading not found in this file)`);
          problems++;
        }
        return whole;
      }

      const refMatch = title?.match(/^ref:(\S+)$/);
      const textId = text.trim();
      const id = refMatch ? refMatch[1] : looksLikeId(textId) ? textId : null;

      if (id) {
        const entry = registry.get(id);
        if (!entry) {
          console.error(`${relFile}: unresolvable ID "${id}" in link ${whole}`);
          problems++;
          return whole;
        }
        const correctHref = buildHref(file, entry.file, entry.anchor);
        if (href === correctHref) return whole;

        if (MODE === 'sync') {
          changed = true;
          fixedLinks++;
          const titlePart = refMatch ? ` "ref:${id}"` : '';
          return `[${text}](${correctHref}${titlePart})`;
        }
        console.error(`${relFile}: stale link for ${id}: "${href}" -> "${correctHref}"`);
        problems++;
        return whole;
      }

      // Descriptive link, not ID-tagged: just verify the target resolves.
      const [hrefPath, hrefAnchor] = href.split('#');
      const targetAbs = path.resolve(path.dirname(file), hrefPath);
      if (!fs.existsSync(targetAbs)) {
        console.error(`${relFile}: broken link -> "${href}" (file not found)`);
        problems++;
        return whole;
      }
      if (hrefAnchor && !getHeadingSlugs(targetAbs)?.has(hrefAnchor)) {
        console.error(`${relFile}: broken anchor -> "${href}" (heading not found in target)`);
        problems++;
      }
      return whole;
    });
  }

  if (changed && MODE === 'sync') {
    fs.writeFileSync(file, lines.join('\n'));
    fixedFiles++;
  }
}

if (MODE === 'sync') {
  console.log(`docs-links sync: fixed ${fixedLinks} link(s) across ${fixedFiles} file(s).`);
  if (problems > 0) {
    console.error(`docs-links sync: ${problems} link(s) could not be resolved, see above.`);
    process.exit(1);
  }
} else {
  if (problems > 0) {
    console.error(`docs-links check: ${problems} problem(s) found. Run "npm run docs:sync-links".`);
    process.exit(1);
  }
  console.log(`docs-links check: ${files.length} file(s), no problems found.`);
}

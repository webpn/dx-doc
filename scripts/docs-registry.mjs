// Shared ID derivation for docs/**/*.md, used by docs-links.mjs (checks/fixes
// links) and docs-index.mjs (generates docs/INDEX.md). One scan, one set of
// rules — see docs/README.md for what the IDs mean and how they're derived.

import fs from 'node:fs';
import path from 'node:path';

export const ID_PATTERNS = [
  /^ADR-\d{4}$/,
  /^REQ-[A-Z]+-\d+$/,
  /^REQ-[A-Z]+$/,
  /^M\d+\.\d+$/,
  /^US-[A-Z]+-\d+$/,
];

export function looksLikeId(text) {
  return ID_PATTERNS.some((re) => re.test(text));
}

// GitHub slugs the *rendered* heading text, so inline markdown (emphasis,
// code spans, links) must be stripped before slugifying, not just filtered
// as punctuation — `_Editor_` becomes "editor", not "_editor_".
export function stripInlineMarkdown(text) {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/_([^_]*)_/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

export function githubSlug(headingText) {
  return stripInlineMarkdown(headingText)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

export function walkMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

export function deriveFileId(docsRoot, absFile) {
  const rel = path.relative(docsRoot, absFile).replace(/\\/g, '/');

  let m = rel.match(/^adr\/(\d{4})-[^/]+\.md$/);
  if (m) return `ADR-${m[1]}`;

  m = rel.match(/^product\/requirements\/(REQ-[A-Z]+)\.md$/);
  if (m) return m[1];

  let generic = rel.replace(/^product\//, '').replace(/\.md$/, '');
  if (/\/README$/i.test(generic)) generic = generic.replace(/\/README$/i, '');
  else if (/^README$/i.test(generic)) generic = '';
  generic = generic.replace(/\//g, '-');
  return generic || 'docs';
}

// Strip fenced code blocks (``` or ~~~) so example snippets in docs never get
// parsed as real links or headings.
export function stripCodeFences(lines) {
  const kept = [];
  let inFence = false;
  for (const rawLine of lines) {
    // Strip a trailing CR so a CRLF checkout behaves like an LF one. Without
    // this, `/^(#{1,6})\s+(.*)$/` never matches (`.` excludes \r, and `$` is
    // not multiline), so no heading is ever detected and every ID-based link
    // reports as unresolvable.
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      kept.push('');
      continue;
    }
    kept.push(inFence ? '' : line);
  }
  return kept;
}

// Blank out inline code spans (`...`) so example link syntax inside them is
// never parsed as a real link. Applied after fenced blocks are stripped.
// Replaces span contents with spaces to preserve column offsets, which
// docs-links.mjs relies on to map a match back to the raw line.
export function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
}

// A heading can cover a contiguous range, e.g. "REQ-NFR-001 … REQ-NFR-004 —
// Performance targets" documents four requirements under one anchor.
export function expandIdRange(startId, endId) {
  const m1 = startId.match(/^(.*-)(\d+)$/);
  const m2 = endId.match(/^(.*-)(\d+)$/);
  if (!m1 || !m2 || m1[1] !== m2[1]) return [startId];
  const [, prefix, startDigits] = m1;
  const end = parseInt(m2[2], 10);
  const start = parseInt(startDigits, 10);
  if (end < start || end - start > 50) return [startId];
  const ids = [];
  for (let n = start; n <= end; n++) ids.push(prefix + String(n).padStart(startDigits.length, '0'));
  return ids;
}

// Strips a leading "ID — " / "ID: " / "ID " prefix (if present) from heading
// text, leaving a clean human title.
function extractTitle(headingText, prefixToStrip) {
  let rest = headingText;
  if (prefixToStrip && rest.startsWith(prefixToStrip)) rest = rest.slice(prefixToStrip.length);
  rest = rest.replace(/^[\s:—–-]+/, '');
  return stripInlineMarkdown(rest || headingText).trim();
}

const ID_TOKEN = /(REQ-[A-Z]+-\d+|M\d+\.\d+|US-[A-Z]+-\d+|ADR-\d{4})/;
const RANGE_HEADING = new RegExp(`^${ID_TOKEN.source}\\s*[…]\\s*${ID_TOKEN.source}\\b`);
const SINGLE_HEADING = new RegExp(`^${ID_TOKEN.source}\\b`);

// Scans docs/**/*.md once and returns:
//   files      — every markdown file under docsRoot
//   registry   — id -> { file, anchor: string|null, title: string }
//   getHeadingSlugs(absFile) — lazy, cached Set<slug> for any .md file (in or
//                              out of docsRoot), or null if the file is missing
export function buildRegistry(docsRoot) {
  const files = walkMarkdownFiles(docsRoot);
  const registry = new Map();
  const headingSlugs = new Map();

  function getHeadingSlugs(absFile) {
    if (headingSlugs.has(absFile)) return headingSlugs.get(absFile);
    if (!fs.existsSync(absFile)) {
      headingSlugs.set(absFile, null);
      return null;
    }
    const lines = stripCodeFences(fs.readFileSync(absFile, 'utf8').split('\n'));
    const slugs = new Set();
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) slugs.add(githubSlug(headingMatch[2].trim()));
    }
    headingSlugs.set(absFile, slugs);
    return slugs;
  }

  for (const file of files) {
    const fileId = deriveFileId(docsRoot, file);
    const lines = stripCodeFences(fs.readFileSync(file, 'utf8').split('\n'));
    getHeadingSlugs(file); // populate the cache for this file up front

    // File-level id is registered first (anchor: null, whole file) so it
    // wins over any heading later in the file that happens to repeat the
    // same id (e.g. an ADR's H1 restates "ADR-0022" as heading text).
    const firstHeadingMatch = lines.find((l) => /^(#{1,6})\s+(.*)$/.test(l));
    const firstHeadingText = firstHeadingMatch
      ? firstHeadingMatch.match(/^(#{1,6})\s+(.*)$/)[2].trim()
      : null;
    if (!registry.has(fileId)) {
      const title = firstHeadingText ? extractTitle(firstHeadingText, fileId) : fileId;
      registry.set(fileId, { file, anchor: null, title });
    }

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (!headingMatch) continue;
      const headingText = headingMatch[2].trim();
      const slug = githubSlug(headingText);

      const rangeMatch = headingText.match(RANGE_HEADING);
      if (rangeMatch) {
        const ids = expandIdRange(rangeMatch[1], rangeMatch[2]);
        const title = extractTitle(headingText.replace(RANGE_HEADING, ''), null);
        for (const id of ids) {
          if (!registry.has(id)) registry.set(id, { file, anchor: slug, title });
        }
        continue;
      }

      const singleMatch = headingText.match(SINGLE_HEADING);
      if (singleMatch) {
        const id = singleMatch[1];
        if (!registry.has(id)) {
          registry.set(id, { file, anchor: slug, title: extractTitle(headingText, id) });
        }
      }
    }
  }

  return { files, registry, getHeadingSlugs };
}

// Relative href from one docs file to another, honouring the id's anchor.
export function buildHref(fromFile, toFile, anchor) {
  if (fromFile === toFile) return anchor ? `#${anchor}` : '#';
  const rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  return anchor ? `${rel}#${anchor}` : rel;
}

// Natural sort for IDs with numeric components (M1.2 < M1.10, REQ-IMP-002 <
// REQ-IMP-010), where plain string comparison gets the order wrong.
export function naturalCompare(a, b) {
  const ax = a.match(/(\d+)|(\D+)/g) ?? [];
  const bx = b.match(/(\d+)|(\D+)/g) ?? [];
  const len = Math.max(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const x = ax[i] ?? '';
    const y = bx[i] ?? '';
    if (x === y) continue;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) return parseInt(x, 10) - parseInt(y, 10);
    return x < y ? -1 : 1;
  }
  return 0;
}

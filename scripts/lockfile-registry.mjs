#!/usr/bin/env node
// Registry checker/normaliser for package-lock.json.
//
// Problem: `npm install` writes the *configured* registry into every `resolved`
// URL it touches. On a workstation behind a corporate mirror the lockfile
// therefore fills up with internal hosts, and `npm ci` honours those URLs
// verbatim. The failure lands far from the cause: a runner that cannot resolve
// the internal host hangs on the socket and npm exits with "Exit handler never
// called!", which reads like an npm bug rather than a lockfile that points
// somewhere unreachable. dx-doc is a public repository, so the same lockfile
// also has to install for contributors who have never heard of the mirror.
//
// Fix: `resolved` must always name the public registry. Only the host is
// rewritten — versions and `integrity` hashes are untouched, because a mirror
// serves the identical tarball and the hash is of the content, not the URL.
//
// Usage:
//   node scripts/lockfile-registry.mjs check      — report internal hosts, exit 1 if any
//   node scripts/lockfile-registry.mjs normalize   — rewrite them to the public registry
//
// The pair mirrors docs:check-links / docs:sync-links: the check belongs in the
// gate, the normaliser is what you run to satisfy it.

import fs from 'node:fs';
import path from 'node:path';

const MODE = process.argv[2];
if (MODE !== 'check' && MODE !== 'normalize') {
  console.error('Usage: node scripts/lockfile-registry.mjs <check|normalize>');
  process.exit(2);
}

const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';
const lockfilePath = path.join(process.cwd(), 'package-lock.json');

if (!fs.existsSync(lockfilePath)) {
  console.error(`Not found: ${lockfilePath}`);
  process.exit(2);
}

const original = fs.readFileSync(lockfilePath, 'utf8');

// Match the string value of every "resolved" key. Operating on text rather than
// a parsed tree keeps the rewrite provably local: nothing outside these string
// literals can change, so a bug here cannot reorder keys or drop a field.
const RESOLVED_PATTERN = /("resolved":\s*")([^"]+)(")/g;

/** Registry-hosted tarball URLs are the only ones in scope. */
function isRegistryTarball(url) {
  return /^https?:\/\//.test(url) && url.endsWith('.tgz');
}

const offending = [];
for (const match of original.matchAll(RESOLVED_PATTERN)) {
  const url = match[2];
  if (!isRegistryTarball(url)) continue;
  if (url.startsWith(PUBLIC_REGISTRY)) continue;
  offending.push(url);
}

if (offending.length === 0) {
  console.log('package-lock.json: every resolved URL points at the public registry.');
  process.exit(0);
}

/**
 * The registry root is the prefix all of a host's tarball URLs share — for a
 * typical mirror, `https://host/<some>/<path>/`. Deriving it instead of
 * hard-coding it means no mirror layout is baked in, and trimming back to the
 * last `/` stops a coincidental character match from eating a package name.
 */
function registryRoot(urls) {
  let prefix = urls[0];
  for (const url of urls.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < url.length && prefix[i] === url[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix.slice(0, prefix.lastIndexOf('/') + 1);
}

const byOrigin = new Map();
for (const url of offending) {
  const { origin } = new URL(url);
  const list = byOrigin.get(origin);
  if (list === undefined) byOrigin.set(origin, [url]);
  else list.push(url);
}

const roots = [...byOrigin.values()].map((urls) => registryRoot(urls));

// Deliberately reports counts and never the offending hostnames. This runs in
// CI, whose logs are world-readable on a public repository, and a mirror's
// hostname is internal infrastructure — the very thing the check exists to keep
// out of the repo. It is also not actionable: the fix is the same command
// whatever the mirror is called.
if (MODE === 'check') {
  console.error(
    `package-lock.json: ${offending.length} resolved URL(s) across ` +
      `${byOrigin.size} host(s) point at a non-public registry.`,
  );
  console.error('`npm ci` cannot reach these outside the network that produced them.');
  console.error('Fix with: npm run lockfile:normalize');
  process.exit(1);
}

let rewritten = 0;
const unmapped = [];
const updated = original.replace(RESOLVED_PATTERN, (whole, open, url, close) => {
  if (!isRegistryTarball(url) || url.startsWith(PUBLIC_REGISTRY)) return whole;
  const root = roots.find((candidate) => url.startsWith(candidate));
  if (root === undefined) {
    unmapped.push(url);
    return whole;
  }
  const suffix = url.slice(root.length);
  // A registry tarball path is always `<name>/-/<file>.tgz`. Refusing anything
  // else keeps a mirror with an unexpected layout from being silently mangled
  // into a URL that 404s at install time.
  if (!suffix.includes('/-/')) {
    unmapped.push(url);
    return whole;
  }
  rewritten += 1;
  return `${open}${PUBLIC_REGISTRY}${suffix}${close}`;
});

if (unmapped.length > 0) {
  console.error(`Could not map ${unmapped.length} URL(s) to the public registry:`);
  // Path only, for the same reason the check reports no hostnames: it names the
  // package without naming the mirror.
  for (const url of unmapped.slice(0, 10)) console.error(`  ${new URL(url).pathname}`);
  console.error('Nothing was written. Resolve these by hand or regenerate the lockfile.');
  process.exit(1);
}

fs.writeFileSync(lockfilePath, updated);
console.log(
  `package-lock.json: rewrote ${rewritten} resolved URL(s) from ` +
    `${byOrigin.size} host(s) to ${PUBLIC_REGISTRY}`,
);
console.log('Versions and integrity hashes are unchanged: only the host moved.');

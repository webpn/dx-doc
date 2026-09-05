/**
 * System-generated slugs for project/page entities (auto-managed-slugs).
 * Pure helpers, dependency-free: the service supplies parent scoping through
 * the `exists` callback, and DB unique constraints stay the race backstop.
 */

const MAX_SLUG_LENGTH = 120;

const FALLBACK_SLUG = 'untitled';

/**
 * Derives the base slug from an entity name: NFKD normalization with
 * diacritics stripped, lowercased, non-alphanumerics folded to hyphens,
 * collapsed/trimmed, truncated to 120 chars. Names with no slug-safe
 * characters fall back to `"untitled"` so the stored slug is never empty.
 */
export function slugify(name: string): string {
  const folded = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return folded === '' ? FALLBACK_SLUG : folded;
}

/**
 * Resolves a unique slug within the caller's scope: `base`, then `base-2`,
 * `base-3`, … until `exists` reports a miss. Suffixed candidates reserve
 * room for the suffix so every result fits 120 characters.
 */
export async function resolveUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<unknown>,
): Promise<string> {
  const truncatedBase = base.slice(0, MAX_SLUG_LENGTH);
  if (!(await exists(truncatedBase))) {
    return truncatedBase;
  }
  let counter = 2;
  for (;;) {
    const suffix = `-${String(counter)}`;
    const candidate = `${truncatedBase.slice(0, MAX_SLUG_LENGTH - suffix.length)}${suffix}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
    counter += 1;
  }
}

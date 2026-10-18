import { describe, expect, it } from 'vitest';

import { resolveUniqueSlug, slugify } from './slug';

describe('slugify (auto-managed-slugs)', () => {
  it('derives lowercase-hyphen form from the name', () => {
    expect(slugify('Checkout Funnel')).toBe('checkout-funnel');
  });

  it('strips diacritics via unicode normalization', () => {
    expect(slugify('Café Münchén')).toBe('cafe-munchen');
  });

  it('falls back to untitled when nothing slug-safe remains', () => {
    expect(slugify('')).toBe('untitled');
    expect(slugify('!!!')).toBe('untitled');
    expect(slugify('   ')).toBe('untitled');
  });

  it('truncates to 120 characters', () => {
    const slug = slugify('a'.repeat(200));

    expect(slug).toBe('a'.repeat(120));
  });

  it('collapses separators and trims edge hyphens', () => {
    expect(slugify('  Hello -- World__Foo  ')).toBe('hello-world-foo');
  });
});

describe('resolveUniqueSlug (auto-managed-slugs)', () => {
  it('returns the base when it is free', async () => {
    await expect(resolveUniqueSlug('checkout-funnel', () => Promise.resolve(null))).resolves.toBe(
      'checkout-funnel',
    );
  });

  it('appends a numeric suffix on collision', async () => {
    const taken = new Set(['checkout-funnel', 'checkout-funnel-2']);

    await expect(
      resolveUniqueSlug('checkout-funnel', (slug: string) => Promise.resolve(taken.has(slug))),
    ).resolves.toBe('checkout-funnel-3');
  });

  it('keeps suffixed candidates within 120 characters', async () => {
    const base = 'a'.repeat(120);

    const slug = await resolveUniqueSlug(base, (candidate: string) =>
      Promise.resolve(candidate === base ? true : null),
    );

    expect(slug).toHaveLength(120);
    expect(slug.endsWith('-2')).toBe(true);
  });
});

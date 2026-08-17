import { describe, expect, it } from 'vitest';

import { projectCreateSchema, pageCreateSchema } from './schemas';
import { validate } from './validate';

describe('validate (REQ-FDN-010)', () => {
  it('accepts a valid project create and returns the typed value', () => {
    const result = validate(projectCreateSchema, {
      name: 'Web analytics',
      slug: 'web-analytics',
      platform: 'web',
      customId: 'source:tracking:web',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Web analytics');
      expect(result.value.customId).toBe('source:tracking:web');
    }
  });

  it('returns a uniform issue per offending field (blank name, bad slug, bad platform)', () => {
    const result = validate(projectCreateSchema, {
      name: '',
      slug: 'Bad Slug!',
      platform: 'banana',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issues = result.error;
      expect(issues.map((i) => i.field).sort()).toEqual(['name', 'platform', 'slug']);
      for (const issue of issues) {
        expect(typeof issue.field).toBe('string');
        expect(typeof issue.code).toBe('string');
        expect(typeof issue.message).toBe('string');
      }
    }
  });

  it('rejects an empty custom_id but accepts a valid one', () => {
    expect(
      validate(projectCreateSchema, { name: 'A', slug: 'a', platform: 'web', customId: '' }).ok,
    ).toBe(false);
    expect(
      validate(projectCreateSchema, { name: 'A', slug: 'a', platform: 'web', customId: 'x' }).ok,
    ).toBe(true);
  });

  it('strips unknown fields rather than failing', () => {
    const result = validate(projectCreateSchema, {
      name: 'A',
      slug: 'a',
      platform: 'web',
      surprise: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('surprise' in result.value).toBe(false);
    }
  });

  it('rejects a page with a parent that is empty', () => {
    const result = validate(pageCreateSchema, { name: 'Home', slug: 'home', parentId: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((i) => i.field === 'parentId')).toBe(true);
    }
  });

  it('accepts a valid page create', () => {
    const result = validate(pageCreateSchema, { name: 'Home', slug: 'home' });

    expect(result.ok).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import {
  companyCreateSchema,
  pageCreateSchema,
  pageUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from './schemas';
import { validate } from './validate';

describe('validate (REQ-FDN-010)', () => {
  it('accepts a valid project create and returns the typed value', () => {
    const result = validate(projectCreateSchema, {
      name: 'Web analytics',
      platform: 'web',
      customId: 'source:tracking:web',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Web analytics');
      expect(result.value.customId).toBe('source:tracking:web');
    }
  });

  it('returns a uniform issue per offending field (blank name, supplied slug, bad platform)', () => {
    const result = validate(projectCreateSchema, {
      name: '',
      slug: 'web-analytics',
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
      validate(projectCreateSchema, { name: 'A', platform: 'web', customId: '' }).ok,
    ).toBe(false);
    expect(validate(projectCreateSchema, { name: 'A', platform: 'web', customId: 'x' }).ok).toBe(
      true,
    );
  });

  it('strips unknown fields rather than failing', () => {
    const result = validate(projectCreateSchema, {
      name: 'A',
      platform: 'web',
      surprise: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('surprise' in result.value).toBe(false);
    }
  });

  it('rejects a page with a parent that is empty', () => {
    const result = validate(pageCreateSchema, { name: 'Home', parentId: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((i) => i.field === 'parentId')).toBe(true);
    }
  });

  it('accepts a valid page create', () => {
    const result = validate(pageCreateSchema, { name: 'Home' });

    expect(result.ok).toBe(true);
  });
});

describe('validate — system-generated project/page slugs (auto-managed-slugs)', () => {
  it('accepts a project create without a slug', () => {
    expect(validate(projectCreateSchema, { name: 'Web analytics', platform: 'web' }).ok).toBe(
      true,
    );
  });

  it('accepts a page create without a slug', () => {
    expect(validate(pageCreateSchema, { name: 'Home' }).ok).toBe(true);
  });

  it('rejects a slug in project create and update bodies', () => {
    for (const schema of [projectCreateSchema, projectUpdateSchema]) {
      const result = validate(schema, { name: 'Web analytics', slug: 'web-analytics' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((i) => i.field === 'slug')).toBe(true);
      }
    }
  });

  it('rejects a slug in page create and update bodies', () => {
    for (const schema of [pageCreateSchema, pageUpdateSchema]) {
      const result = validate(schema, { name: 'Home', slug: 'home' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.some((i) => i.field === 'slug')).toBe(true);
      }
    }
  });

  it('keeps the company slug user-supplied', () => {
    const result = validate(companyCreateSchema, { name: 'Acme', slug: 'acme' });

    expect(result.ok).toBe(true);
  });
});

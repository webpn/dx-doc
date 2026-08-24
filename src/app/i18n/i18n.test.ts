/**
 * REQ-NFR-010 / REQ-NFR-012 — the translation seam.
 *
 * English is the source of truth and the only locale shipped in R1; the point
 * of this seam is that a translation could be dropped in later without
 * touching a screen. These tests pin the four properties that makes true:
 * lookup, typed interpolation, fallback to English for a key a translation
 * omits, and Intl-derived date/number formatting driven by the active locale.
 *
 * Formatter assertions compare against `Intl` output computed in the test
 * rather than a hard-coded string: ICU data shifts between Node releases, and
 * a test that hard-codes 'Jan 5, 2026' fails on an ICU bump while telling us
 * nothing about our own code. What we own is *that we delegate to Intl with
 * the active locale*, which is what these assert.
 */
import { describe, expect, it } from 'vitest';

import { ApiClientError, ApiNetworkError } from '../api/client';

import { apiErrorMessageKey } from './api-errors';
import { createTranslator, resolveLocale, SUPPORTED_LOCALES } from './catalogue';
import { createFormatters } from './formatters';
import { en } from './messages/en';

describe('message catalogue (REQ-NFR-010)', () => {
  it('resolves a key to its English string', () => {
    const t = createTranslator('en');

    expect(t('auth.login.submit')).toBe('Sign in');
  });

  it('interpolates named parameters', () => {
    const t = createTranslator('en');

    expect(t('project.list.countLabel', { count: 3 })).toBe('3 projects');
  });

  it('leaves an unmatched placeholder untouched rather than printing undefined', () => {
    // A missing param is a type error at the call site (see the overloads on
    // Translator), so this can only happen via an untyped boundary. Printing
    // 'undefined' into the UI is worse than showing the placeholder, which is
    // self-describing in a bug report. Reaching past the types is the only way
    // to exercise the runtime guard.
    const untyped = createTranslator('en') as (
      key: string,
      params?: Record<string, string | number>,
    ) => string;

    expect(untyped('project.list.countLabel', {})).toBe('{count} projects');
  });

  it('falls back to the English string when a locale omits the key', () => {
    // The test fixture locale deliberately translates only one key.
    const t = createTranslator('qps');

    expect(t('auth.login.submit')).toBe('[qps] Sign in');
    expect(t('auth.login.emailLabel')).toBe(en['auth.login.emailLabel']);
  });

  it('lists English first among the supported locales', () => {
    expect(SUPPORTED_LOCALES[0]).toBe('en');
  });

  it('resolves an unknown or absent locale tag to English', () => {
    // APP_DEFAULT_LOCALE is 'en' (ADR-0014). Per-company supported locales and
    // the per-user profile locale are not implemented yet; when they are, they
    // feed this function rather than replacing it.
    expect(resolveLocale('kl-GL')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('qps')).toBe('qps');
  });
});

describe('Intl formatters (REQ-NFR-012)', () => {
  const iso = '2026-01-05T14:30:00.000Z';

  it('formats a date using the active locale', () => {
    const enFormat = createFormatters('en').formatDate(iso);

    expect(enFormat).toBe(
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(iso)),
    );
  });

  it('formats a date differently for a locale with a different convention', () => {
    // en and en-GB order day and month differently, which is the whole point
    // of REQ-NFR-012: the format follows the locale, not the content.
    const us = createFormatters('en').formatDate(iso);
    const gb = createFormatters('en-GB').formatDate(iso);

    expect(us).not.toBe(gb);
  });

  it('formats a date and time using the active locale', () => {
    expect(createFormatters('en').formatDateTime(iso)).toBe(
      new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(iso)),
    );
  });

  it('formats a number using the active locale', () => {
    expect(createFormatters('en').formatNumber(1234.5)).toBe(
      new Intl.NumberFormat('en').format(1234.5),
    );
  });

  it('reuses the same Intl instance for repeated calls on one locale', () => {
    // Constructing Intl.DateTimeFormat is genuinely expensive; a list screen
    // formatting a date per row must not build one per cell.
    const formatters = createFormatters('en');

    expect(formatters.dateFormatterFor('medium')).toBe(formatters.dateFormatterFor('medium'));
  });

  it('renders an invalid date as an em dash instead of "Invalid Date"', () => {
    expect(createFormatters('en').formatDate('not-a-date')).toBe('—');
  });
});

describe('API error to message key (REQ-NFR-010)', () => {
  it('maps a 401 to the invalid-credentials message', () => {
    const key = apiErrorMessageKey(
      new ApiClientError(401, { code: 'INVALID_CREDENTIALS', message: 'nope' }),
    );

    expect(createTranslator('en')(key)).toBe('Invalid email or password.');
  });

  it('maps a network failure to the unreachable-server message', () => {
    const key = apiErrorMessageKey(new ApiNetworkError(new Error('offline')));

    expect(createTranslator('en')(key)).toBe(
      'Unable to reach the server. Check your connection and try again.',
    );
  });

  it('maps an unrecognised error to a generic message rather than leaking a raw string', () => {
    expect(apiErrorMessageKey(new Error('kaboom'))).toBe('error.unexpected');
  });

  it('maps a 409 conflict to the concurrent-edit message', () => {
    const key = apiErrorMessageKey(new ApiClientError(409, { code: 'CONFLICT', message: 'stale' }));

    expect(key).toBe('error.conflict');
  });

  it('distinguishes a stale write from another 409 (REQ-AUTH-005)', () => {
    // REQ-AUTH-005 wants a rejected save to state WHAT happened. A stale write
    // and a slug collision are both 409 but have nothing to do with each other,
    // so bucketing them by status alone tells the user something untrue.
    const stale = apiErrorMessageKey(
      new ApiClientError(409, { code: 'STALE_WRITE', message: 'record modified' }),
    );
    const slug = apiErrorMessageKey(
      new ApiClientError(409, { code: 'SLUG_TAKEN', message: 'slug exists' }),
    );

    expect(stale).toBe('error.staleWrite');
    expect(slug).toBe('error.slugTaken');
    expect(stale).not.toBe(slug);
  });

  it('maps a delete blocked by references to its own message (ADR-0025)', () => {
    const key = apiErrorMessageKey(
      new ApiClientError(409, { code: 'IN_USE', message: 'still in use' }),
    );

    expect(key).toBe('error.inUse');
  });
});

/**
 * Locale-aware date and number formatting (REQ-NFR-012).
 *
 * Formats derive from the active locale independently of content language,
 * which is why these are keyed off `Locale` and not off the message catalogue.
 * Everything delegates to `Intl` — we do not hand-roll formats.
 *
 * `Intl.DateTimeFormat` construction is genuinely expensive (it resolves ICU
 * data), so instances are memoised per locale+style. A list screen formatting
 * a date in every row would otherwise build one formatter per cell.
 */

export type DateStyle = 'short' | 'medium' | 'long';

/** Rendered in place of an unparseable date, rather than 'Invalid Date'. */
const INVALID_DATE_PLACEHOLDER = '—';

/**
 * All timestamps crossing the API are UTC ISO-8601 strings. Formatting in UTC
 * keeps a rendered date stable regardless of where the reader sits, which is
 * what a documentation audit trail needs: two people discussing "the 5 Jan
 * version" must mean the same snapshot. Per-user timezone display is not a
 * current requirement; when it becomes one, it belongs here.
 */
const TIME_ZONE = 'UTC';

export interface Formatters {
  formatDate: (iso: string, style?: DateStyle) => string;
  formatDateTime: (iso: string) => string;
  formatNumber: (value: number) => string;
  /** Exposed so tests can assert instances are reused rather than rebuilt. */
  dateFormatterFor: (style: DateStyle) => Intl.DateTimeFormat;
}

/**
 * `locale` is a plain BCP-47 tag rather than the `Locale` union: formatting is
 * independent of which locales we ship translations for (REQ-NFR-012 — formats
 * derive from the user's profile locale, not the content language), so a user
 * can read English UI with German dates.
 */
export function createFormatters(locale: string): Formatters {
  const dateFormatters = new Map<DateStyle, Intl.DateTimeFormat>();
  let dateTimeFormatter: Intl.DateTimeFormat | undefined;
  let numberFormatter: Intl.NumberFormat | undefined;

  function dateFormatterFor(style: DateStyle): Intl.DateTimeFormat {
    const existing = dateFormatters.get(style);
    if (existing !== undefined) return existing;
    const created = new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: TIME_ZONE });
    dateFormatters.set(style, created);
    return created;
  }

  function parse(iso: string): Date | null {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return {
    dateFormatterFor,
    formatDate: (iso, style = 'medium') => {
      const date = parse(iso);
      return date === null ? INVALID_DATE_PLACEHOLDER : dateFormatterFor(style).format(date);
    },
    formatDateTime: (iso) => {
      const date = parse(iso);
      if (date === null) return INVALID_DATE_PLACEHOLDER;
      dateTimeFormatter ??= new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: TIME_ZONE,
      });
      return dateTimeFormatter.format(date);
    },
    formatNumber: (value) => {
      numberFormatter ??= new Intl.NumberFormat(locale);
      return numberFormatter.format(value);
    },
  };
}

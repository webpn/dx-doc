import { en } from './messages/en';
import { qps } from './messages/qps';

/**
 * The translation seam (REQ-NFR-010).
 *
 * English is the source of truth: `MessageKey` is derived from the English
 * catalogue, so referencing a key that does not exist is a compile error, and
 * a locale is typed against the same object so a complete translation cannot
 * silently omit one.
 *
 * This is deliberately ~100 lines of plain TypeScript rather than a library.
 * R1 ships English only (ADR-0014) and the dependency policy in
 * ENGINEERING_GUIDE.md asks for justification; the whole requirement here is
 * "no string is inline", which needs a catalogue and a lookup, not an ICU
 * message-format engine. The public shape (`t('key', params)`) is conventional
 * enough that swapping in react-i18next later is a mechanical change confined
 * to this folder.
 */

/** Every message key that exists, derived from the English catalogue. */
export type MessageKey = keyof typeof en;

/** A complete translation. Omitting a key is a compile error. */
export type Translation = Record<MessageKey, string>;

/**
 * Extracts `{placeholder}` names from a message's English text as a union, so
 * the params object for a given key is typed from the text itself. A message
 * with no placeholder takes no params.
 */
type PlaceholderNames<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholderNames<Rest>
  : never;

/** The params required to render `K` — `never` when the message has none. */
export type MessageParams<K extends MessageKey> = Record<
  PlaceholderNames<(typeof en)[K]>,
  string | number
>;

/** Keys whose English text contains at least one `{placeholder}`. */
export type KeyWithParams = {
  [K in MessageKey]: PlaceholderNames<(typeof en)[K]> extends never ? never : K;
}[MessageKey];

/** Keys that render with no params at all. */
export type KeyWithoutParams = Exclude<MessageKey, KeyWithParams>;

/**
 * Locales the client knows about. English first — it is the default
 * (`APP_DEFAULT_LOCALE`, ADR-0014) and every other locale falls back to it.
 * `qps` is a test-only pseudo-locale; see ./messages/qps.ts.
 */
export const SUPPORTED_LOCALES = ['en', 'en-GB', 'qps'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Catalogues per locale. `en-GB` intentionally has no message overrides: it
 * exists so date and number formats can follow British convention
 * (REQ-NFR-012) while the text stays the shared English source — the two are
 * independent by design, which is exactly what REQ-NFR-011/012 separate.
 */
const CATALOGUES: Record<Locale, Partial<Translation>> = {
  en,
  'en-GB': {},
  qps,
};

/**
 * Narrows an arbitrary tag to a supported locale, falling back to English.
 *
 * Per-company supported locales and the per-user profile locale (REQ-NFR-010,
 * ADR-0014) are NOT implemented yet. When they are, they resolve to a tag and
 * pass it here — this function stays the single place an untrusted tag becomes
 * a `Locale`, so the fallback rule lives in one spot.
 */
export function resolveLocale(tag: string | undefined): Locale {
  if (tag === undefined) return 'en';
  const match = SUPPORTED_LOCALES.find((candidate) => candidate === tag);
  return match ?? 'en';
}

function interpolate(
  template: string,
  params: Record<string, string | number> | undefined,
): string {
  if (params === undefined) return template;
  // An unmatched placeholder is left verbatim rather than replaced with
  // 'undefined': the placeholder name is self-describing in a screenshot or a
  // bug report, where 'undefined' is not.
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * Renders messages for one locale, falling back to English per key.
 *
 * Two overloads rather than one variadic signature: a key with no placeholder
 * must reject a params argument, and a key with one must require it. A single
 * signature using a conditional rest tuple collapses to "params optional" as
 * soon as the key is a variable rather than a literal, which loses exactly the
 * guarantee this exists for.
 */
export interface Translator {
  (key: KeyWithoutParams): string;
  <K extends KeyWithParams>(key: K, params: MessageParams<K>): string;
}

export function createTranslator(locale: Locale): Translator {
  const catalogue = CATALOGUES[locale];
  function translate(key: MessageKey, params?: Record<string, string | number>): string {
    // Fallback is per key, not per locale: a partial translation shows its
    // translated strings and English for the rest, which is more useful than
    // refusing to use the locale at all.
    const template = catalogue[key] ?? en[key];
    return interpolate(template, params);
  }
  return translate;
}

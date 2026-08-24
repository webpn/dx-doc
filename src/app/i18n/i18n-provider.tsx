import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

import { createTranslator, resolveLocale, type Locale, type Translator } from './catalogue';
import { createFormatters, type Formatters } from './formatters';

/**
 * Locale context for the client (REQ-NFR-010, REQ-NFR-012).
 *
 * This is React context rather than a Zustand store on purpose: per ADR-0013,
 * Zustand holds cross-feature UI state that components mutate. The active
 * locale is neither server state nor mutable UI state — it is ambient
 * configuration handed down from the shell, which is exactly what context is
 * for. Nothing here writes.
 *
 * The provider takes the locale as a prop; it never reads instance config
 * itself, because `src/app/` must not import from `src/infrastructure/`
 * (AGENTS.md). The shell resolves the tag and passes it in.
 */

interface I18nContextValue {
  locale: Locale;
  t: Translator;
  formatters: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  /**
   * Active locale tag. Anything unrecognised resolves to English, so a value
   * coming from a company setting or user profile (REQ-NFR-010 — not
   * implemented yet) can be passed through unvalidated.
   */
  locale?: string | undefined;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps): ReactElement {
  const value = useMemo<I18nContextValue>(() => {
    const resolved = resolveLocale(locale);
    return {
      locale: resolved,
      t: createTranslator(resolved),
      // Memoised together with the translator so the Intl instances inside
      // survive re-renders; rebuilding them per render is the cost this
      // avoids.
      formatters: createFormatters(resolved),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (value === null) {
    // Failing loudly beats rendering raw keys: a screen mounted outside the
    // provider is a wiring bug, and silently falling back to English would
    // hide it until a translation was added.
    throw new Error('useTranslate/useFormatters must be used inside <I18nProvider>.');
  }
  return value;
}

/** The translate function for the active locale. */
export function useTranslate(): Translator {
  return useI18n().t;
}

/** Locale-aware date and number formatters (REQ-NFR-012). */
export function useFormatters(): Formatters {
  return useI18n().formatters;
}

/** The resolved active locale, for the rare component that needs the tag. */
export function useLocale(): Locale {
  return useI18n().locale;
}

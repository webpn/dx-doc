import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { I18nProvider } from '../../src/app/i18n';

/**
 * A fresh QueryClient per test with retries disabled, so cache state never
 * leaks between tests and a mocked failure resolves on the first attempt
 * (ADR-0012's testing convention).
 *
 * The i18n provider is included because screens read their strings through it
 * (REQ-NFR-010); `locale` defaults to English, so assertions on visible English
 * text keep working unchanged. Pass `locale` to render a screen in another
 * locale.
 *
 * Pass `routePath` alongside `route` when the screen under test reads URL
 * params: rendering the element directly under a `MemoryRouter` leaves
 * `useParams()` empty however specific `route` looks, because nothing has
 * matched the location against a pattern.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: { route?: string; routePath?: string; locale?: string } = {},
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const { route = '/', routePath, locale } = options;

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <MemoryRouter initialEntries={[route]}>
          {routePath === undefined ? (
            ui
          ) : (
            <Routes>
              <Route element={ui} path={routePath} />
            </Routes>
          )}
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>,
  );
}

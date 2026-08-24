import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@project/design-system/theme.css';

import { App } from './App';
import { I18nProvider } from './i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/*
        No locale prop yet, so this resolves to English (APP_DEFAULT_LOCALE,
        ADR-0014). Per-company supported locales and the per-user profile
        locale (REQ-NFR-010) are not implemented; when they are, the resolved
        tag is passed here and everything below re-renders in that locale.
      */}
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);

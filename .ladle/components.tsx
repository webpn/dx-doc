import type { GlobalProvider } from '@ladle/react';
import { I18nProvider } from '@project/app/i18n';
import '@project/design-system/theme.css';

// Ladle discovers the global provider through the NAMED `Provider` export
// (its AST scan ignores a default export). Keep theme.css + I18nProvider in
// sync with src/app/main.tsx minus QueryClientProvider/router, which the
// example story does not need.
export const Provider: GlobalProvider = ({ children }) => <I18nProvider>{children}</I18nProvider>;

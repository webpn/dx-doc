import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from './routes/auth/login-page';
import { PasswordChangePage } from './routes/auth/password-change-page';
import { PasswordResetConfirmPage } from './routes/auth/password-reset-confirm-page';
import { PasswordResetRequestPage } from './routes/auth/password-reset-request-page';
import { DesignReviewPage } from './routes/design-review-page';
import { AppShell } from './shell/app-shell';
import { ProjectListPage } from './shell/project-list-page';
import { ProjectPage } from './shell/project-page';
import { useSessionStore } from './stores/session-store';

export function App(): ReactElement {
  const session = useSessionStore((state) => state.session);

  if (session === null) {
    return (
      <Routes>
        <Route element={<PasswordResetRequestPage />} path="/password-reset" />
        <Route element={<PasswordResetConfirmPage />} path="/password-reset/confirm" />
        <Route element={<LoginPage />} path="*" />
      </Routes>
    );
  }

  if (session.passwordChangeRequired) {
    return (
      <Routes>
        <Route element={<PasswordChangePage />} path="*" />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<DesignReviewPage />} path="/design-review" />
        <Route element={<ProjectListPage />} path="/" />
        <Route element={<ProjectPage />} path="/projects/:projectId" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

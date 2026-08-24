import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { LoginPage } from './routes/auth/login-page';
import { PasswordChangePage } from './routes/auth/password-change-page';
import { PasswordResetConfirmPage } from './routes/auth/password-reset-confirm-page';
import { PasswordResetRequestPage } from './routes/auth/password-reset-request-page';
import { DesignReviewPage } from './routes/design-review-page';
import { AppShell } from './shell/app-shell';
import { CatalogueCopyPage } from './shell/catalogue-copy-page';
import { CompanyCreatePage } from './shell/company-create-page';
import { DestinationEditorPage } from './shell/destination-editor-page';
import { ModuleEditorPage } from './shell/module-editor-page';
import { PageEditorPage } from './shell/page-editor-page';
import { ProjectAccessPage } from './shell/project-access-page';
import { ProjectCreatePage } from './shell/project-create-page';
import { ProjectListPage } from './shell/project-list-page';
import { ProjectPage } from './shell/project-page';
import { PropertyEditorPage } from './shell/property-editor-page';
import { TemplateEditorPage } from './shell/template-editor-page';
import { TrackingEditorPage } from './shell/tracking-editor-page';
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
        {/* An instance administrator has no company of their own (REQ-SEC-014),
            so the selected company travels in the URL rather than the session. */}
        <Route element={<CompanyCreatePage />} path="/companies/new" />
        <Route element={<ProjectListPage />} path="/companies/:companyId/projects" />
        <Route element={<ProjectCreatePage />} path="/companies/:companyId/projects/new" />
        <Route
          element={<ProjectAccessPage />}
          path="/companies/:companyId/projects/:projectId/access"
        />
        <Route element={<ProjectPage />} path="/projects/:projectId" />
        <Route element={<CatalogueCopyPage />} path="/projects/:projectId/catalogue" />
        <Route
          element={<DestinationEditorPage />}
          path="/projects/:projectId/destinations/:destinationId"
        />
        <Route element={<ModuleEditorPage />} path="/projects/:projectId/modules/:moduleId" />
        <Route element={<PageEditorPage />} path="/projects/:projectId/pages/:pageId" />
        <Route
          element={<PropertyEditorPage />}
          path="/projects/:projectId/properties/:propertyId"
        />
        <Route element={<TemplateEditorPage />} path="/projects/:projectId/templates/:templateId" />
        <Route element={<TrackingEditorPage />} path="/projects/:projectId/trackings/:trackingId" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

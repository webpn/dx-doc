import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { useTranslate } from './i18n';
import { useRestoreSession } from './queries/auth';
import { LoginPage } from './routes/auth/login-page';
import { PasswordChangePage } from './routes/auth/password-change-page';
import { PasswordResetConfirmPage } from './routes/auth/password-reset-confirm-page';
import { PasswordResetRequestPage } from './routes/auth/password-reset-request-page';
import { DesignReviewPage } from './routes/design-review-page';
import { AppShell } from './shell/app-shell';
import { CatalogueCopyPage } from './shell/catalogue-copy-page';
import { CompanyCreatePage } from './shell/company-create-page';
import { CompanyListPage } from './shell/company-list-page';
import { DestinationEditorPage } from './shell/destination-editor-page';
import { FlowCreatePage } from './shell/flow-create-page';
import { FlowEditorPage } from './shell/flow-editor-page';
import { FlowListPage } from './shell/flow-list-page';
import { FreePageCreatePage } from './shell/free-page-create-page';
import { FreePageEditorPage } from './shell/free-page-editor-page';
import { FreePageListPage } from './shell/free-page-list-page';
import { ModuleCreatePage } from './shell/module-create-page';
import { ModuleEditorPage } from './shell/module-editor-page';
import { PageCreatePage } from './shell/page-create-page';
import { PageEditorPage } from './shell/page-editor-page';
import { ProjectAccessPage } from './shell/project-access-page';
import { ProjectCreatePage } from './shell/project-create-page';
import { ProjectListPage } from './shell/project-list-page';
import { ProjectPage } from './shell/project-page';
import { PropertyCreatePage } from './shell/property-create-page';
import { PropertyEditorPage } from './shell/property-editor-page';
import { StepUpPage } from './shell/step-up-page';
import { TemplateEditorPage } from './shell/template-editor-page';
import { TrackingCreatePage } from './shell/tracking-create-page';
import { TrackingEditorPage } from './shell/tracking-editor-page';
import { TriggerEditorPage } from './shell/trigger-editor-page';
import { useSessionStore } from './stores/session-store';

/**
 * Placeholder shown only while `GET /api/auth/me` is in flight on boot. Carries
 * `role="status"` so assistive technology announces the wait rather than
 * reporting an empty page.
 */
function SessionLoading(): ReactElement {
  const t = useTranslate();
  return <div role="status">{t('auth.session.loading')}</div>;
}

export function App(): ReactElement {
  const session = useSessionStore((state) => state.session);
  // The session cookie survives a full page load but this store does not, so on
  // boot the server is asked who the actor is before anything is rendered.
  const { resolved } = useRestoreSession();

  // "Not known yet" is not "signed out": rendering the login page here would
  // flash it over a perfectly good session on every refresh and deep link.
  if (!resolved) {
    return <SessionLoading />;
  }

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
        <Route element={<CompanyListPage />} path="/companies" />
        <Route element={<CompanyCreatePage />} path="/companies/new" />
        <Route element={<ProjectListPage />} path="/companies/:companyId/projects" />
        <Route element={<ProjectCreatePage />} path="/companies/:companyId/projects/new" />
        <Route element={<StepUpPage />} path="/companies/:companyId/step-up" />
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
        <Route element={<ModuleCreatePage />} path="/projects/:projectId/modules/new" />
        <Route element={<ModuleEditorPage />} path="/projects/:projectId/modules/:moduleId" />
        <Route element={<FlowListPage />} path="/projects/:projectId/flows" />
        <Route element={<FlowCreatePage />} path="/projects/:projectId/flows/new" />
        <Route element={<FlowEditorPage />} path="/projects/:projectId/flows/:flowId" />
        <Route element={<TriggerEditorPage />} path="/projects/:projectId/triggers/:triggerId" />
        <Route element={<FreePageListPage />} path="/projects/:projectId/free-pages" />
        <Route element={<FreePageCreatePage />} path="/projects/:projectId/free-pages/new" />
        <Route
          element={<FreePageEditorPage />}
          path="/projects/:projectId/free-pages/:freePageId"
        />
        <Route element={<PageCreatePage />} path="/projects/:projectId/pages/new" />
        <Route element={<PageEditorPage />} path="/projects/:projectId/pages/:pageId" />
        <Route element={<PropertyCreatePage />} path="/projects/:projectId/properties/new" />
        <Route
          element={<PropertyEditorPage />}
          path="/projects/:projectId/properties/:propertyId"
        />
        <Route element={<TemplateEditorPage />} path="/projects/:projectId/templates/:templateId" />
        <Route element={<TrackingCreatePage />} path="/projects/:projectId/trackings/new" />
        <Route element={<TrackingEditorPage />} path="/projects/:projectId/trackings/:trackingId" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}

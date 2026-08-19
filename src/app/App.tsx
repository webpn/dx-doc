import { Alert, Button, Card, Field, Input } from '@project/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { apiClient, ApiClientError, type ProjectSummary } from './api-client';
import './App.css';

const queryKeys = {
  companies: ['companies'] as const,
  projects: (companyId: string) => ['companies', companyId, 'projects'] as const,
};

interface SessionState {
  userId: string;
  companyId: string | null;
  passwordChangeRequired: boolean;
}

function LoginPage(props: { onLogin: (session: SessionState) => void }): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useMutation({
    mutationFn: () => apiClient.login(email, password, companyId || undefined),
    onSuccess: (result) => {
      props.onLogin({
        userId: result.user.id,
        companyId: result.user.companyId,
        passwordChangeRequired: result.passwordChangeRequired,
      });
    },
    onError: (reason: unknown) => {
      setError(reason instanceof ApiClientError ? reason.message : 'Unable to sign in');
    },
  });

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);
    login.mutate();
  }

  return (
    <main className="app-login">
      <Card className="app-login-card">
        <p className="app-eyebrow">dx-doc</p>
        <h1 className="app-title">Sign in to your workspace</h1>
        <p className="app-subtitle">
          Access the tracking documentation projects assigned to your account.
        </p>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <form className="app-form" onSubmit={submit}>
          <Field htmlFor="email" label="Email address">
            <Input
              id="email"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              required
              type="email"
              value={email}
            />
          </Field>
          <Field
            htmlFor="companyId"
            label="Company ID"
            hint="Leave blank for an instance administrator."
          >
            <Input
              id="companyId"
              onChange={(event) => {
                setCompanyId(event.target.value);
              }}
              value={companyId}
            />
          </Field>
          <Field htmlFor="password" label="Password">
            <Input
              id="password"
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
              type="password"
              value={password}
            />
          </Field>
          <div className="app-form-actions">
            <Button disabled={login.isPending} type="submit">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

function PasswordChangePage(props: {
  session: SessionState;
  onComplete: () => void;
}): ReactElement {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) throw new ApiClientError('Unable to change password', response.status);
      return response.json() as Promise<{ ok: true }>;
    },
    onSuccess: () => {
      props.onComplete();
    },
    onError: () => {
      setError('Choose a new password of at least eight characters.');
    },
  });

  return (
    <main className="app-login">
      <Card className="app-login-card">
        <p className="app-eyebrow">First sign-in</p>
        <h1 className="app-title">Choose a new password</h1>
        <p className="app-subtitle">Your bootstrap password must be changed before continuing.</p>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <form
          className="app-form"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <Field htmlFor="currentPassword" label="Current password">
            <Input
              id="currentPassword"
              onChange={(event) => {
                setCurrentPassword(event.target.value);
              }}
              required
              type="password"
              value={currentPassword}
            />
          </Field>
          <Field htmlFor="newPassword" label="New password" hint="Use at least eight characters.">
            <Input
              id="newPassword"
              minLength={8}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              required
              type="password"
              value={newPassword}
            />
          </Field>
          <div className="app-form-actions">
            <Button disabled={mutation.isPending} type="submit">
              Save password
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

function ProjectListPage(props: { session: SessionState; onLogout: () => void }): ReactElement {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const projects = useQuery({
    queryKey: queryKeys.projects(props.session.companyId ?? ''),
    queryFn: () => apiClient.listProjects(props.session.companyId ?? ''),
    enabled: props.session.companyId !== null,
  });
  const logout = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      props.onLogout();
    },
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">dx-doc</div>
        <div className="app-header-actions">
          <span className="app-user">{props.session.userId}</span>
          <Button
            onClick={() => {
              logout.mutate();
            }}
            variant="ghost"
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="app-main">
        <p className="app-eyebrow">Workspace</p>
        <h1 className="app-title">Your projects</h1>
        <p className="app-subtitle">
          Choose a project to continue. The list is filtered by your server-side project grants.
        </p>
        {projects.isLoading ? (
          <Card>
            <p className="app-muted">Loading projects…</p>
          </Card>
        ) : null}
        {projects.isError ? <Alert variant="error">Unable to load projects.</Alert> : null}
        {projects.data?.length === 0 ? (
          <Card>
            <p>No projects are assigned to this account yet.</p>
          </Card>
        ) : null}
        <div className="app-grid">
          {projects.data?.map((project: ProjectSummary) => (
            <Card className="app-project" key={project.id}>
              <span className="app-project-name">{project.name}</span>
              <span className="app-project-meta">
                {project.platform} · {project.slug}
              </span>
              <Button
                onClick={() => {
                  void navigate(`/projects/${project.id}`);
                }}
                variant="secondary"
              >
                Open project
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

function DesignReviewPage(): ReactElement {
  const [invalid, setInvalid] = useState(true);
  return (
    <main className="app-main">
      <p className="app-eyebrow">M1.15 review surface</p>
      <h1 className="app-title">Design system states</h1>
      <p className="app-subtitle">
        Review focus, disabled, validation, loading, empty and status treatments here.
      </p>
      <div className="app-grid">
        <Card>
          <h2>Actions</h2>
          <div className="app-header-actions">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>
        <Card>
          <h2>Field states</h2>
          <Field
            {...(invalid ? { error: 'This value is required.' } : {})}
            htmlFor="review-input"
            label="Project name"
          >
            <Input aria-invalid={invalid} id="review-input" placeholder="Try keyboard focus" />
          </Field>
          <Button
            onClick={() => {
              setInvalid(!invalid);
            }}
            variant="secondary"
          >
            Toggle validation
          </Button>
        </Card>
        <Card>
          <h2>Messages</h2>
          <Alert variant="info">Informational status</Alert>
          <Alert variant="success">Saved successfully</Alert>
          <Alert variant="error">Something needs attention</Alert>
        </Card>
      </div>
    </main>
  );
}

export function App(): ReactElement {
  const [session, setSession] = useState<SessionState | null>(null);
  if (session === null)
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLogin={setSession} />} />
      </Routes>
    );
  if (session.passwordChangeRequired)
    return (
      <Routes>
        <Route
          path="*"
          element={
            <PasswordChangePage
              onComplete={() => {
                setSession({ ...session, passwordChangeRequired: false });
              }}
              session={session}
            />
          }
        />
      </Routes>
    );
  return (
    <Routes>
      <Route path="/design-review" element={<DesignReviewPage />} />
      <Route
        path="/"
        element={
          <ProjectListPage
            onLogout={() => {
              setSession(null);
            }}
            session={session}
          />
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProjectListPage
            onLogout={() => {
              setSession(null);
            }}
            session={session}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

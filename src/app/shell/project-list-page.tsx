import { Alert, Button, Card, Skeleton } from '@project/design-system';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ProjectRecord } from '../api';
import { useProjects } from '../queries';
import { useSessionStore } from '../stores/session-store';

export function ProjectListPage(): ReactElement {
  const session = useSessionStore((state) => state.session);
  const navigate = useNavigate();
  const projects = useProjects(session?.companyId ?? null);

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
        Workspace
      </p>
      <h1 className="my-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
        Your projects
      </h1>
      <p className="mb-8 max-w-2xl text-[var(--color-muted)]">
        Choose a project to continue. The list is filtered by your server-side project grants.
      </p>

      {session?.companyId === null ? (
        <Card>
          <p className="text-[var(--color-muted)]">
            No projects are assigned to this account yet. As an instance administrator, create a
            company to get started.
          </p>
        </Card>
      ) : null}

      {projects.isLoading ? (
        <div className="grid grid-cols-3 gap-4" role="status">
          <span className="sr-only">Loading projects…</span>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}

      {projects.isError ? (
        <Alert variant="error">Unable to load projects. Check your connection and try again.</Alert>
      ) : null}

      {projects.data?.length === 0 ? (
        <Card>
          <p className="text-[var(--color-muted)]">No projects are assigned to this account yet.</p>
        </Card>
      ) : null}

      {projects.data !== undefined && projects.data.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {projects.data.map((project: ProjectRecord) => (
            <Card className="grid gap-3 text-left" key={project.id}>
              <span className="text-base font-semibold text-[var(--color-ink)]">
                {project.name}
              </span>
              <span className="text-sm text-[var(--color-muted)]">
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
      ) : null}
    </div>
  );
}

import { Alert, Card, Skeleton } from '@project/design-system';
import { useEffect, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useTranslate } from '../i18n';
import { useProject } from '../queries';
import { useProjectStore } from '../stores/project-store';

import { ProjectWorkspace } from './project-workspace';

/**
 * Landing screen for a selected project (REQ-NAV-001): the page hierarchy's
 * navigable sidebar with the project's own summary as the content area.
 * Opening a specific page instead is `PageEditorPage`, which reuses the same
 * sidebar so the tree never disappears while browsing.
 */
export function ProjectPage(): ReactElement {
  const t = useTranslate();
  const { projectId } = useParams<{ projectId: string }>();
  const setCurrentProjectId = useProjectStore((state) => state.setCurrentProjectId);
  const project = useProject(projectId);

  useEffect(() => {
    setCurrentProjectId(projectId ?? null);
    return () => {
      setCurrentProjectId(null);
    };
  }, [projectId, setCurrentProjectId]);

  if (project.isLoading) {
    return <Skeleton className="h-48" />;
  }

  if (project.isError) {
    return <Alert variant="error">{t('project.detail.loadError')}</Alert>;
  }

  if (project.data === undefined) {
    return <></>;
  }

  return (
    <ProjectWorkspace projectId={project.data.id}>
      <Card>
        <h1 className="text-2xl font-bold text-[var(--color-ink)]">{project.data.name}</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          {project.data.platform} · {project.data.slug}
        </p>
        <Link
          className="mt-4 inline-flex h-10 w-fit items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)]"
          to={`/projects/${project.data.id}/free-pages`}
        >
          {t('freePage.list.title')}
        </Link>
      </Card>
    </ProjectWorkspace>
  );
}

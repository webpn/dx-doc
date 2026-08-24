import { Alert, Card, Skeleton } from '@project/design-system';
import { useEffect, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';

import { useTranslate } from '../i18n';
import { useProject } from '../queries';
import { useProjectStore } from '../stores/project-store';

/**
 * Placeholder landing screen for a selected project. M1.16/M1.17 replace
 * this body with the authoring, structure and publication surfaces; the
 * route, param sync and loading/error handling stay.
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
    <Card>
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">{project.data.name}</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        {project.data.platform} · {project.data.slug}
      </p>
    </Card>
  );
}

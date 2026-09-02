import { Alert, Button, Card, Skeleton } from '@project/design-system';
import { useEffect, useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useProject, useUnpublishedChanges } from '../queries';
import { useProjectStore } from '../stores/project-store';

import { ProjectWorkspace } from './project-workspace';
import { PublishVersionDialog } from './publish-version-dialog';

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
  const [publishOpen, setPublishOpen] = useState(false);

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
        <UnpublishedChangesIndicator
          companyId={project.data.companyId}
          projectId={project.data.id}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex h-10 w-fit items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)]"
            to={`/projects/${project.data.id}/free-pages`}
          >
            {t('freePage.list.title')}
          </Link>
          <Link
            className="inline-flex h-10 w-fit items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-ink)]"
            to={`/projects/${project.data.id}/versions`}
          >
            {t('publish.versionLink')}
          </Link>
          <Button
            onClick={() => {
              setPublishOpen(true);
            }}
          >
            {t('publish.action')}
          </Button>
        </div>
      </Card>
      <PublishVersionDialog
        companyId={project.data.companyId}
        onOpenChange={setPublishOpen}
        open={publishOpen}
        projectId={project.data.id}
      />
    </ProjectWorkspace>
  );
}

/**
 * The project-level unpublished-changes indicator (REQ-VER-002). Rendered
 * only once the server has answered: while it is loading there is nothing to
 * announce, and a failed fetch is reported rather than silently read as
 * "nothing to publish".
 */
function UnpublishedChangesIndicator(props: {
  companyId: string;
  projectId: string;
}): ReactElement {
  const { companyId, projectId } = props;
  const t = useTranslate();
  const unpublishedChanges = useUnpublishedChanges(companyId, projectId);

  if (unpublishedChanges.isError) {
    return (
      <div className="mt-4">
        <Alert variant="error">{t(apiErrorMessageKey(unpublishedChanges.error))}</Alert>
      </div>
    );
  }

  if (unpublishedChanges.data?.hasUnpublishedChanges !== true) {
    return <></>;
  }

  const { changedEntityCount } = unpublishedChanges.data;
  return (
    <p className="mt-4 text-sm font-medium text-[var(--color-ink)]" role="status">
      {changedEntityCount === 1
        ? t('publish.indicator.one')
        : t('publish.indicator.many', { count: changedEntityCount })}
    </p>
  );
}

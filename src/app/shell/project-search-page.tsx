import { Alert, Card, Input, Skeleton } from '@project/design-system';
import { useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useProject, useProjectSearch } from '../queries';

import { ProjectWorkspace } from './project-workspace';

export function ProjectSearchPage(): ReactElement {
  const t = useTranslate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const search = useProjectSearch(projectId, submittedQuery);

  if (project.isLoading) return <Skeleton className="h-48" />;
  if (project.isError) return <Alert variant="error">{t('project.search.loadError')}</Alert>;
  if (project.data === undefined || projectId === undefined) return <></>;

  const hasQuery = submittedQuery.trim().length > 0;
  return (
    <ProjectWorkspace projectId={projectId}>
      <div className="grid gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('project.search.eyebrow')}
          </p>
          <h1 className="my-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('project.search.title')}
          </h1>
          <p className="max-w-2xl text-[var(--color-muted)]">{t('project.search.description')}</p>
        </div>

        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(query);
          }}
        >
          <label className="text-sm font-semibold text-[var(--color-ink)]" htmlFor="project-search">
            {t('project.search.inputLabel')}
          </label>
          <Input
            autoComplete="off"
            id="project-search"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t('project.search.placeholder')}
            type="search"
            value={query}
          />
          <button
            className="mt-2 inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
            type="submit"
          >
            {t('project.search.submit')}
          </button>
        </form>

        <div aria-live="polite" role="status">
          {!hasQuery ? (
            <p className="text-sm text-[var(--color-muted)]">{t('project.search.hint')}</p>
          ) : null}
          {hasQuery && search.isLoading ? (
            <div className="grid gap-3">
              <span className="sr-only">{t('project.search.loading')}</span>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : null}
          {hasQuery && search.isError ? (
            <Alert variant="error">{t(apiErrorMessageKey(search.error))}</Alert>
          ) : null}
          {hasQuery && search.data?.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{t('project.search.empty')}</p>
          ) : null}
        </div>

        {search.data !== undefined && search.data.length > 0 ? (
          <div aria-label={t('project.search.resultsLabel')} className="grid gap-3">
            {search.data.map((result) => (
              <Card key={result.documentId}>
                <Link
                  className="text-base font-semibold text-[var(--color-primary)] underline"
                  to={`/projects/${projectId}/trackings/${result.documentId}`}
                >
                  {result.title}
                </Link>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{result.snippet}</p>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </ProjectWorkspace>
  );
}

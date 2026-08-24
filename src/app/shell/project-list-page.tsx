import { Alert, Button, Card, Skeleton } from '@project/design-system';
import type { ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type { ProjectRecord } from '../api';
import { useTranslate } from '../i18n';
import { useProjects } from '../queries';
import { useSessionStore } from '../stores/session-store';

export function ProjectListPage(): ReactElement {
  const t = useTranslate();
  const session = useSessionStore((state) => state.session);
  const navigate = useNavigate();
  // URL state is the source of truth for the selected company (M1.15). It has to
  // outrank the session: an instance administrator's session carries
  // `companyId: null` and creating a company does not make them a member of it
  // (REQ-SEC-014), so the URL is the only place the selected company can live.
  const { companyId: companyIdFromUrl } = useParams<{ companyId: string }>();
  const companyId = companyIdFromUrl ?? session?.companyId ?? null;
  const projects = useProjects(companyId);
  // The empty state differs for the instance administrator: they have no
  // company of their own (REQ-SEC-014), so "no projects" is expected rather
  // than a problem, and the useful next step is creating a company. Keyed off
  // the capability flag, not off `companyId === null` — the two happen to
  // coincide today, but the capability is what the message is about.
  const isInstanceAdmin = session?.instanceAdmin === true;
  const projectCount = projects.data?.length ?? 0;
  // With no company anywhere there is nothing to list and no request to make,
  // so the screen must offer the one action that breaks the deadlock.
  const needsCompany = isInstanceAdmin && companyId === null;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
        {t('project.list.eyebrow')}
      </p>
      <h1 className="my-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
        {t('project.list.title')}
      </h1>
      <p className="mb-8 max-w-2xl text-[var(--color-muted)]">{t('project.list.description')}</p>

      {projects.isLoading ? (
        <div className="grid grid-cols-3 gap-4" role="status">
          <span className="sr-only">{t('project.list.loading')}</span>
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}

      {projects.isError ? <Alert variant="error">{t('project.list.loadError')}</Alert> : null}

      {(projects.data !== undefined && projectCount === 0) || needsCompany ? (
        <Card className="grid justify-items-start gap-4">
          <p className="text-[var(--color-muted)]">
            {isInstanceAdmin ? t('project.list.emptyInstanceAdmin') : t('project.list.empty')}
          </p>
          {isInstanceAdmin ? (
            <Link
              className="inline-flex h-10 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
              to="/companies/new"
            >
              {t('company.create.link')}
            </Link>
          ) : null}
        </Card>
      ) : null}

      {projects.data !== undefined && projectCount > 0 ? (
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
                {t('project.list.open')}
              </Button>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

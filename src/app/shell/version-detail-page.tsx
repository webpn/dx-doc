import {
  Alert,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@project/design-system';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useFormatters, useTranslate } from '../i18n';
import { useVersion } from '../queries';

import { ChangelogList } from './changelog-list';

/**
 * Read-only consultation of one published version (REQ-VER-007): the
 * metadata the editor supplied at publication and the full generated
 * changelog. Historical content itself is not re-rendered here — the
 * version record's changelog is the consultation surface of M1.17.
 */
export function VersionDetailPage(): ReactElement {
  const t = useTranslate();
  const { formatDateTime } = useFormatters();
  const { versionId } = useParams<{ versionId: string }>();
  const version = useVersion(versionId);

  if (version.isLoading) {
    return (
      <div role="status">
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (version.isError) {
    return <Alert variant="error">{t('version.detail.loadError')}</Alert>;
  }

  if (version.data === undefined) {
    return <></>;
  }

  const v = version.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('version.detail.title', { number: v.versionNumber })}
          {v.title !== null && v.title !== '' ? ` — ${v.title}` : ''}
        </CardTitle>
        <CardDescription>
          {t('version.detail.publishedAt', { date: formatDateTime(v.createdAt) })}
        </CardDescription>
      </CardHeader>

      <Link
        className="text-sm font-semibold text-[var(--color-primary)]"
        to={`/projects/${v.projectId}/versions`}
      >
        {t('version.detail.backToHistory')}
      </Link>

      {v.releaseNotes !== null && v.releaseNotes !== '' ? (
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {t('version.detail.releaseNotes')}
          </h3>
          <p className="whitespace-pre-line text-sm text-[var(--color-ink)]">{v.releaseNotes}</p>
        </section>
      ) : null}

      <section>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">
          {t('version.detail.changelog')}
        </h3>
        {v.changelog.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t('version.detail.changelogEmpty')}</p>
        ) : (
          <ChangelogList entries={v.changelog} />
        )}
      </section>
    </Card>
  );
}

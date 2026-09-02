import {
  Alert,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@project/design-system';
import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useFormatters, useTranslate } from '../i18n';
import { useVersions } from '../queries';

/**
 * Version history for a project (REQ-VER-006): every publication with the
 * system-granted number, its title, publication date, creator and a summary
 * of the changelog the diff generated. Consultation of one version's full
 * changelog is `VersionDetailPage`.
 */
export function VersionHistoryPage(): ReactElement {
  const t = useTranslate();
  const { formatDateTime } = useFormatters();
  const { projectId } = useParams<{ projectId: string }>();
  const versions = useVersions(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('version.list.title')}</CardTitle>
        <CardDescription>{t('version.list.subtitle')}</CardDescription>
      </CardHeader>

      {versions.isLoading ? (
        <div role="status">
          <Skeleton className="h-24" />
        </div>
      ) : null}

      {versions.isError ? <Alert variant="error">{t('version.list.loadError')}</Alert> : null}

      {versions.data?.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t('version.list.empty')}</p>
      ) : null}

      {versions.data !== undefined && versions.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('version.list.versionColumn')}</TableHead>
              <TableHead>{t('version.list.createdColumn')}</TableHead>
              <TableHead>{t('version.list.creatorColumn')}</TableHead>
              <TableHead>{t('version.list.changesColumn')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.data.map((version) => (
              <TableRow key={version.id}>
                <TableCell>
                  <span className="font-semibold text-[var(--color-ink)]">
                    v{String(version.versionNumber)}
                  </span>
                  {version.title !== null && version.title !== '' ? (
                    <span className="text-[var(--color-muted)]"> — {version.title}</span>
                  ) : (
                    <span className="text-[var(--color-muted)]">
                      {' — '}
                      {t('version.list.untitled')}
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(version.createdAt)}</TableCell>
                <TableCell>{version.createdBy}</TableCell>
                <TableCell>
                  {t('version.list.changesSummary', {
                    added: String(version.changelog.filter((e) => e.type === 'added').length),
                    modified: String(version.changelog.filter((e) => e.type === 'modified').length),
                    removed: String(version.changelog.filter((e) => e.type === 'removed').length),
                  })}
                </TableCell>
                <TableCell>
                  <Link
                    className="text-sm font-semibold text-[var(--color-primary)]"
                    to={`/projects/${projectId ?? ''}/versions/${version.id}`}
                  >
                    {t('version.list.open')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </Card>
  );
}

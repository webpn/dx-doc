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

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useFreePages, useProject } from '../queries';

/**
 * Lists a project's free wiki pages (REQ-AUTH-003).
 *
 * Free pages live in their own hierarchy, independent of the Page/Screen
 * tree, so this is a flat list rather than the project's structural nav —
 * `parentId` only matters once inside the editor, where re-parenting is a
 * choice made against other free pages.
 */
export function FreePageListPage(): ReactElement {
  const t = useTranslate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const companyId = project.data?.companyId;
  const freePages = useFreePages(companyId, projectId ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('freePage.list.title')}</CardTitle>
        <CardDescription>{t('freePage.list.subtitle')}</CardDescription>
      </CardHeader>

      {freePages.isLoading ? <Skeleton className="h-24" /> : null}

      {freePages.isError ? (
        <Alert variant="error">{t(apiErrorMessageKey(freePages.error))}</Alert>
      ) : null}

      {freePages.data?.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t('freePage.list.empty')}</p>
      ) : null}

      {freePages.data !== undefined && freePages.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('freePage.create.titleLabel')}</TableHead>
              <TableHead>{t('freePage.create.slugLabel')}</TableHead>
              <TableHead>{t('freePage.list.publishableColumn')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {freePages.data.map((freePage) => (
              <TableRow key={freePage.id}>
                <TableCell>{freePage.title}</TableCell>
                <TableCell>{freePage.slug}</TableCell>
                <TableCell>
                  {freePage.publishable ? t('freePage.list.yes') : t('freePage.list.no')}
                </TableCell>
                <TableCell>
                  <Link
                    className="text-sm font-semibold text-[var(--color-primary)]"
                    to={`/projects/${projectId ?? ''}/free-pages/${freePage.id}`}
                  >
                    {t('freePage.list.open')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Link
        className="inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
        to={`/projects/${projectId ?? ''}/free-pages/new`}
      >
        {t('freePage.list.create')}
      </Link>
    </Card>
  );
}

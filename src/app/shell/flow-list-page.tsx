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
import { useFlows } from '../queries';

/**
 * Lists a project's flows (REQ-NAV-003). Flows are a first-class inventory
 * alongside the page hierarchy, so this is a flat list reached from the
 * sidebar (REQ-NAV-007) rather than a node inside the page tree.
 */
export function FlowListPage(): ReactElement {
  const t = useTranslate();
  const { projectId } = useParams<{ projectId: string }>();
  const flows = useFlows(projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('flow.list.title')}</CardTitle>
        <CardDescription>{t('flow.list.subtitle')}</CardDescription>
      </CardHeader>

      {flows.isLoading ? <Skeleton className="h-24" /> : null}

      {flows.isError ? <Alert variant="error">{t(apiErrorMessageKey(flows.error))}</Alert> : null}

      {flows.data?.length === 0 ? (
        <p className="text-[var(--color-muted)]">{t('flow.list.empty')}</p>
      ) : null}

      {flows.data !== undefined && flows.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('flow.create.nameLabel')}</TableHead>
              <TableHead>{t('flow.create.slugLabel')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flows.data.map((flow) => (
              <TableRow key={flow.id}>
                <TableCell>{flow.name}</TableCell>
                <TableCell>{flow.slug}</TableCell>
                <TableCell>
                  <Link
                    className="text-sm font-semibold text-[var(--color-primary)]"
                    to={`/projects/${projectId ?? ''}/flows/${flow.id}`}
                  >
                    {t('flow.list.open')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <Link
        className="inline-flex h-10 w-fit items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
        to={`/projects/${projectId ?? ''}/flows/new`}
      >
        {t('flow.list.create')}
      </Link>
    </Card>
  );
}
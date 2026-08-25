import {
  Alert,
  Button,
  Card,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@project/design-system';
import type { ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import type { CompanySummary } from '../api';
import { useTranslate } from '../i18n';
import { useCompanies, useDeleteCompany } from '../queries';

/**
 * Instance-administration company list (REQ-SEC-015): every tenant, its
 * project count, and the actions the flag exists for — create, open, delete.
 * Reachable only by a holder of the instance-administration capability; the
 * API's own `CompanyService.list` enforces that server-side, this screen
 * does not duplicate the check.
 */
export function CompanyListPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const companies = useCompanies();
  const deleteCompany = useDeleteCompany();

  function handleDelete(company: CompanySummary): void {
    // No confirmation-dialog primitive exists yet elsewhere in this codebase
    // for destructive actions.
    if (!window.confirm(t('company.list.confirmDelete', { name: company.name }))) {
      return;
    }
    deleteCompany.mutate(company.id);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
        {t('company.list.eyebrow')}
      </p>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="my-2 text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {t('company.list.title')}
          </h1>
          <p className="max-w-2xl text-[var(--color-muted)]">{t('company.list.description')}</p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"
          to="/companies/new"
        >
          {t('company.create.link')}
        </Link>
      </div>

      {companies.isLoading ? (
        <div className="grid gap-2" role="status">
          <span className="sr-only">{t('company.list.loading')}</span>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : null}

      {companies.isError ? <Alert variant="error">{t('company.list.loadError')}</Alert> : null}

      {deleteCompany.isError ? (
        <Alert variant="error">{t('company.list.deleteError')}</Alert>
      ) : null}

      {companies.data?.length === 0 ? (
        <Card className="grid justify-items-start gap-2">
          <p className="text-[var(--color-muted)]">{t('company.list.empty')}</p>
        </Card>
      ) : null}

      {companies.data !== undefined && companies.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('company.list.columnName')}</TableHead>
              <TableHead>{t('company.list.columnSlug')}</TableHead>
              <TableHead>{t('company.list.columnProjects')}</TableHead>
              <TableHead>
                <span className="sr-only">{t('company.list.columnActions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.data.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-semibold text-[var(--color-ink)]">
                  {company.name}
                </TableCell>
                <TableCell className="text-[var(--color-muted)]">{company.slug}</TableCell>
                <TableCell className="text-[var(--color-muted)]">{company.projectCount}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => {
                        void navigate(`/companies/${company.id}/projects`);
                      }}
                      variant="secondary"
                    >
                      {t('company.list.open')}
                    </Button>
                    <Button
                      disabled={deleteCompany.isPending}
                      onClick={() => {
                        handleDelete(company);
                      }}
                      variant="danger"
                    >
                      {t('company.list.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

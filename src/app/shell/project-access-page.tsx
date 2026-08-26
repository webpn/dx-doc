import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@project/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';

import { ROLE_NAMES, type RoleName } from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { queryKeys, useGrants, useInviteUser, useRemoveGrant, useSetGrant } from '../queries';

/**
 * Who can reach this project, and in which role (M1.15).
 *
 * Invite and grant are two steps on purpose. An invited user joins the company
 * with no project access whatsoever (deny-by-default, REQ-SEC-012); giving them
 * a role is a separate decision made here. An "invite as editor" shortcut would
 * turn granting access into a side effect of sending an email, which is exactly
 * the kind of implicit permission this model avoids.
 */
export function ProjectAccessPage(): ReactElement {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>();
  const grants = useGrants(projectId ?? '');
  const inviteUser = useInviteUser(companyId ?? '');
  const setGrant = useSetGrant(projectId ?? '');
  const removeGrant = useRemoveGrant(projectId ?? '');

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleInvite(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (email.trim() === '') {
      setError(t('access.invite.missingEmail'));
      return;
    }

    try {
      await inviteUser.mutateAsync(email.trim());
      // The invitee is now a company member eligible for a first grant, which
      // makes them a new row here even though the invite itself granted them
      // nothing (REQ-SEC-012).
      void queryClient.invalidateQueries({ queryKey: queryKeys.grants(projectId ?? '') });
      setNotice(t('access.invite.sent'));
      setEmail('');
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleRoleChange(userId: string, roleName: RoleName): Promise<void> {
    setError(null);
    try {
      await setGrant.mutateAsync({ userId, roleName });
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleRevoke(userId: string): Promise<void> {
    setError(null);
    try {
      await removeGrant.mutateAsync(userId);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  const rows = grants.data?.grants ?? [];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('access.title')}</CardTitle>
          <CardDescription>{t('access.description')}</CardDescription>
        </CardHeader>

        {grants.isLoading ? <Skeleton className="h-24" /> : null}

        {grants.isError ? <Alert variant="error">{t('access.loadError')}</Alert> : null}

        {!grants.isLoading && !grants.isError && rows.length === 0 ? (
          <p className="text-[var(--color-muted)]">{t('access.empty')}</p>
        ) : null}

        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('access.userColumn')}</TableHead>
                <TableHead>{t('access.roleColumn')}</TableHead>
                <TableHead>{t('access.actionsColumn')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <select
                      aria-label={t('access.roleFor', { user: row.email })}
                      className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                      onChange={(event) => {
                        void handleRoleChange(row.userId, event.target.value as RoleName);
                      }}
                      value={row.roleName ?? ''}
                    >
                      {row.roleName === null ? (
                        <option disabled value="">
                          {t('access.noRole')}
                        </option>
                      ) : null}
                      {ROLE_NAMES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    {row.roleName !== null ? (
                      <Button
                        aria-label={t('access.revokeFor', { user: row.email })}
                        onClick={() => {
                          void handleRevoke(row.userId);
                        }}
                        type="button"
                        variant="secondary"
                      >
                        {t('access.revoke')}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('access.invite.title')}</CardTitle>
          <CardDescription>{t('access.invite.description')}</CardDescription>
        </CardHeader>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            void handleInvite(event);
          }}
        >
          <Field htmlFor="invite-email" label={t('access.invite.emailLabel')}>
            <Input
              autoComplete="email"
              id="invite-email"
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              type="email"
              value={email}
            />
          </Field>

          {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
          {error !== null ? <Alert variant="error">{error}</Alert> : null}

          <Button disabled={inviteUser.isPending} type="submit">
            {inviteUser.isPending ? t('access.invite.sending') : t('access.invite.submit')}
          </Button>
        </form>
      </Card>
    </div>
  );
}

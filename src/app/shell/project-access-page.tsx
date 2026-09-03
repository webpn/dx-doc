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
import { apiErrorMessageKey, useFormatters, useTranslate } from '../i18n';
import {
  queryKeys,
  useCreateSharedPassword,
  useGrants,
  useInviteUser,
  useRemoveGrant,
  useRemoveSharedPassword,
  useSetGrant,
  useSharedPasswords,
} from '../queries';
import { useSessionStore } from '../stores/session-store';

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
  const { formatDateTime } = useFormatters();
  const queryClient = useQueryClient();
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>();
  const grants = useGrants(projectId ?? '');
  const inviteUser = useInviteUser(companyId ?? '');
  const setGrant = useSetGrant(projectId ?? '');
  const removeGrant = useRemoveGrant(projectId ?? '');
  const sharedPasswords = useSharedPasswords(projectId ?? '');
  const createSharedPassword = useCreateSharedPassword(projectId ?? '');
  const removeSharedPassword = useRemoveSharedPassword(projectId ?? '');
  const session = useSessionStore((state) => state.session);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordLabel, setPasswordLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

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

  async function handleCreatePassword(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPasswordError(null);
    setPasswordNotice(null);
    if (password === '') {
      setPasswordError(t('access.passwords.missingPassword'));
      return;
    }

    try {
      await createSharedPassword.mutateAsync({
        password,
        ...(passwordLabel.trim() === '' ? {} : { label: passwordLabel.trim() }),
        ...(expiresAt === '' ? {} : { expiresAt: new Date(expiresAt).toISOString() }),
      });
      setPasswordNotice(t('access.passwords.created'));
      setPassword('');
      setPasswordLabel('');
      setExpiresAt('');
    } catch (cause) {
      setPasswordError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleRevokePassword(id: string): Promise<void> {
    setPasswordError(null);
    try {
      await removeSharedPassword.mutateAsync(id);
    } catch (cause) {
      setPasswordError(t(apiErrorMessageKey(cause)));
    }
  }

  const rows = grants.data?.grants ?? [];
  const passwordRows = sharedPasswords.data ?? [];
  const canManagePasswords =
    session?.instanceAdmin === true ||
    rows.some(
      (row) =>
        row.userId === session?.userId &&
        (row.roleName === 'admin' || row.roleName === 'project_manager'),
    );

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
          <CardTitle>{t('access.passwords.title')}</CardTitle>
          <CardDescription>{t('access.passwords.description')}</CardDescription>
        </CardHeader>
        {sharedPasswords.isLoading ? <Skeleton className="h-24" /> : null}
        {sharedPasswords.isError ? (
          <Alert variant="error">{t('access.passwords.loadError')}</Alert>
        ) : null}
        {!sharedPasswords.isLoading && !sharedPasswords.isError && passwordRows.length === 0 ? (
          <p className="text-[var(--color-muted)]">{t('access.passwords.empty')}</p>
        ) : null}
        {passwordRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('access.passwords.labelColumn')}</TableHead>
                <TableHead>{t('access.passwords.expiresColumn')}</TableHead>
                <TableHead>{t('access.passwords.statusColumn')}</TableHead>
                {canManagePasswords ? (
                  <TableHead>{t('access.passwords.actionsColumn')}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {passwordRows.map((row) => {
                const expired = row.expiresAt !== null && Date.parse(row.expiresAt) <= Date.now();
                const label = row.label ?? row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell>{label}</TableCell>
                    <TableCell>
                      {row.expiresAt === null
                        ? t('access.passwords.never')
                        : formatDateTime(row.expiresAt)}
                    </TableCell>
                    <TableCell>
                      {expired ? t('access.passwords.expired') : t('access.passwords.active')}
                    </TableCell>
                    {canManagePasswords ? (
                      <TableCell>
                        <Button
                          aria-label={t('access.passwords.revokeFor', { label })}
                          onClick={() => {
                            void handleRevokePassword(row.id);
                          }}
                          type="button"
                          variant="secondary"
                        >
                          {t('access.passwords.revoke')}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
        {canManagePasswords ? (
          <form className="mt-6 grid gap-4" onSubmit={(event) => void handleCreatePassword(event)}>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">
              {t('access.passwords.createTitle')}
            </h3>
            <Field htmlFor="shared-password-label" label={t('access.passwords.labelLabel')}>
              <Input
                id="shared-password-label"
                onChange={(event) => {
                  setPasswordLabel(event.target.value);
                }}
                value={passwordLabel}
              />
            </Field>
            <Field htmlFor="shared-password-value" label={t('access.passwords.passwordLabel')}>
              <Input
                autoComplete="new-password"
                id="shared-password-value"
                minLength={6}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                type="password"
                value={password}
              />
            </Field>
            <Field htmlFor="shared-password-expiry" label={t('access.passwords.expiryLabel')}>
              <Input
                id="shared-password-expiry"
                onChange={(event) => {
                  setExpiresAt(event.target.value);
                }}
                type="datetime-local"
                value={expiresAt}
              />
            </Field>
            {passwordNotice !== null ? <Alert variant="success">{passwordNotice}</Alert> : null}
            {passwordError !== null ? <Alert variant="error">{passwordError}</Alert> : null}
            <Button disabled={createSharedPassword.isPending} type="submit">
              {createSharedPassword.isPending
                ? t('access.passwords.submitting')
                : t('access.passwords.submit')}
            </Button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-[var(--color-muted)]">
            {t('access.passwords.unauthorized')}
          </p>
        )}
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

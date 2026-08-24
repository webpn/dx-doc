import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@project/design-system';
import { useState, type SyntheticEvent, type ReactElement } from 'react';

import { ApiClientError } from '../../api';
import { apiErrorMessageKey, useTranslate } from '../../i18n';
import { useChangePassword } from '../../queries';

const MIN_PASSWORD_LENGTH = 8;

export function PasswordChangePage(): ReactElement {
  const t = useTranslate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const changePassword = useChangePassword();

  const minLengthHint = t('auth.passwordChange.minLengthHint', { min: MIN_PASSWORD_LENGTH });

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    changePassword.reset();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(minLengthHint);
      return;
    }
    setValidationError(null);
    changePassword.mutate({ currentPassword, newPassword });
  }

  const error = changePassword.error;
  // Two application-specific codes get their own message; anything else falls
  // through to the shared API-error mapping, and a server-authored validation
  // message is shown as-is (see the note in login-page.tsx).
  const errorMessage =
    error === null
      ? null
      : error instanceof ApiClientError
        ? error.code === 'INVALID_CURRENT_PASSWORD'
          ? t('auth.passwordChange.wrongCurrent')
          : error.code === 'WEAK_PASSWORD'
            ? t('auth.passwordChange.weakPassword')
            : error.status >= 500 || error.status === 401
              ? t(apiErrorMessageKey(error))
              : error.message
        : t(apiErrorMessageKey(error));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('auth.passwordChange.eyebrow')}
          </p>
          <CardTitle>{t('auth.passwordChange.title')}</CardTitle>
          <CardDescription>{t('auth.passwordChange.description')}</CardDescription>
        </CardHeader>
        {validationError !== null || errorMessage !== null ? (
          <Alert variant="error">{validationError ?? errorMessage}</Alert>
        ) : null}
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field htmlFor="currentPassword" label={t('auth.passwordChange.currentLabel')}>
            <Input
              autoComplete="current-password"
              id="currentPassword"
              onChange={(event) => {
                setCurrentPassword(event.target.value);
              }}
              required
              type="password"
              value={currentPassword}
            />
          </Field>
          <Field
            hint={minLengthHint}
            htmlFor="newPassword"
            label={t('auth.passwordChange.newLabel')}
          >
            <Input
              autoComplete="new-password"
              id="newPassword"
              minLength={MIN_PASSWORD_LENGTH}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              required
              type="password"
              value={newPassword}
            />
          </Field>
          <div className="flex justify-end">
            <Button disabled={changePassword.isPending} type="submit">
              {changePassword.isPending
                ? t('auth.passwordChange.submitting')
                : t('auth.passwordChange.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

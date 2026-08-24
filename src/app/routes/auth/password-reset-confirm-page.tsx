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
import { Link, useSearchParams } from 'react-router-dom';

import { ApiClientError } from '../../api';
import { apiErrorMessageKey, useTranslate } from '../../i18n';
import { useConfirmPasswordReset } from '../../queries';

const MIN_PASSWORD_LENGTH = 8;

export function PasswordResetConfirmPage(): ReactElement {
  const t = useTranslate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const confirmReset = useConfirmPasswordReset();

  const minLengthHint = t('auth.passwordChange.minLengthHint', { min: MIN_PASSWORD_LENGTH });

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    confirmReset.reset();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(minLengthHint);
      return;
    }
    setValidationError(null);
    confirmReset.mutate({ token, newPassword });
  }

  const error = confirmReset.error;
  const errorMessage =
    error === null
      ? null
      : error instanceof ApiClientError
        ? error.code === 'INVALID_OR_EXPIRED_TOKEN'
          ? t('auth.passwordReset.invalidToken')
          : error.status >= 500 || error.status === 401
            ? t(apiErrorMessageKey(error))
            : error.message
        : t(apiErrorMessageKey(error));

  if (token === '') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.passwordReset.missingTokenTitle')}</CardTitle>
            <CardDescription>{t('auth.passwordReset.missingTokenDescription')}</CardDescription>
          </CardHeader>
          <Link
            className="text-sm text-[var(--color-primary)] hover:underline"
            to="/password-reset"
          >
            {t('auth.passwordReset.requestNewLink')}
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.passwordReset.confirmTitle')}</CardTitle>
          <CardDescription>{t('auth.passwordReset.confirmDescription')}</CardDescription>
        </CardHeader>
        {validationError !== null || errorMessage !== null ? (
          <Alert variant="error">{validationError ?? errorMessage}</Alert>
        ) : null}
        {confirmReset.isSuccess ? (
          <>
            <Alert variant="success">{t('auth.passwordReset.confirmDone')}</Alert>
            <Link className="text-sm text-[var(--color-primary)] hover:underline" to="/login">
              {t('auth.passwordReset.continueToSignIn')}
            </Link>
          </>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
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
              <Button disabled={confirmReset.isPending} type="submit">
                {confirmReset.isPending
                  ? t('auth.passwordReset.confirmSubmitting')
                  : t('auth.passwordReset.confirmSubmit')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

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

import { ApiClientError, ApiNetworkError } from '../../api';
import { useConfirmPasswordReset } from '../../queries';

const MIN_PASSWORD_LENGTH = 8;

export function PasswordResetConfirmPage(): ReactElement {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const confirmReset = useConfirmPasswordReset();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    confirmReset.reset();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`);
      return;
    }
    setValidationError(null);
    confirmReset.mutate({ token, newPassword });
  }

  const error = confirmReset.error;
  const errorMessage =
    error instanceof ApiClientError
      ? error.code === 'INVALID_OR_EXPIRED_TOKEN'
        ? 'This reset link is invalid or has expired. Request a new one.'
        : error.message
      : error instanceof ApiNetworkError
        ? 'Unable to reach the server. Check your connection and try again.'
        : null;

  if (token === '') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset link missing</CardTitle>
            <CardDescription>This page needs a reset token in the URL.</CardDescription>
          </CardHeader>
          <Link
            className="text-sm text-[var(--color-primary)] hover:underline"
            to="/password-reset"
          >
            Request a new reset link
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>Set a new password for your account.</CardDescription>
        </CardHeader>
        {validationError !== null || errorMessage !== null ? (
          <Alert variant="error">{validationError ?? errorMessage}</Alert>
        ) : null}
        {confirmReset.isSuccess ? (
          <>
            <Alert variant="success">Your password has been reset.</Alert>
            <Link className="text-sm text-[var(--color-primary)] hover:underline" to="/login">
              Continue to sign in
            </Link>
          </>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            <Field
              hint={`Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`}
              htmlFor="newPassword"
              label="New password"
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
                {confirmReset.isPending ? 'Saving…' : 'Save password'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

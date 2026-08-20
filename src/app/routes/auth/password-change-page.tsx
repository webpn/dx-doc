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

import { ApiClientError, ApiNetworkError } from '../../api';
import { useChangePassword } from '../../queries';

const MIN_PASSWORD_LENGTH = 8;

export function PasswordChangePage(): ReactElement {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const changePassword = useChangePassword();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    changePassword.reset();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setValidationError(`Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`);
      return;
    }
    setValidationError(null);
    changePassword.mutate({ currentPassword, newPassword });
  }

  const error = changePassword.error;
  const errorMessage =
    error instanceof ApiClientError
      ? error.code === 'INVALID_CURRENT_PASSWORD'
        ? 'The current password is incorrect.'
        : error.code === 'WEAK_PASSWORD'
          ? 'Choose a stronger password.'
          : error.message
      : error instanceof ApiNetworkError
        ? 'Unable to reach the server. Check your connection and try again.'
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            First sign-in
          </p>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Your bootstrap password must be changed before continuing.
          </CardDescription>
        </CardHeader>
        {validationError !== null || errorMessage !== null ? (
          <Alert variant="error">{validationError ?? errorMessage}</Alert>
        ) : null}
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field htmlFor="currentPassword" label="Current password">
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
            <Button disabled={changePassword.isPending} type="submit">
              {changePassword.isPending ? 'Saving…' : 'Save password'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

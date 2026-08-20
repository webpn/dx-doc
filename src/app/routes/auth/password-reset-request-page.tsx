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
import { Link } from 'react-router-dom';

import { ApiNetworkError } from '../../api';
import { useRequestPasswordReset } from '../../queries';

export function PasswordResetRequestPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [companyId, setCompanyId] = useState('');
  const requestReset = useRequestPasswordReset();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    requestReset.mutate({ email, companyId: companyId || undefined });
  }

  const networkError = requestReset.error instanceof ApiNetworkError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            We&apos;ll send a reset link to your email if an account matches — the response is the
            same either way.
          </CardDescription>
        </CardHeader>
        {networkError ? (
          <Alert variant="error">
            Unable to reach the server. Check your connection and try again.
          </Alert>
        ) : null}
        {requestReset.isSuccess ? (
          <Alert variant="success">If that account exists, a reset link is on its way.</Alert>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            <Field htmlFor="email" label="Email address">
              <Input
                autoComplete="username"
                id="email"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                required
                type="email"
                value={email}
              />
            </Field>
            <Field
              htmlFor="companyId"
              hint="Leave blank for an instance administrator."
              label="Company ID"
            >
              <Input
                autoComplete="off"
                id="companyId"
                onChange={(event) => {
                  setCompanyId(event.target.value);
                }}
                value={companyId}
              />
            </Field>
            <div className="flex items-center justify-between">
              <Link className="text-sm text-[var(--color-primary)] hover:underline" to="/login">
                Back to sign in
              </Link>
              <Button disabled={requestReset.isPending} type="submit">
                {requestReset.isPending ? 'Sending…' : 'Send reset link'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

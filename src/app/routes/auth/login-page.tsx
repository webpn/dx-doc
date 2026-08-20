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

import { ApiClientError, ApiNetworkError } from '../../api';
import { useLogin } from '../../queries';

export function LoginPage(): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  const login = useLogin();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.reset();
    login.mutate({ email, password, companyId: companyId || undefined });
  }

  const error = login.error;
  const errorMessage =
    error instanceof ApiClientError
      ? error.status === 401
        ? 'Invalid email or password.'
        : error.message
      : error instanceof ApiNetworkError
        ? 'Unable to reach the server. Check your connection and try again.'
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            dx-doc
          </p>
          <CardTitle>Sign in to your workspace</CardTitle>
          <CardDescription>
            Access the tracking documentation projects assigned to your account.
          </CardDescription>
        </CardHeader>
        {errorMessage !== null ? <Alert variant="error">{errorMessage}</Alert> : null}
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
          <Field htmlFor="password" label="Password">
            <Input
              autoComplete="current-password"
              id="password"
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              required
              type="password"
              value={password}
            />
          </Field>
          <div className="flex items-center justify-between">
            <Link
              className="text-sm text-[var(--color-primary)] hover:underline"
              to="/password-reset"
            >
              Forgot your password?
            </Link>
            <Button disabled={login.isPending} type="submit">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

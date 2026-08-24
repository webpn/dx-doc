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
import { useTranslate } from '../../i18n';
import { useRequestPasswordReset } from '../../queries';

export function PasswordResetRequestPage(): ReactElement {
  const t = useTranslate();
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
          <CardTitle>{t('auth.passwordReset.requestTitle')}</CardTitle>
          <CardDescription>{t('auth.passwordReset.requestDescription')}</CardDescription>
        </CardHeader>
        {networkError ? <Alert variant="error">{t('error.unreachable')}</Alert> : null}
        {requestReset.isSuccess ? (
          <Alert variant="success">{t('auth.passwordReset.requestSent')}</Alert>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            <Field htmlFor="email" label={t('auth.login.emailLabel')}>
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
              hint={t('auth.login.companyIdHint')}
              label={t('auth.login.companyIdLabel')}
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
                {t('auth.passwordReset.backToSignIn')}
              </Link>
              <Button disabled={requestReset.isPending} type="submit">
                {requestReset.isPending
                  ? t('auth.passwordReset.requestSubmitting')
                  : t('auth.passwordReset.requestSubmit')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

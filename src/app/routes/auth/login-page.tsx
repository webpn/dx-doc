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

import { ApiClientError } from '../../api';
import { apiErrorMessageKey, useTranslate } from '../../i18n';
import { useLogin } from '../../queries';

export function LoginPage(): ReactElement {
  const t = useTranslate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyId, setCompanyId] = useState('');
  // Companies the server offered for this address (409). Once present, the typed
  // Company ID field gives way to a chooser: the user should pick from what the
  // server resolved rather than retype an id they have just been shown.
  const [companyChoices, setCompanyChoices] = useState<string[] | null>(null);
  const login = useLogin();

  function submit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    login.reset();
    login.mutate(
      { email, password, companyId: companyId || undefined },
      {
        onError: (error) => {
          if (error instanceof ApiClientError && error.code === 'COMPANY_SELECTION_REQUIRED') {
            const choices = error.companyIds ?? [];
            setCompanyChoices(choices);
            // Preselect the first so a second submit cannot resend an empty
            // company and loop on the same 409.
            setCompanyId(choices[0] ?? '');
          }
        },
      },
    );
  }

  const error = login.error;
  // A non-401 ApiClientError keeps showing the server's own message: it is the
  // specific validation detail the user needs, and REQ-NFR-010's translation
  // requirement is satisfied for the messages this client authors. Translating
  // server-authored validation text is a backend concern (the API owns those
  // strings and the locale to render them in).
  const errorMessage =
    error === null
      ? null
      : error instanceof ApiClientError && error.status !== 401
        ? error.message
        : t(apiErrorMessageKey(error));

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('auth.login.eyebrow')}
          </p>
          <CardTitle>{t('auth.login.title')}</CardTitle>
          <CardDescription>{t('auth.login.description')}</CardDescription>
        </CardHeader>
        {errorMessage !== null ? <Alert variant="error">{errorMessage}</Alert> : null}
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
          {companyChoices === null ? (
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
          ) : (
            <Field
              htmlFor="companyChoice"
              hint={t('auth.login.companyChoiceHint')}
              label={t('auth.login.companyChoiceLabel')}
            >
              {/*
                Native `<select>`, matching project-create: the design system has
                no Select primitive yet and ADR-0008 forbids importing shadcn
                paths directly.
              */}
              <select
                className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                id="companyChoice"
                onChange={(event) => {
                  setCompanyId(event.target.value);
                }}
                value={companyId}
              >
                {companyChoices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field htmlFor="password" label={t('auth.login.passwordLabel')}>
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
              {t('auth.login.forgotPassword')}
            </Link>
            <Button disabled={login.isPending} type="submit">
              {login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

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
import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../../i18n';
import { useVerifySharedPassword } from '../../queries';

/**
 * Entry point for the read-only published view (M1.17, REQ-VIEW-001): a
 * person holding the project's shared password types it here and lands on
 * `/projects/:projectId/reader`.
 *
 * Deliberately a standalone screen outside the authenticated shell — a reader
 * need not be a member of any company, so this surface must be reachable with
 * no session at all. A wrong password is not an error from the server (it
 * answers 200 with `verified: false` so the two cases are indistinguishable to
 * an attacker); the screen turns that answer into a plain "try again" message.
 */
export function ReaderAccessPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const verify = useVerifySharedPassword(projectId);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password === '') {
      setError(t('reader.access.missingPassword'));
      return;
    }

    try {
      const result = await verify.mutateAsync(password);
      if (result.verified) {
        void navigate(`/projects/${projectId ?? ''}/reader`);
      } else {
        setError(t('reader.access.wrongPassword'));
      }
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-muted)] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
            {t('reader.access.eyebrow')}
          </p>
          <CardTitle>{t('reader.access.title')}</CardTitle>
          <CardDescription>{t('reader.access.description')}</CardDescription>
        </CardHeader>
        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        <form
          className="mt-6 grid gap-5"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <Field htmlFor="shared-password" label={t('reader.access.passwordLabel')}>
            <Input
              autoComplete="off"
              id="shared-password"
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              type="password"
              value={password}
            />
          </Field>
          <Button disabled={verify.isPending} type="submit">
            {verify.isPending ? t('reader.access.submitting') : t('reader.access.submit')}
          </Button>
        </form>
      </Card>
    </main>
  );
}

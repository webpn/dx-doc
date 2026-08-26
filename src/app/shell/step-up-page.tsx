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

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useOpenStepUp } from '../queries';

/**
 * Opens an instance-admin step-up window for one company (ADR-0027).
 *
 * Re-authenticating with the actor's own password is the trigger REQ-SEC-014
 * already requires for the administration surface; this screen supplies it.
 * On success the window is server-side state — this screen does not hold it,
 * it only sends the actor on to the action the step-up was opened for.
 */
export function StepUpPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const openStepUp = useOpenStepUp();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password === '') {
      setError(t('stepUp.missingPassword'));
      return;
    }

    try {
      await openStepUp.mutateAsync({ companyId: companyId ?? '', password });
      void navigate(`/companies/${companyId ?? ''}/projects/new`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
          {t('stepUp.eyebrow')}
        </p>
        <CardTitle>{t('stepUp.title')}</CardTitle>
        <CardDescription>{t('stepUp.description')}</CardDescription>
      </CardHeader>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field htmlFor="step-up-password" label={t('stepUp.passwordLabel')}>
          <Input
            autoComplete="current-password"
            id="step-up-password"
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            type="password"
            value={password}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={openStepUp.isPending} type="submit">
          {openStepUp.isPending ? t('stepUp.submitting') : t('stepUp.submit')}
        </Button>
      </form>
    </Card>
  );
}

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
import { useNavigate } from 'react-router-dom';

import { ApiClientError } from '../api/client';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCreateCompany } from '../queries';

/**
 * Create a company and its first Admin (REQ-SEC-014).
 *
 * These are deliberately one form rather than a company followed by an
 * invitation: a company with no Admin cannot be administered by anybody. The
 * instance administrator holds no company membership, so if this screen created
 * a company alone, nothing in the API could then act inside it — which is the
 * exact deadlock that blocked the M1.15 exit path.
 *
 * No password field: the first Admin sets their own at first sign-in
 * (REQ-SEC-013). One person choosing another person's password is a
 * credential-sharing pattern this screen refuses to offer.
 */
export function CompanyCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const createCompany = useCreateCompany();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [firstAdminEmail, setFirstAdminEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    // Validated here for immediate feedback; the backend re-validates, because
    // a rule enforced only in a screen is a rule the MCP server does not have
    // (REQ-FDN-010, ADR-0007).
    if (name.trim() === '') {
      setError(t('company.create.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('company.create.missingSlug'));
      return;
    }
    if (firstAdminEmail.trim() === '') {
      setError(t('company.create.missingFirstAdmin'));
      return;
    }

    try {
      const { companyId } = await createCompany.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        firstAdmin: { email: firstAdminEmail.trim() },
      });
      void navigate(`/companies/${companyId}/projects`);
    } catch (cause) {
      // A duplicate slug is the one failure the actor can fix in place, so it
      // gets a specific message instead of the generic conflict wording.
      if (cause instanceof ApiClientError && cause.status === 409) {
        setError(t('company.create.slugTaken'));
        return;
      }
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">
          {t('company.create.eyebrow')}
        </p>
        <CardTitle>{t('company.create.title')}</CardTitle>
        <CardDescription>{t('company.create.description')}</CardDescription>
      </CardHeader>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field htmlFor="company-name" label={t('company.create.nameLabel')}>
          <Input
            autoComplete="organization"
            id="company-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field
          hint={t('company.create.slugHint')}
          htmlFor="company-slug"
          label={t('company.create.slugLabel')}
        >
          <Input
            id="company-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        <Field
          hint={t('company.create.firstAdminHint')}
          htmlFor="company-first-admin"
          label={t('company.create.firstAdminLabel')}
        >
          <Input
            autoComplete="email"
            id="company-first-admin"
            onChange={(event) => {
              setFirstAdminEmail(event.target.value);
            }}
            type="email"
            value={firstAdminEmail}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createCompany.isPending} type="submit">
          {createCompany.isPending ? t('company.create.submitting') : t('company.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

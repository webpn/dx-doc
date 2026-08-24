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

import { PLATFORMS, type Platform } from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCreateProject } from '../queries';

/**
 * Create a project inside the company selected in the URL (M1.15).
 *
 * `platform` has no default: the domain requires it and nothing in the product
 * says which one is likeliest, so the actor chooses. A default here would be an
 * invented business rule.
 *
 * Uses a native `<select>` rather than a design-system primitive because the
 * design system has no Select yet (ADR-0008 forbids reaching into shadcn paths
 * directly, and adding a primitive needs its own justification). When one is
 * added, this is the first caller to migrate.
 */
export function ProjectCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const createProject = useCreateProject(companyId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('project.create.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('project.create.missingSlug'));
      return;
    }
    if (platform === '') {
      setError(t('project.create.missingPlatform'));
      return;
    }

    // Optional fields are omitted when blank rather than sent as '': the
    // columns are nullable and the empty string is a value the actor never
    // typed.
    const trimmedDescription = description.trim();

    try {
      const { id } = await createProject.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        platform,
        ...(trimmedDescription === '' ? {} : { description: trimmedDescription }),
      });
      void navigate(`/projects/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('project.create.title')}</CardTitle>
        <CardDescription>{t('project.create.description')}</CardDescription>
      </CardHeader>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <Field htmlFor="project-name" label={t('project.create.nameLabel')}>
          <Input
            id="project-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field
          hint={t('project.create.slugHint')}
          htmlFor="project-slug"
          label={t('project.create.slugLabel')}
        >
          <Input
            id="project-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        <Field htmlFor="project-platform" label={t('project.create.platformLabel')}>
          <select
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            id="project-platform"
            onChange={(event) => {
              setPlatform(event.target.value as Platform | '');
            }}
            value={platform}
          >
            <option value="">{t('project.create.platformPlaceholder')}</option>
            {PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field
          hint={t('project.create.descriptionHint')}
          htmlFor="project-description"
          label={t('project.create.descriptionLabel')}
        >
          <Input
            id="project-description"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createProject.isPending} type="submit">
          {createProject.isPending ? t('project.create.submitting') : t('project.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

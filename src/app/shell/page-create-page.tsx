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
import { useCreatePage, usePages } from '../queries';

/**
 * Create a page/screen inside a project (REQ-DOM-001).
 *
 * Only name, slug and an optional parent are asked here; the behavioural
 * description is filled in afterwards in the page editor, matching how a
 * free page is created before its content exists.
 */
export function PageCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const pages = usePages(projectId);
  const createPage = useCreatePage(projectId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('page.create.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('page.create.missingSlug'));
      return;
    }

    try {
      const { id } = await createPage.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        // An omitted parentId means "no parent"; the API treats the absent
        // key and an empty string differently, so only a real id is sent.
        ...(parentId === '' ? {} : { parentId }),
      });
      void navigate(`/projects/${projectId ?? ''}/pages/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('page.create.title')}</CardTitle>
        <CardDescription>{t('page.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="page-create-name" label={t('page.create.nameLabel')}>
          <Input
            id="page-create-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="page-create-slug" label={t('page.create.slugLabel')}>
          <Input
            id="page-create-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        <Field htmlFor="page-create-parent" label={t('page.create.parentLabel')}>
          <select
            id="page-create-parent"
            onChange={(event) => {
              setParentId(event.target.value);
            }}
            value={parentId}
          >
            <option value="">{t('page.create.parentNone')}</option>
            {(pages.data ?? []).map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createPage.isPending} type="submit">
          {createPage.isPending ? t('page.create.submitting') : t('page.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

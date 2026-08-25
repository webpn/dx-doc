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
import { useCreateFreePage, useProject } from '../queries';

/**
 * Create a free wiki page inside a project (REQ-AUTH-003).
 *
 * Only title and slug are asked here; content and parenting are edited
 * afterwards in the editor, matching how a page is created before its
 * description is filled in.
 */
export function FreePageCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const companyId = project.data?.companyId;
  const createFreePage = useCreateFreePage(companyId ?? '', projectId ?? null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (title.trim() === '') {
      setError(t('freePage.create.missingTitle'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('freePage.create.missingSlug'));
      return;
    }
    if (companyId === undefined) return;

    try {
      const { id } = await createFreePage.mutateAsync({
        title: title.trim(),
        slug: slug.trim(),
      });
      void navigate(`/projects/${projectId ?? ''}/free-pages/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('freePage.create.title')}</CardTitle>
        <CardDescription>{t('freePage.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="free-page-title" label={t('freePage.create.titleLabel')}>
          <Input
            id="free-page-title"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            value={title}
          />
        </Field>

        <Field htmlFor="free-page-slug" label={t('freePage.create.slugLabel')}>
          <Input
            id="free-page-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createFreePage.isPending} type="submit">
          {createFreePage.isPending ? t('freePage.create.submitting') : t('freePage.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

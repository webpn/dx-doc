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
import { useCreateFlow } from '../queries';

/**
 * Create a flow inside a project (REQ-NAV-003).
 *
 * Only name and slug are asked here; the description and the graph are edited
 * afterwards in the editor, matching how a page is created before its
 * description is filled in.
 */
export function FlowCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const createFlow = useCreateFlow(projectId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('flow.create.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('flow.create.missingSlug'));
      return;
    }
    if (projectId === undefined) return;

    try {
      const { id } = await createFlow.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
      });
      void navigate(`/projects/${projectId}/flows/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('flow.create.title')}</CardTitle>
        <CardDescription>{t('flow.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="flow-name" label={t('flow.create.nameLabel')}>
          <Input
            id="flow-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="flow-slug" label={t('flow.create.slugLabel')}>
          <Input
            id="flow-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createFlow.isPending} type="submit">
          {createFlow.isPending ? t('flow.create.submitting') : t('flow.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

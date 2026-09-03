import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from '@project/design-system';
import { useState, type ReactElement, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCreateNavigationEvent } from '../queries';

/** Create a project-scoped navigation event (M1.16, REQ-DOM-002). */
export function NavigationEventCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const createNavigationEvent = useCreateNavigationEvent(projectId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('navigationEvent.create.missingName'));
      return;
    }

    try {
      await createNavigationEvent.mutateAsync({
        name: name.trim(),
        ...(description === '' ? {} : { description }),
        active,
      });
      void navigate(`/projects/${projectId ?? ''}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('navigationEvent.create.title')}</CardTitle>
        <CardDescription>{t('navigationEvent.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="navigation-event-create-name" label={t('navigationEvent.create.nameLabel')}>
          <Input
            id="navigation-event-create-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field
          htmlFor="navigation-event-create-description"
          label={t('navigationEvent.create.descriptionLabel')}
        >
          <Textarea
            id="navigation-event-create-description"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </Field>

        <Field
          htmlFor="navigation-event-create-active"
          label={t('navigationEvent.create.activeLabel')}
        >
          <input
            checked={active}
            id="navigation-event-create-active"
            onChange={(event) => {
              setActive(event.target.checked);
            }}
            type="checkbox"
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createNavigationEvent.isPending} type="submit">
          {createNavigationEvent.isPending
            ? t('navigationEvent.create.submitting')
            : t('navigationEvent.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

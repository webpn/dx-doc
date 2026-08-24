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
import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useTrackingTemplate, useUpdateTrackingTemplate } from '../queries';

/**
 * Edit a tracking template — a blueprint for new trackings (REQ-DOM-009).
 *
 * Editing a template never touches trackings already created from it; the
 * update hook deliberately leaves tracking caches alone. The config is stored
 * as a JSON string, so it is validated here before sending rather than letting
 * the backend reject an unparseable blob.
 */
export function TemplateEditorPage(): ReactElement {
  const t = useTranslate();
  const { templateId } = useParams<{ templateId: string }>();
  const template = useTrackingTemplate(templateId);
  const updateTemplate = useUpdateTrackingTemplate(templateId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loaded = template.data;

  useEffect(() => {
    if (loaded === undefined) return;
    setName(loaded.name);
    setDescription(loaded.description ?? '');
    setConfigJson(loaded.configJson ?? '');
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim() === '') {
      setError(t('template.edit.missingName'));
      return;
    }

    // configJson is a stored string; catch a malformed blob here so the editor
    // gives an immediate, local reason rather than a round-trip 400.
    if (configJson.trim() !== '') {
      try {
        JSON.parse(configJson);
      } catch {
        setError(t('template.edit.invalidConfig'));
        return;
      }
    }

    try {
      await updateTemplate.mutateAsync({
        name: name.trim(),
        description,
        configJson,
        expectedUpdatedAt: loaded?.updatedAt,
      });
      setSaved(true);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('template.edit.title')}</CardTitle>
        <CardDescription>{t('template.edit.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="template-name" label={t('template.edit.name')}>
          <Input
            id="template-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="template-description" label={t('template.edit.description')}>
          <Input
            id="template-description"
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            value={description}
          />
        </Field>

        <Field htmlFor="template-config" label={t('template.edit.config')}>
          <Input
            id="template-config"
            onChange={(e) => {
              setConfigJson(e.target.value);
            }}
            value={configJson}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        {saved ? <Alert variant="success">{t('template.edit.saved')}</Alert> : null}

        <Button disabled={updateTemplate.isPending} type="submit">
          {t('template.edit.save')}
        </Button>
      </form>
    </Card>
  );
}

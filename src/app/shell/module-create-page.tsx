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
import { useCreateModule, useProject, useProperties } from '../queries';

/**
 * Create a brand-new module inside a project (M1.16, REQ-DOM-004).
 *
 * The property set is chosen at creation from this project's own properties —
 * a module only references properties it belongs to (REQ-DOM-028) — and the
 * new module opens in its editor afterwards, where propagation lives.
 */
export function ModuleCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const properties = useProperties(project.data?.companyId, projectId);
  const createModule = useCreateModule(project.data?.companyId ?? '', projectId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleProperty(id: string): void {
    setPropertyIds((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('module.create.missingName'));
      return;
    }

    try {
      const { id } = await createModule.mutateAsync({
        name: name.trim(),
        // An empty module is valid; the property set can be grown in the editor.
        propertyIds,
        ...(description === '' ? {} : { description }),
      });
      void navigate(`/projects/${projectId ?? ''}/modules/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('module.create.title')}</CardTitle>
        <CardDescription>{t('module.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="module-create-name" label={t('module.create.nameLabel')}>
          <Input
            id="module-create-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="module-create-description" label={t('module.create.description')}>
          <Input
            id="module-create-description"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </Field>

        <fieldset>
          <legend>{t('module.create.properties')}</legend>
          <ul>
            {(properties.data ?? []).map((property) => (
              <li key={property.id}>
                <input
                  checked={propertyIds.includes(property.id)}
                  id={`module-create-property-${property.id}`}
                  onChange={() => {
                    toggleProperty(property.id);
                  }}
                  type="checkbox"
                />
                <label htmlFor={`module-create-property-${property.id}`}>{property.name}</label>
              </li>
            ))}
          </ul>
        </fieldset>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createModule.isPending} type="submit">
          {createModule.isPending ? t('module.create.submitting') : t('module.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

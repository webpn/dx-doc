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
import {
  useModule,
  useModulePropagationPreview,
  useProject,
  useProperties,
  usePropagateModule,
  useUpdateModule,
} from '../queries';

/**
 * Edit a module — a reusable group of data-layer properties (REQ-DOM-004).
 *
 * The property set is sent whole, so unticking everything genuinely empties the
 * module rather than being read as "no change". Saves carry the loaded
 * `updatedAt` so a concurrent edit is reported (REQ-AUTH-005).
 */
export function ModuleEditorPage(): ReactElement {
  const t = useTranslate();
  const { projectId, moduleId } = useParams<{ projectId: string; moduleId: string }>();
  const project = useProject(projectId);
  const loadedModule = useModule(moduleId);
  const properties = useProperties(project.data?.companyId, projectId);
  const updateModule = useUpdateModule(moduleId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // REQ-DOM-007: the preview is only fetched once the editor asks for it.
  const [previewRequested, setPreviewRequested] = useState(false);
  const [propagateError, setPropagateError] = useState<string | null>(null);
  const [propagated, setPropagated] = useState<number | null>(null);

  const propagationPreview = useModulePropagationPreview(moduleId, previewRequested);
  const propagateModule = usePropagateModule(moduleId ?? '');

  async function handlePropagate(): Promise<void> {
    setPropagateError(null);
    try {
      const result = await propagateModule.mutateAsync();
      setPropagated(result.updatedTrackingCount);
    } catch (cause) {
      setPropagateError(t(apiErrorMessageKey(cause)));
    }
  }

  const loaded = loadedModule.data;

  useEffect(() => {
    if (loaded === undefined) return;
    setName(loaded.module.name);
    setDescription(loaded.module.description ?? '');
    setPropertyIds(loaded.propertyIds);
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim() === '') {
      setError(t('module.edit.missingName'));
      return;
    }

    try {
      await updateModule.mutateAsync({
        name: name.trim(),
        description,
        propertyIds,
        expectedUpdatedAt: loaded?.module.updatedAt,
      });
      setSaved(true);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('module.edit.title')}</CardTitle>
        <CardDescription>{t('module.edit.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="module-name" label={t('module.edit.name')}>
          <Input
            id="module-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="module-description" label={t('module.edit.description')}>
          <Input
            id="module-description"
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            value={description}
          />
        </Field>

        <fieldset>
          <legend>{t('module.edit.properties')}</legend>
          <ul>
            {(properties.data ?? []).map((property) => (
              <li key={property.id}>
                <input
                  checked={propertyIds.includes(property.id)}
                  id={`module-property-${property.id}`}
                  onChange={() => {
                    setPropertyIds((current) =>
                      current.includes(property.id)
                        ? current.filter((entry) => entry !== property.id)
                        : [...current, property.id],
                    );
                  }}
                  type="checkbox"
                />
                <label htmlFor={`module-property-${property.id}`}>{property.name}</label>
              </li>
            ))}
          </ul>
        </fieldset>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        {saved ? <Alert variant="success">{t('module.edit.saved')}</Alert> : null}

        <Button disabled={updateModule.isPending} type="submit">
          {t('module.edit.save')}
        </Button>
      </form>

      {/*
        REQ-DOM-007: propagation is opt-in and outside the save form — a module
        edit must never reach existing trackings as a side effect of saving.
        Nothing is fetched until the editor asks, and the result is shown before
        anything is applied.
      */}
      <section>
        <h3>{t('module.propagate.title')}</h3>
        <p>{t('module.propagate.explainer')}</p>

        {!previewRequested ? (
          <Button
            onClick={() => {
              setPropagateError(null);
              setPropagated(null);
              setPreviewRequested(true);
            }}
            type="button"
          >
            {t('module.propagate.check')}
          </Button>
        ) : null}

        {previewRequested && propagationPreview.data !== undefined ? (
          <div>
            <p>
              {t('module.propagate.affected', {
                count: String(propagationPreview.data.affected.length),
              })}
            </p>
            {propagationPreview.data.affected.length > 0 ? (
              <Button
                disabled={propagateModule.isPending}
                onClick={() => void handlePropagate()}
                type="button"
              >
                {t('module.propagate.now')}
              </Button>
            ) : null}
          </div>
        ) : null}

        {propagateError !== null ? <Alert variant="error">{propagateError}</Alert> : null}
        {propagated !== null ? (
          <Alert variant="success">
            {t('module.propagate.done', { count: String(propagated) })}
          </Alert>
        ) : null}
      </section>
    </Card>
  );
}

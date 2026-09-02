import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@project/design-system';
import { useState, type ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCopyCatalogue, useModules, useProject, useProperties } from '../queries';

/**
 * Choose company-catalogue items to copy into a project (REQ-DOM-019).
 *
 * The copy is one-way and provenance-free: the project gets its own items, and
 * later catalogue edits never reach them. Selecting a module also brings the
 * properties that module is made of, so the copied counts can exceed the number
 * of ticked boxes — the screen reports what actually landed rather than what was
 * asked for.
 */
export function CatalogueCopyPage(): ReactElement {
  const t = useTranslate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const companyId = project.data?.companyId;

  // No projectId argument: that is what scopes these reads to the company
  // catalogue rather than to the project's own items.
  const properties = useProperties(companyId);
  const modules = useModules(companyId);
  const copyCatalogue = useCopyCatalogue(companyId ?? '', projectId ?? '');

  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ properties: number; modules: number } | null>(null);

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  async function handleCopy(): Promise<void> {
    setError(null);
    setCopied(null);

    if (selectedProperties.length === 0 && selectedModules.length === 0) {
      setError(t('catalogue.copy.nothingSelected'));
      return;
    }

    try {
      const result = await copyCatalogue.mutateAsync({
        propertyIds: selectedProperties,
        moduleIds: selectedModules,
      });
      setCopied({ properties: result.copiedProperties, modules: result.copiedModules });
      setSelectedProperties([]);
      setSelectedModules([]);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('catalogue.copy.title')}</CardTitle>
        <CardDescription>{t('catalogue.copy.subtitle')}</CardDescription>
      </CardHeader>

      {/* Copying covers reusing catalogue items; creating brand-new ones in
          this project is the other way to fill it, so it is linked here too. */}
      <p className="text-sm text-[var(--color-muted)]">
        {t('catalogue.copy.createInstead')}{' '}
        <Link
          className="font-medium text-[var(--color-ink)] underline"
          to={`/projects/${projectId ?? ''}/properties/new`}
        >
          {t('property.list.create')}
        </Link>
        {' · '}
        <Link
          className="font-medium text-[var(--color-ink)] underline"
          to={`/projects/${projectId ?? ''}/modules/new`}
        >
          {t('module.list.create')}
        </Link>
      </p>

      <section>
        <h3>{t('catalogue.copy.properties')}</h3>
        <ul>
          {(properties.data ?? []).map((property) => (
            <li key={property.id}>
              <input
                checked={selectedProperties.includes(property.id)}
                id={`property-${property.id}`}
                onChange={() => {
                  setSelectedProperties((current) => toggle(current, property.id));
                }}
                type="checkbox"
              />
              <label htmlFor={`property-${property.id}`}>{property.name}</label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>{t('catalogue.copy.modules')}</h3>
        <ul>
          {(modules.data ?? []).map((module) => (
            <li key={module.id}>
              <input
                checked={selectedModules.includes(module.id)}
                id={`module-${module.id}`}
                onChange={() => {
                  setSelectedModules((current) => toggle(current, module.id));
                }}
                type="checkbox"
              />
              <label htmlFor={`module-${module.id}`}>{module.name}</label>
            </li>
          ))}
        </ul>
      </section>

      {error !== null ? <Alert variant="error">{error}</Alert> : null}
      {copied !== null ? (
        <Alert variant="success">
          {t('catalogue.copy.done', {
            properties: String(copied.properties),
            modules: String(copied.modules),
          })}
        </Alert>
      ) : null}

      <Button disabled={copyCatalogue.isPending} onClick={() => void handleCopy()} type="button">
        {t('catalogue.copy.submit')}
      </Button>
    </Card>
  );
}

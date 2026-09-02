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

import {
  PROPERTY_DATA_SOURCES,
  PROPERTY_DATA_TYPES,
  PROPERTY_STATUSES,
  type PropertyDataSource,
  type PropertyDataType,
  type PropertyStatus,
} from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCreateProperty, useProject } from '../queries';

/**
 * Create a brand-new data-layer property inside a project (M1.16, REQ-DOM-003).
 *
 * The fields mirror the property editor, so nothing visible there is unreachable
 * at creation time; the hierarchy and destination mappings stay editor-only,
 * because they need the property to exist first. Creating navigates straight to
 * the editor, where the rest of the work happens.
 */
export function PropertyCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const createProperty = useCreateProperty(project.data?.companyId ?? '', projectId ?? '');

  const [name, setName] = useState('');
  const [businessLabel, setBusinessLabel] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PropertyDataType>('string');
  const [dataSource, setDataSource] = useState<PropertyDataSource>('development');
  const [status, setStatus] = useState<PropertyStatus>('active');
  const [piiFlag, setPiiFlag] = useState(false);
  const [hashingPolicy, setHashingPolicy] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('property.create.missingName'));
      return;
    }

    try {
      const { id } = await createProperty.mutateAsync({
        name: name.trim(),
        type,
        dataSource,
        status,
        piiFlag,
        // An empty optional field means "not filled in"; the API stores null
        // for the absent key, so empty strings are never persisted.
        ...(businessLabel === '' ? {} : { businessLabel }),
        ...(description === '' ? {} : { description }),
        ...(hashingPolicy === '' ? {} : { hashingPolicy }),
      });
      void navigate(`/projects/${projectId ?? ''}/properties/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('property.create.title')}</CardTitle>
        <CardDescription>{t('property.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="property-create-name" label={t('property.create.nameLabel')}>
          <Input
            id="property-create-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="property-create-label" label={t('property.create.businessLabel')}>
          <Input
            id="property-create-label"
            onChange={(event) => {
              setBusinessLabel(event.target.value);
            }}
            value={businessLabel}
          />
        </Field>

        <Field htmlFor="property-create-description" label={t('property.create.description')}>
          <Input
            id="property-create-description"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            value={description}
          />
        </Field>

        <Field htmlFor="property-create-type" label={t('property.create.type')}>
          <select
            id="property-create-type"
            onChange={(event) => {
              setType(event.target.value as PropertyDataType);
            }}
            value={type}
          >
            {PROPERTY_DATA_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="property-create-source" label={t('property.create.dataSource')}>
          <select
            id="property-create-source"
            onChange={(event) => {
              setDataSource(event.target.value as PropertyDataSource);
            }}
            value={dataSource}
          >
            {PROPERTY_DATA_SOURCES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="property-create-status" label={t('property.create.status')}>
          <select
            id="property-create-status"
            onChange={(event) => {
              setStatus(event.target.value as PropertyStatus);
            }}
            value={status}
          >
            {PROPERTY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="property-create-pii" label={t('property.create.piiFlag')}>
          <input
            checked={piiFlag}
            id="property-create-pii"
            onChange={(event) => {
              setPiiFlag(event.target.checked);
            }}
            type="checkbox"
          />
        </Field>

        <Field htmlFor="property-create-hashing" label={t('property.create.hashingPolicy')}>
          <Input
            id="property-create-hashing"
            onChange={(event) => {
              setHashingPolicy(event.target.value);
            }}
            value={hashingPolicy}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createProperty.isPending} type="submit">
          {createProperty.isPending ? t('property.create.submitting') : t('property.create.submit')}
        </Button>
      </form>
    </Card>
  );
}

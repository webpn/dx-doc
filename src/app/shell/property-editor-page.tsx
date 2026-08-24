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

import {
  PROPERTY_DATA_SOURCES,
  PROPERTY_DATA_TYPES,
  PROPERTY_STATUSES,
  type PropertyDataSource,
  type PropertyDataType,
  type PropertyStatus,
} from '../api';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useProperty, useUpdateProperty } from '../queries';

/**
 * Edit a data-layer property (REQ-DOM-003).
 *
 * Saves carry the `updatedAt` the form was loaded with, so a concurrent edit is
 * reported rather than silently overwritten (REQ-AUTH-005). A rejected save
 * keeps what was typed — the edit is the expensive part, not the request.
 */
export function PropertyEditorPage(): ReactElement {
  const t = useTranslate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const property = useProperty(propertyId);
  const updateProperty = useUpdateProperty(propertyId ?? '');

  const [name, setName] = useState('');
  const [businessLabel, setBusinessLabel] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PropertyDataType>('string');
  const [dataSource, setDataSource] = useState<PropertyDataSource>('development');
  const [status, setStatus] = useState<PropertyStatus>('active');
  const [piiFlag, setPiiFlag] = useState(false);
  const [hashingPolicy, setHashingPolicy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loaded = property.data;

  // Seed from the loaded record. TanStack Query returns a stable object per
  // cache entry, so this re-seeds exactly when the stored property changes.
  useEffect(() => {
    if (loaded === undefined) return;
    setName(loaded.name);
    setBusinessLabel(loaded.businessLabel ?? '');
    setDescription(loaded.description ?? '');
    setType(loaded.type);
    setDataSource(loaded.dataSource);
    setStatus(loaded.status);
    setPiiFlag(loaded.piiFlag);
    setHashingPolicy(loaded.hashingPolicy ?? '');
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);

    if (name.trim() === '') {
      setError(t('property.edit.missingName'));
      return;
    }

    try {
      await updateProperty.mutateAsync({
        name: name.trim(),
        businessLabel,
        description,
        type,
        dataSource,
        status,
        piiFlag,
        hashingPolicy,
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
        <CardTitle>{t('property.edit.title')}</CardTitle>
        <CardDescription>{t('property.edit.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="property-name" label={t('property.edit.name')}>
          <Input
            id="property-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="property-label" label={t('property.edit.businessLabel')}>
          <Input
            id="property-label"
            onChange={(e) => {
              setBusinessLabel(e.target.value);
            }}
            value={businessLabel}
          />
        </Field>

        <Field htmlFor="property-description" label={t('property.edit.description')}>
          <Input
            id="property-description"
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            value={description}
          />
        </Field>

        <Field htmlFor="property-type" label={t('property.edit.type')}>
          <select
            id="property-type"
            onChange={(e) => {
              setType(e.target.value as PropertyDataType);
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

        <Field htmlFor="property-source" label={t('property.edit.dataSource')}>
          <select
            id="property-source"
            onChange={(e) => {
              setDataSource(e.target.value as PropertyDataSource);
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

        <Field htmlFor="property-status" label={t('property.edit.status')}>
          <select
            id="property-status"
            onChange={(e) => {
              setStatus(e.target.value as PropertyStatus);
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

        <Field htmlFor="property-pii" label={t('property.edit.piiFlag')}>
          <input
            checked={piiFlag}
            id="property-pii"
            onChange={(e) => {
              setPiiFlag(e.target.checked);
            }}
            type="checkbox"
          />
        </Field>

        <Field htmlFor="property-hashing" label={t('property.edit.hashingPolicy')}>
          <Input
            id="property-hashing"
            onChange={(e) => {
              setHashingPolicy(e.target.value);
            }}
            value={hashingPolicy}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        {saved ? <Alert variant="success">{t('property.edit.saved')}</Alert> : null}

        <Button disabled={updateProperty.isPending} type="submit">
          {t('property.edit.save')}
        </Button>
      </form>
    </Card>
  );
}

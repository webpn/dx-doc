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
import { useDestination, useUpdateDestination } from '../queries';

/**
 * Edit a destination mapping — where a tracking's data ends up (REQ-DOM-005).
 *
 * `platform` and `variableType` are free text, not enums: the backend validates
 * them as bounded strings, so the client must not invent a closed option list
 * that would reject a platform the spec never enumerated.
 */
export function DestinationEditorPage(): ReactElement {
  const t = useTranslate();
  const { destinationId } = useParams<{ destinationId: string }>();
  const destination = useDestination(destinationId);
  const updateDestination = useUpdateDestination(destinationId ?? '');

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [variableType, setVariableType] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [reconciliationIdentifier, setReconciliationIdentifier] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const loaded = destination.data;

  useEffect(() => {
    if (loaded === undefined) return;
    setName(loaded.name);
    setPlatform(loaded.platform);
    setVariableType(loaded.variableType);
    setIdentifier(loaded.identifier);
    setReconciliationIdentifier(loaded.reconciliationIdentifier ?? '');
    setNotes(loaded.notes ?? '');
  }, [loaded]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(false);

    // Each of these carries the mapping's meaning; the backend rejects them
    // empty too, but saying so here avoids a pointless round-trip.
    if (name.trim() === '' || platform.trim() === '' || variableType.trim() === '') {
      setError(t('destination.edit.missingFields'));
      return;
    }
    if (identifier.trim() === '') {
      setError(t('destination.edit.missingIdentifier'));
      return;
    }

    try {
      await updateDestination.mutateAsync({
        name: name.trim(),
        platform: platform.trim(),
        variableType: variableType.trim(),
        identifier: identifier.trim(),
        reconciliationIdentifier,
        notes,
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
        <CardTitle>{t('destination.edit.title')}</CardTitle>
        <CardDescription>{t('destination.edit.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="destination-name" label={t('destination.edit.name')}>
          <Input
            id="destination-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="destination-platform" label={t('destination.edit.platform')}>
          <Input
            id="destination-platform"
            onChange={(e) => {
              setPlatform(e.target.value);
            }}
            value={platform}
          />
        </Field>

        <Field htmlFor="destination-variable-type" label={t('destination.edit.variableType')}>
          <Input
            id="destination-variable-type"
            onChange={(e) => {
              setVariableType(e.target.value);
            }}
            value={variableType}
          />
        </Field>

        <Field htmlFor="destination-identifier" label={t('destination.edit.identifier')}>
          <Input
            id="destination-identifier"
            onChange={(e) => {
              setIdentifier(e.target.value);
            }}
            value={identifier}
          />
        </Field>

        <Field
          htmlFor="destination-reconciliation"
          label={t('destination.edit.reconciliationIdentifier')}
        >
          <Input
            id="destination-reconciliation"
            onChange={(e) => {
              setReconciliationIdentifier(e.target.value);
            }}
            value={reconciliationIdentifier}
          />
        </Field>

        <Field htmlFor="destination-notes" label={t('destination.edit.notes')}>
          <Input
            id="destination-notes"
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            value={notes}
          />
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        {saved ? <Alert variant="success">{t('destination.edit.saved')}</Alert> : null}

        <Button disabled={updateDestination.isPending} type="submit">
          {t('destination.edit.save')}
        </Button>
      </form>
    </Card>
  );
}

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
import { useNavigate, useParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import {
  useDeleteTrigger,
  useTrackings,
  useTrigger,
  useUpdateTrigger,
} from '../queries';

import { ProjectWorkspace } from './project-workspace';

/**
 * Edit one trigger: what it is, and the trackings it fires (REQ-NAV-004).
 *
 * A Trigger is the navigation, system or user action that causes a tracking to
 * fire. Its associated trackings are edited here as a list; the source and
 * destination Pages of the trigger live in the flow graph, where the trigger
 * appears as a node (REQ-NAV-004).
 */
export function TriggerEditorPage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId, triggerId } = useParams<{ projectId: string; triggerId: string }>();
  const trigger = useTrigger(triggerId);
  const trackings = useTrackings(projectId);
  const updateTrigger = useUpdateTrigger(triggerId ?? '', projectId ?? '');
  const deleteTrigger = useDeleteTrigger(projectId ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackingIds, setTrackingIds] = useState<string[]>([]);
  const [trackingToAttach, setTrackingToAttach] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const detail = trigger.data;
  useEffect(() => {
    if (detail === undefined) return;
    setName(detail.trigger.name);
    setDescription(detail.trigger.description ?? '');
    setTrackingIds(detail.trackingIds);
  }, [detail]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (name.trim() === '') {
      setError(t('trigger.edit.missingName'));
      return;
    }
    if (detail === undefined) return;

    try {
      await updateTrigger.mutateAsync({
        name: name.trim(),
        description,
        trackingIds,
        expectedUpdatedAt: detail.trigger.updatedAt,
      });
      setNotice(t('trigger.edit.saved'));
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  function handleAttach(): void {
    setError(null);
    if (trackingToAttach === '') return;
    setTrackingIds((current) =>
      current.includes(trackingToAttach) ? current : [...current, trackingToAttach],
    );
    setTrackingToAttach('');
  }

  function handleRemoveTracking(trackingId: string): void {
    setError(null);
    setTrackingIds((current) => current.filter((id) => id !== trackingId));
  }

  async function handleDelete(): Promise<void> {
    if (triggerId === undefined) return;
    if (!window.confirm(t('trigger.edit.deleteConfirm'))) return;

    setError(null);
    try {
      await deleteTrigger.mutateAsync(triggerId);
      void navigate(`/projects/${projectId ?? ''}/flows`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  if (trigger.isPending) {
    return <p>{t('trigger.edit.loading')}</p>;
  }
  if (trigger.error !== null || detail === undefined) {
    return <Alert variant="error">{t('trigger.edit.loadError')}</Alert>;
  }

  const attachable = (trackings.data ?? []).filter(
    (candidate) => !trackingIds.includes(candidate.id),
  );
  const trackingName = (trackingId: string): string =>
    (trackings.data ?? []).find((tracking) => tracking.id === trackingId)?.name ?? trackingId;

  return (
    <ProjectWorkspace projectId={projectId ?? ''}>
      <Card>
        <CardHeader>
          <CardTitle>{t('trigger.edit.title')}</CardTitle>
          <CardDescription>{t('trigger.edit.subtitle')}</CardDescription>
        </CardHeader>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <Field htmlFor="trigger-name" label={t('trigger.edit.name')}>
            <Input
              id="trigger-name"
              onChange={(e) => {
                setName(e.target.value);
              }}
              value={name}
            />
          </Field>
          <Field htmlFor="trigger-description" label={t('trigger.edit.description')}>
            <Input
              id="trigger-description"
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              value={description}
            />
          </Field>
          {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
          {error !== null ? <Alert variant="error">{error}</Alert> : null}
          <Button disabled={updateTrigger.isPending} type="submit">
            {t('trigger.edit.save')}
          </Button>
        </form>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('trigger.edit.trackings')}</CardTitle>
        </CardHeader>

        <Field htmlFor="trigger-tracking" label={t('trigger.edit.attachTracking')}>
          <select
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            id="trigger-tracking"
            onChange={(e) => {
              setTrackingToAttach(e.target.value);
            }}
            value={trackingToAttach}
          >
            <option value="">{t('trigger.edit.trackingNone')}</option>
            {attachable.map((tracking) => (
              <option key={tracking.id} value={tracking.id}>
                {tracking.name}
              </option>
            ))}
          </select>
        </Field>
        <Button
          disabled={trackingToAttach === ''}
          onClick={handleAttach}
          type="button"
          variant="secondary"
        >
          {t('trigger.edit.attach')}
        </Button>

        <ul>
          {trackingIds.map((trackingId) => (
            <li className="flex items-center gap-3 py-1" key={trackingId}>
              <span className="text-sm text-[var(--color-ink)]">{trackingName(trackingId)}</span>
              <Button
                onClick={() => {
                  handleRemoveTracking(trackingId);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t('trigger.edit.removeTracking')}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Button
        className="mt-6"
        disabled={deleteTrigger.isPending}
        onClick={() => void handleDelete()}
        type="button"
        variant="secondary"
      >
        {t('trigger.edit.delete')}
      </Button>
    </ProjectWorkspace>
  );
}
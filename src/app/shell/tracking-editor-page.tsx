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

import { PRESENCE_VALUES, type Presence } from '../api';
import { MarkdownEditor } from '../editor';
import { apiErrorMessageKey, useTranslate } from '../i18n';
import {
  useApplyModule,
  useModules,
  useNavigationEvents,
  usePages,
  useProject,
  useProperties,
  useRemoveTrackingProperty,
  useSetPresence,
  useTracking,
  useUpdateTracking,
} from '../queries';

/**
 * Edit one tracking: what it is, where it fires, which modules it applies, and
 * the resulting property set (REQ-DOM-002).
 *
 * The navigation-event list comes from the project (REQ-DOM-002 is explicit
 * that it is editor-owned project data, not a hard-coded enum), so this screen
 * only ever offers what the project defines.
 *
 * Removing a property can detach the module that supplied it when it was that
 * module's last property (REQ-DOM-008). The API reports it and this screen says
 * so — a module silently left with no effect is what the rule prevents.
 */
export function TrackingEditorPage(): ReactElement {
  const t = useTranslate();
  const { projectId, trackingId } = useParams<{ projectId: string; trackingId: string }>();
  const tracking = useTracking(trackingId);
  const project = useProject(projectId);
  const companyId = project.data?.companyId;
  const navigationEvents = useNavigationEvents(projectId);
  const pages = usePages(projectId);
  const modules = useModules(companyId, projectId);
  const properties = useProperties(companyId, projectId);

  const updateTracking = useUpdateTracking(trackingId ?? '', projectId ?? '');
  const applyModule = useApplyModule(trackingId ?? '');
  const removeProperty = useRemoveTrackingProperty(trackingId ?? '');
  const setPresence = useSetPresence(trackingId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [pageId, setPageId] = useState('');
  const [navigationEventId, setNavigationEventId] = useState('');
  const [description, setDescription] = useState('');
  const [moduleToAttach, setModuleToAttach] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const detail = tracking.data;
  useEffect(() => {
    if (detail === undefined) return;
    setName(detail.tracking.name);
    setSlug(detail.tracking.slug);
    setPageId(detail.tracking.pageId ?? '');
    setNavigationEventId(detail.tracking.navigationEventId);
    setDescription(detail.tracking.description ?? '');
  }, [detail]);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (detail === undefined) return;

    if (name.trim() === '') {
      setError(t('tracking.edit.missingName'));
      return;
    }
    if (navigationEventId === '') {
      setError(t('tracking.edit.missingEvent'));
      return;
    }

    try {
      await updateTracking.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        navigationEventId,
        ...(pageId === '' ? {} : { pageId }),
        description,
        expectedUpdatedAt: detail.tracking.updatedAt,
      });
      setNotice(t('tracking.edit.saved'));
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleAttach(): Promise<void> {
    setError(null);
    if (moduleToAttach === '') return;
    try {
      await applyModule.mutateAsync(moduleToAttach);
      setModuleToAttach('');
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handleRemoveProperty(propertyId: string): Promise<void> {
    setError(null);
    setWarning(null);
    try {
      const result = await removeProperty.mutateAsync(propertyId);
      if (result.warnModuleDetached === true) {
        setWarning(t('tracking.edit.moduleDetached'));
      }
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  async function handlePresence(propertyId: string, presence: Presence): Promise<void> {
    setError(null);
    try {
      await setPresence.mutateAsync({ propertyId, presence });
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  if (tracking.isPending) {
    return <p>{t('tracking.edit.loading')}</p>;
  }
  if (tracking.error !== null || detail === undefined) {
    return <Alert variant="error">{t('tracking.edit.loadError')}</Alert>;
  }

  const attachable = (modules.data ?? []).filter(
    (candidate) => !detail.moduleIds.includes(candidate.id),
  );
  const propertyName = (propertyId: string): string =>
    (properties.data ?? []).find((p) => p.id === propertyId)?.name ?? propertyId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tracking.edit.title')}</CardTitle>
        <CardDescription>{t('tracking.edit.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="tracking-name" label={t('tracking.edit.name')}>
          <Input
            id="tracking-name"
            onChange={(e) => {
              setName(e.target.value);
            }}
            value={name}
          />
        </Field>
        <Field htmlFor="tracking-slug" label={t('tracking.edit.slug')}>
          <Input
            id="tracking-slug"
            onChange={(e) => {
              setSlug(e.target.value);
            }}
            value={slug}
          />
        </Field>
        <Field htmlFor="tracking-event" label={t('tracking.edit.navigationEvent')}>
          <select
            id="tracking-event"
            onChange={(e) => {
              setNavigationEventId(e.target.value);
            }}
            value={navigationEventId}
          >
            <option value="">{t('tracking.edit.eventNone')}</option>
            {(navigationEvents.data ?? []).map((navigationEvent) => (
              <option key={navigationEvent.id} value={navigationEvent.id}>
                {navigationEvent.name}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="tracking-page" label={t('tracking.edit.page')}>
          <select
            id="tracking-page"
            onChange={(e) => {
              setPageId(e.target.value);
            }}
            value={pageId}
          >
            <option value="">{t('tracking.edit.pageNone')}</option>
            {(pages.data ?? []).map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor="tracking-description" label={t('tracking.edit.description')}>
          <MarkdownEditor
            companyId={companyId}
            onChange={setDescription}
            projectId={projectId}
            value={description}
          />
        </Field>
        {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        <Button disabled={updateTracking.isPending} type="submit">
          {t('tracking.edit.save')}
        </Button>
      </form>

      <section>
        <h3>{t('tracking.edit.modules')}</h3>
        <Field htmlFor="tracking-module" label={t('tracking.edit.attachModule')}>
          <select
            id="tracking-module"
            onChange={(e) => {
              setModuleToAttach(e.target.value);
            }}
            value={moduleToAttach}
          >
            <option value="">{t('tracking.edit.moduleNone')}</option>
            {attachable.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </Field>
        <Button
          disabled={moduleToAttach === '' || applyModule.isPending}
          onClick={() => void handleAttach()}
          type="button"
        >
          {t('tracking.edit.attach')}
        </Button>
      </section>

      <section>
        <h3>{t('tracking.edit.properties')}</h3>
        {warning !== null ? <Alert variant="error">{warning}</Alert> : null}
        <ul>
          {detail.properties.map((trackingProperty) => (
            <li key={trackingProperty.id}>
              <span>{propertyName(trackingProperty.propertyId)}</span>
              <span>{t(`tracking.source.${trackingProperty.source}`)}</span>
              <Field
                htmlFor={`presence-${trackingProperty.id}`}
                label={t('tracking.edit.presence')}
              >
                <select
                  id={`presence-${trackingProperty.id}`}
                  onChange={(e) => {
                    void handlePresence(trackingProperty.propertyId, e.target.value as Presence);
                  }}
                  value={trackingProperty.presence}
                >
                  {PRESENCE_VALUES.map((presence) => (
                    <option key={presence} value={presence}>
                      {t(`tracking.presence.${presence}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                onClick={() => void handleRemoveProperty(trackingProperty.propertyId)}
                type="button"
              >
                {t('tracking.edit.removeProperty')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </Card>
  );
}

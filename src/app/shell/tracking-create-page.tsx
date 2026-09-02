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
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { apiErrorMessageKey, useTranslate } from '../i18n';
import { useCreateTracking, useNavigationEvents, usePages } from '../queries';

/**
 * Create a tracking inside a project (REQ-DOM-002).
 *
 * Name, slug and the navigation event that fires it are asked here; the page
 * attachment is optional and preselected when arriving from a page's tracking
 * recap via `?pageId=`. Description and modules are filled in afterwards in
 * the tracking editor, matching how a page is created before its description
 * is written.
 */
export function TrackingCreatePage(): ReactElement {
  const t = useTranslate();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const pages = usePages(projectId);
  const navigationEvents = useNavigationEvents(projectId);
  const createTracking = useCreateTracking(projectId ?? '');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [navigationEventId, setNavigationEventId] = useState('');
  // Seeded once from the URL: a recap-area link opens this screen with the
  // page already chosen, and the editor can still change or clear it here.
  const [searchParams] = useSearchParams();
  const [pageId, setPageId] = useState(searchParams.get('pageId') ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (name.trim() === '') {
      setError(t('tracking.create.missingName'));
      return;
    }
    if (slug.trim() === '') {
      setError(t('tracking.create.missingSlug'));
      return;
    }
    if (navigationEventId === '') {
      setError(t('tracking.create.missingEvent'));
      return;
    }

    try {
      const { id } = await createTracking.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        navigationEventId,
        // An omitted pageId means "not attached"; the API treats the absent
        // key and an empty string differently, so only a real id is sent.
        ...(pageId === '' ? {} : { pageId }),
      });
      void navigate(`/projects/${projectId ?? ''}/trackings/${id}`);
    } catch (cause) {
      setError(t(apiErrorMessageKey(cause)));
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{t('tracking.create.title')}</CardTitle>
        <CardDescription>{t('tracking.create.subtitle')}</CardDescription>
      </CardHeader>

      <form onSubmit={(event) => void handleSubmit(event)}>
        <Field htmlFor="tracking-create-name" label={t('tracking.create.nameLabel')}>
          <Input
            id="tracking-create-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
        </Field>

        <Field htmlFor="tracking-create-slug" label={t('tracking.create.slugLabel')}>
          <Input
            id="tracking-create-slug"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
            value={slug}
          />
        </Field>

        <Field htmlFor="tracking-create-event" label={t('tracking.create.navigationEventLabel')}>
          <select
            id="tracking-create-event"
            onChange={(event) => {
              setNavigationEventId(event.target.value);
            }}
            value={navigationEventId}
          >
            <option value="">{t('tracking.create.eventNone')}</option>
            {(navigationEvents.data ?? []).map((navigationEvent) => (
              <option key={navigationEvent.id} value={navigationEvent.id}>
                {navigationEvent.name}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="tracking-create-page" label={t('tracking.create.pageLabel')}>
          <select
            id="tracking-create-page"
            onChange={(event) => {
              setPageId(event.target.value);
            }}
            value={pageId}
          >
            <option value="">{t('tracking.create.pageNone')}</option>
            {(pages.data ?? []).map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </Field>

        {error !== null ? <Alert variant="error">{error}</Alert> : null}

        <Button disabled={createTracking.isPending} type="submit">
          {createTracking.isPending ? t('tracking.create.submitting') : t('tracking.create.submit')}
        </Button>
      </form>
    </Card>
  );
}
